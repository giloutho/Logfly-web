<template>
    <v-dialog v-model="show" max-width="650" persistent>
        <v-card class="notrack-dialog">
            <!-- Line 1: Title -->
            <v-card-title class="headline d-flex align-center">
                <v-icon class="mr-2" color="warning">mdi-airplane-off</v-icon>
                {{ $gettext('Flight without GPS track') }}
            </v-card-title>

            <v-card-text>
                <!-- Line 2: Date and Take-off time -->
                <v-row dense class="mb-3">
                    <v-col cols="6">
                        <div class="field-label">{{ $gettext('Date') }}</div>
                        <v-text-field v-model="form.date" type="date" variant="outlined" density="compact" hide-details
                            :max="todayDate" />
                    </v-col>
                    <v-col cols="6">
                        <div class="field-label">{{ $gettext('Take-off time') }}</div>
                        <v-text-field v-model="form.time" type="time" variant="outlined" density="compact"
                            hide-details />
                    </v-col>
                </v-row>

                <!-- Line 3: Duration with hours and minutes inputs -->
                <v-row dense class="mb-3">
                    <v-col cols="6">
                        <div class="field-label">{{ $gettext('Duration') }}</div>
                        <div class="duration-inputs">
                            <v-text-field v-model.number="form.durationHours" type="number" variant="outlined"
                                density="compact" hide-details min="0" max="12" suffix="h" class="duration-field" />
                            <v-text-field v-model.number="form.durationMinutes" type="number" variant="outlined"
                                density="compact" hide-details min="0" max="59" suffix="mn" class="duration-field" />
                        </div>
                    </v-col>
                </v-row>

                <!-- Line 4: Glider with button -->
                <v-row dense class="mb-3 align-center">
                    <v-col cols="8">
                        <div class="field-label">{{ $gettext('Glider') }}</div>
                        <v-text-field v-model="form.gliderDisplay" variant="outlined" density="compact" hide-details
                            readonly :placeholder="$gettext('No glider selected')"
                            :class="{ 'text-grey': !form.gliderDisplay }" />
                    </v-col>
                    <v-col cols="4" class="d-flex align-end">
                        <v-btn color="primary" variant="flat" size="small" @click="showGliderDialog = true">
                            {{ $gettext('Define a glider') }}
                        </v-btn>
                    </v-col>
                </v-row>

                <!-- Line 5: Take-off site with button -->
                <v-row dense class="mb-3 align-center">
                    <v-col cols="8">
                        <div class="field-label">{{ $gettext('Take off') }}</div>
                        <v-text-field v-model="siteDisplay" variant="outlined" density="compact" hide-details readonly
                            :placeholder="$gettext('No site selected')" :class="{ 'text-grey': !siteDisplay }" />
                    </v-col>
                    <v-col cols="4" class="d-flex align-end">
                        <v-btn color="primary" variant="flat" size="small" @click="showChooseSiteDialog = true">
                            {{ $gettext('Take off') }}
                        </v-btn>
                    </v-col>
                </v-row>

                <!-- Line 6: Comment -->
                <v-row dense class="mb-3">
                    <v-col cols="12">
                        <div class="field-label">{{ $gettext('Comment') }}</div>
                        <v-textarea v-model="form.comment" variant="outlined" density="compact" hide-details rows="3"
                            auto-grow />
                    </v-col>
                </v-row>

                <!-- Status message -->
                <v-alert v-if="statusMessage" :type="statusType" variant="tonal" density="compact" class="mb-2">
                    {{ statusMessage }}
                </v-alert>

            </v-card-text>

            <!-- Line 7-8: Buttons -->
            <v-card-actions class="justify-end pa-4">
                <v-btn color="error" variant="flat" @click="onCancel">
                    {{ $gettext('Cancel') }}
                </v-btn>
                <v-btn color="success" variant="flat" @click="onOk" :loading="isSaving">
                    {{ $gettext('OK') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- GliderDialog with custom title -->
    <GliderDialog v-model="showGliderDialog" :gliderList="gliderList" :currentGlider="form.gliderDisplay"
        :dialogTitle="$gettext('Define the used glider')" @save="onGliderSelected" />

    <!-- ChooseSiteDialog -->
    <ChooseSiteDialog v-model="showChooseSiteDialog" :siteList="siteList" @save="onSiteSelected"
        @site-created="onSiteCreated" />
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted } from 'vue';
import { useGettext } from 'vue3-gettext';
import { useDatabaseStore } from '@/stores/database';
import GliderDialog from '@/components/GliderDialog.vue';
import ChooseSiteDialog from '@/components/ChooseSiteDialog.vue';

const { $gettext } = useGettext();
const databaseStore = useDatabaseStore();

const props = defineProps({
    modelValue: Boolean,
    // Flight data for editing mode (null for new flight)
    flightData: {
        type: Object,
        default: null
    },
    // Mode: 'new', 'edit', or 'duplicate'
    mode: {
        type: String,
        default: 'new'
    }
});

const emit = defineEmits(['update:modelValue', 'saved', 'site-created']);

const show = ref(props.modelValue);
const showGliderDialog = ref(false);
const showChooseSiteDialog = ref(false);
const gliderList = ref([]);
const siteList = ref([]);
const isSaving = ref(false);
const statusMessage = ref('');
const statusType = ref('info');
const lastSavedDateTime = ref('');

// Store original date/time for duplicate mode validation
const originalDate = ref('');
const originalTime = ref('');

// Today's date for max date constraint
const todayDate = computed(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
});

// Form data
const form = reactive({
    id: 0,
    date: todayDate.value,
    time: '12:00',
    durationHours: 1,
    durationMinutes: 0,
    gliderDisplay: '',
    comment: ''
});

// Selected site data
const selectedSite = ref(null);

// Computed display for site
const siteDisplay = computed(() => {
    if (!selectedSite.value) return '';
    const parts = [selectedSite.value.S_Nom];
    if (selectedSite.value.S_Pays) parts.push(selectedSite.value.S_Pays);
    if (selectedSite.value.S_Alti) parts.push(selectedSite.value.S_Alti + 'm');
    return parts.join(' ');
});

// Sync dialog visibility
watch(() => props.modelValue, val => {
    show.value = val;
    if (val) {
        initForm();
        loadGliders();
        loadSites();
    }
});
watch(show, val => emit('update:modelValue', val));

// Initialize form based on mode
function initForm() {
    statusMessage.value = '';
    lastSavedDateTime.value = '';
    originalDate.value = '';
    originalTime.value = '';

    if ((props.mode === 'edit' || props.mode === 'duplicate') && props.flightData) {
        // Edit or Duplicate existing flight
        form.id = props.mode === 'edit' ? props.flightData.id : 0; // 0 for duplicate (new record)
        form.date = props.flightData.date;
        form.time = props.flightData.time;

        // Parse duration from HH:MM format
        if (props.flightData.duration) {
            const parts = props.flightData.duration.split(':');
            form.durationHours = parseInt(parts[0]) || 1;
            form.durationMinutes = parseInt(parts[1]) || 0;
        } else {
            form.durationHours = 1;
            form.durationMinutes = 0;
        }

        form.gliderDisplay = props.flightData.glider || '';
        form.comment = props.flightData.comment || '';

        // Store original date/time for duplicate mode validation
        if (props.mode === 'duplicate') {
            originalDate.value = props.flightData.date;
            originalTime.value = props.flightData.time;
        }

        // Load site from flight data
        if (props.flightData.siteName) {
            selectedSite.value = {
                S_ID: props.flightData.siteId || 0,
                S_Nom: props.flightData.siteName,
                S_Pays: props.flightData.sitePays || '',
                S_Alti: props.flightData.siteAlti || 0,
                S_Latitude: props.flightData.siteLat || 0,
                S_Longitude: props.flightData.siteLong || 0
            };
        } else {
            selectedSite.value = null;
        }
    } else {
        // New flight
        form.id = 0;
        form.date = todayDate.value;
        form.time = '12:00';
        form.durationHours = 1;
        form.durationMinutes = 0;
        form.gliderDisplay = '';
        form.comment = '';
        selectedSite.value = null;
    }
}

// Load gliders from database
function loadGliders() {
    if (!databaseStore.hasOpenDatabase) return;

    const reqSQL = `SELECT V_Engin, strftime('%Y-%m',V_date) FROM Vol GROUP BY upper(V_Engin) ORDER BY strftime('%Y-%m',V_date) DESC`;
    const result = databaseStore.query(reqSQL);

    if (result.success && result.data && result.data[0]) {
        gliderList.value = result.data[0].values
            .filter(row => row[0] && row[0].trim() !== '')
            .map(row => row[0]);
    }
}

// Load sites from database (Take off sites only)
function loadSites() {
    if (!databaseStore.hasOpenDatabase) return;

    const reqSQL = `SELECT S_ID, S_Nom, S_Localite, S_Pays, S_Alti, S_Latitude, S_Longitude FROM Site WHERE S_Type = 'D' ORDER BY S_Nom`;
    const result = databaseStore.query(reqSQL);

    if (result.success && result.data && result.data[0]) {
        siteList.value = result.data[0].values.map(row => ({
            S_ID: row[0],
            S_Nom: row[1],
            S_Localite: row[2],
            S_Pays: row[3],
            S_Alti: row[4],
            S_Latitude: row[5],
            S_Longitude: row[6]
        }));
    }
}

// Handle glider selection from GliderDialog
function onGliderSelected(glider) {
    form.gliderDisplay = glider;
}

// Handle site selection from ChooseSiteDialog
function onSiteSelected(site) {
    selectedSite.value = site;
}

// Handle site creation from ChooseSiteDialog
function onSiteCreated(siteData) {
    // Insert site into database
    const updateDate = new Date();
    const sqlDate = updateDate.getFullYear() + '-' +
        String((updateDate.getMonth() + 1)).padStart(2, '0') + '-' +
        String(updateDate.getDate()).padStart(2, '0');

    const sqltable = 'Site';
    const sqlparams = {
        S_Nom: siteData.nom,
        S_Localite: siteData.localite,
        S_CP: siteData.cp,
        S_Pays: siteData.pays,
        S_Type: siteData.typeSite,
        S_Orientation: siteData.orient,
        S_Alti: siteData.alti || 0,
        S_Latitude: siteData.lat,
        S_Longitude: siteData.long,
        S_Commentaire: siteData.comment || '',
        S_Maj: sqlDate
    };

    const insertResult = databaseStore.insert(sqltable, sqlparams);

    if (insertResult.success) {
        // Get the new site ID
        const newId = insertResult.lastInsertRowId || 0;

        // Update selectedSite with the new ID
        selectedSite.value = {
            S_ID: newId,
            S_Nom: siteData.nom,
            S_Localite: siteData.localite,
            S_Pays: siteData.pays,
            S_Alti: siteData.alti,
            S_Latitude: siteData.lat,
            S_Longitude: siteData.long
        };

        // Reload sites list
        loadSites();

        // Emit event to parent
        emit('site-created', { ...siteData, id: newId });
    } else {
        statusMessage.value = $gettext('Error creating site');
        statusType.value = 'error';
    }
}

// Validate form fields
function validateForm() {
    if (!form.gliderDisplay || form.gliderDisplay.trim() === '') {
        statusMessage.value = $gettext('No glider selected');
        statusType.value = 'warning';
        return false;
    }

    if (!selectedSite.value || !selectedSite.value.S_Nom) {
        statusMessage.value = $gettext('No site selected');
        statusType.value = 'warning';
        return false;
    }

    // For duplicate mode, validate that date and/or time has been changed
    if (props.mode === 'duplicate') {
        if (form.date === originalDate.value && form.time === originalTime.value) {
            statusMessage.value = $gettext('You must change the date and/or time to create a duplicate');
            statusType.value = 'warning';
            return false;
        }
    }

    return true;
}

// Check if flight already exists
function checkDuplicate() {
    const sqlDateTime = form.date + ' ' + form.time + ':00';

    if (sqlDateTime === lastSavedDateTime.value) {
        statusMessage.value = $gettext('A flight at the same date and time was recorded');
        statusType.value = 'warning';
        return true;
    }

    // Check in database
    const checkSQL = `SELECT V_ID FROM Vol WHERE V_Date = '${sqlDateTime}'`;
    const result = databaseStore.query(checkSQL);

    if (result.success && result.data && result.data[0] && result.data[0].values.length > 0) {
        // If editing, exclude current flight from check
        if (props.mode === 'edit' && form.id > 0) {
            const existingId = result.data[0].values[0][0];
            if (existingId !== form.id) {
                statusMessage.value = $gettext('A flight at the same date and time already exists');
                statusType.value = 'warning';
                return true;
            }
        } else {
            statusMessage.value = $gettext('A flight at the same date and time already exists');
            statusType.value = 'warning';
            return true;
        }
    }

    return false;
}

// Calculate duration in seconds and formatted string
function parseDuration() {
    const hours = Math.min(12, Math.max(0, form.durationHours || 0));
    const minutes = Math.min(59, Math.max(0, form.durationMinutes || 0));
    const totalSeconds = hours * 3600 + minutes * 60;
    const strDuree = `${hours}h${String(minutes).padStart(2, '0')}mn`;
    return { seconds: totalSeconds, formatted: strDuree };
}

// Save flight to database
async function saveToDatabase() {
    const sqlDateTime = form.date + ' ' + form.time + ':00';
    const duration = parseDuration();

    // In duplicate mode, always perform INSERT (form.id is 0)
    if (props.mode === 'edit' && form.id > 0) {
        // Update existing flight
        const updateSQL = `UPDATE Vol SET V_Date='${sqlDateTime}', V_Duree=${duration.seconds}, V_sDuree='${duration.formatted}', V_LatDeco=${selectedSite.value.S_Latitude}, V_LongDeco=${selectedSite.value.S_Longitude}, V_AltDeco=${selectedSite.value.S_Alti || 0}, V_Site='${selectedSite.value.S_Nom}', V_Pays='${selectedSite.value.S_Pays || ''}', V_Engin='${form.gliderDisplay}', V_Commentaire='${form.comment.replace(/'/g, "''")}' WHERE V_ID = ${form.id}`;

        const result = databaseStore.update(updateSQL);

        if (result.success) {
            lastSavedDateTime.value = sqlDateTime;
            statusMessage.value = $gettext('Flight') + ' : ' + form.date + ' ' + form.time + ' ' + $gettext('saved');
            statusType.value = 'success';

            emit('saved', {
                id: form.id,
                mode: 'edit',
                date: form.date,
                time: form.time,
                duration: duration.formatted,
                glider: form.gliderDisplay,
                site: selectedSite.value.S_Nom
            });

            return true;
        } else {
            statusMessage.value = $gettext('Inserting in the flights file failed');
            statusType.value = 'error';
            return false;
        }
    } else {
        // Insert new flight
        const sqltable = 'Vol';
        const sqlparams = {
            V_Date: sqlDateTime,
            V_Duree: duration.seconds,
            V_sDuree: duration.formatted,
            V_LatDeco: selectedSite.value.S_Latitude,
            V_LongDeco: selectedSite.value.S_Longitude,
            V_AltDeco: selectedSite.value.S_Alti || 0,
            V_Site: selectedSite.value.S_Nom,
            V_Pays: selectedSite.value.S_Pays || '',
            V_IGC: null,
            UTC: 0,
            V_Engin: form.gliderDisplay,
            V_Commentaire: form.comment
        };

        const result = databaseStore.insert(sqltable, sqlparams);

        if (result.success) {
            lastSavedDateTime.value = sqlDateTime;
            statusMessage.value = $gettext('Flight') + ' : ' + form.date + ' ' + form.time + ' ' + $gettext('saved');
            statusType.value = 'success';

            emit('saved', {
                id: result.lastInsertRowId,
                mode: 'new',
                date: form.date,
                time: form.time,
                duration: duration.formatted,
                glider: form.gliderDisplay,
                site: selectedSite.value.S_Nom
            });

            return true;
        } else {
            statusMessage.value = $gettext('Inserting in the flights file failed');
            statusType.value = 'error';
            return false;
        }
    }
}

// Handle OK button
async function onOk() {
    if (!validateForm()) return;
    if (checkDuplicate()) return;

    isSaving.value = true;
    const success = await saveToDatabase();
    isSaving.value = false;

    // Close dialog on successful save
    if (success) {
        show.value = false;
    }
}

// Handle Cancel
function onCancel() {
    show.value = false;
}
</script>

<style scoped>
.notrack-dialog {
    border-radius: 12px;
}

.headline {
    background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
    color: white;
}

.field-label {
    font-size: 0.85em;
    font-weight: 600;
    color: #555;
    margin-bottom: 4px;
}

.text-grey {
    color: #999 !important;
}

.text-grey :deep(input) {
    color: #999 !important;
}

.duration-inputs {
    display: flex;
    gap: 8px;
}

.duration-field {
    flex: 1;
    max-width: 100px;
}

.duration-field :deep(input) {
    text-align: center;
}
</style>
