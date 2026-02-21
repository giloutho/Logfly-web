<template>
    <v-snackbar v-model="snackbar" :timeout="5000" color="success" location="top">
        {{ snackbarMessage }}
        <template v-slot:actions>
            <v-btn variant="text" @click="snackbar = false">
                <v-icon>mdi-close</v-icon>
            </v-btn>
        </template>
    </v-snackbar>

    <div class="equip-container">
        <!-- Section 1: Presentation -->
        <div class="presentation-section">
            <v-card class="presentation-card" elevation="2">
                <v-card-text class="d-flex align-center flex-wrap gap-3">
                    <v-chip color="primary" label class="mr-2">
                        <v-icon start>mdi-parachute</v-icon>
                        {{ $gettext('Equipment') }}
                    </v-chip>
                    <span class="info-text">{{ contentStatusMessage }}</span>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" @click="onAddNew">
                        <v-icon start>mdi-plus</v-icon>
                        {{ $gettext('Add') }}
                    </v-btn>
                    <v-text-field v-model="search" :label="$gettext('Search')" prepend-inner-icon="mdi-magnify"
                        single-line hide-details clearable density="compact" variant="outlined"
                        class="search-field"></v-text-field>
                </v-card-text>
            </v-card>
        </div>

        <!-- Section 2: Table (only if records exist) -->
        <div v-if="equipRecords.length > 0" class="table-section">
            <v-data-table :headers="headers" :items="filteredRecords" :search="search" item-value="M_ID"
                density="compact" class="equip-table" v-model:page="page" v-model:items-per-page="itemsPerPage">
                <template v-slot:headers="{ columns }">
                    <tr>
                        <th v-for="column in columns" :key="column.key" class="table-header">
                            {{ column.title }}
                        </th>
                    </tr>
                </template>
                <template v-slot:item="{ item }">
                    <tr>
                        <td class="col-date">{{ formatDate(item.M_Date) }}</td>
                        <td class="col-engin">{{ item.M_Engin }}</td>
                        <td class="col-event">{{ item.M_Event }}</td>
                        <td class="col-comment">{{ item.M_Comment }}</td>
                        <td class="col-action">
                            <v-btn icon size="small" variant="text" color="warning" @click="onEditRecord(item)">
                                <v-icon>mdi-pencil</v-icon>
                            </v-btn>
                        </td>
                        <td class="col-action">
                            <v-btn icon size="small" variant="text" color="error" @click="onDeleteRecord(item)">
                                <v-icon>mdi-delete</v-icon>
                            </v-btn>
                        </td>
                    </tr>
                </template>
                <template v-slot:bottom>
                    <div class="custom-pagination">
                        <v-btn icon variant="text" size="small" @click="page = 1" :disabled="page <= 1">
                            <v-icon>mdi-chevron-double-left</v-icon>
                        </v-btn>
                        <v-btn icon variant="text" size="small" @click="page = Math.max(1, page - 1)"
                            :disabled="page <= 1">
                            <v-icon>mdi-chevron-left</v-icon>
                        </v-btn>
                        <span class="mx-2 text-caption">Page {{ page }} / {{ pageCount }}</span>
                        <v-btn icon variant="text" size="small" @click="page = Math.min(pageCount, page + 1)"
                            :disabled="page >= pageCount">
                            <v-icon>mdi-chevron-right</v-icon>
                        </v-btn>
                        <v-btn icon variant="text" size="small" @click="page = pageCount" :disabled="page >= pageCount">
                            <v-icon>mdi-chevron-double-right</v-icon>
                        </v-btn>
                    </div>
                </template>
            </v-data-table>
        </div>

        <!-- Section 3: Input Form (shown only when adding/editing) -->
        <div v-if="showInputForm" class="input-section">
            <v-card class="input-card" elevation="3">
                <v-card-title class="bg-primary text-white">
                    <v-icon class="mr-2">mdi-clipboard-edit-outline</v-icon>
                    {{ isEditing ? $gettext('Edit record') : $gettext('New record') }}
                </v-card-title>
                <v-card-text>
                    <!-- Row 1: Date, Equipment, Glider/Other buttons -->
                    <v-row class="mt-2" align="center">
                        <v-col cols="2">
                            <v-text-field v-model="form.date" :label="$gettext('Date')" type="date" density="compact"
                                variant="outlined" hide-details></v-text-field>
                        </v-col>
                        <v-col cols="3">
                            <v-text-field v-model="form.engin" :label="$gettext('Equipment')" density="compact"
                                variant="outlined" hide-details readonly
                                :placeholder="$gettext('Click on Glider button or Other button')"
                                class="uppercase-input"></v-text-field>
                        </v-col>
                        <v-col cols="auto">
                            <v-btn color="primary" @click="onGliderChoice"
                                :disabled="showGliderSelect || showOtherInput">
                                {{ $gettext('Glider') }}
                            </v-btn>
                        </v-col>
                        <v-col cols="auto">
                            <v-btn color="info" @click="onOtherChoice" :disabled="showGliderSelect || showOtherInput">
                                {{ $gettext('Other') }}
                            </v-btn>
                        </v-col>
                        <!-- Glider Select (conditional) -->
                        <v-col v-if="showGliderSelect" cols="3">
                            <v-select v-model="selectedGlider" :items="gliderList" :label="$gettext('Select a glider')"
                                density="compact" variant="outlined" hide-details
                                @update:model-value="onGliderSelected"></v-select>
                        </v-col>
                        <!-- Other Input (conditional) -->
                        <v-col v-if="showOtherInput" cols="3">
                            <v-text-field v-model="otherInput" :label="$gettext('Enter equipment')" density="compact"
                                variant="outlined" hide-details class="uppercase-input"
                                @input="onOtherInput"></v-text-field>
                        </v-col>
                        <!-- Clear button (conditional) -->
                        <v-col v-if="showGliderSelect || showOtherInput" cols="auto">
                            <v-btn color="secondary" @click="onClearChoice">
                                {{ $gettext('Clear') }}
                            </v-btn>
                        </v-col>
                    </v-row>

                    <!-- Row 2: Operation, Price, Comment -->
                    <v-row class="mt-3" align="center">
                        <v-col cols="2">
                            <v-text-field v-model="form.event" :label="$gettext('Operation')" density="compact"
                                variant="outlined" hide-details class="uppercase-input"></v-text-field>
                        </v-col>
                        <v-col cols="2">
                            <v-text-field v-model="form.price" :label="$gettext('Price')" density="compact"
                                variant="outlined" hide-details type="number"></v-text-field>
                        </v-col>
                        <v-col cols="8">
                            <v-textarea v-model="form.comment" :label="$gettext('Comment')" density="compact"
                                variant="outlined" hide-details rows="2"></v-textarea>
                        </v-col>
                    </v-row>

                    <!-- Row 3: Action buttons -->
                    <v-row class="mt-4" justify="end">
                        <v-col cols="auto">
                            <v-btn color="error" @click="onCancel">
                                {{ $gettext('Cancel') }}
                            </v-btn>
                        </v-col>
                        <v-col cols="auto">
                            <v-btn color="success" @click="onValidate">
                                {{ $gettext('OK') }}
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useGettext } from "vue3-gettext";
import { useDatabaseStore } from '@/stores/database';

const databaseStore = useDatabaseStore();
const { $gettext } = useGettext();

// Emits
const emit = defineEmits(['dbUpdated']);

// State
const equipRecords = ref([]);
const search = ref('');
const page = ref(1);
const itemsPerPage = ref(10);
const snackbar = ref(false);
const snackbarMessage = ref('');

// Form state
const showInputForm = ref(false);
const isEditing = ref(false);
const showGliderSelect = ref(false);
const showOtherInput = ref(false);
const selectedGlider = ref(null);
const otherInput = ref('');
const gliderList = ref([]);

const form = reactive({
    id: -1,
    date: '',
    engin: '',
    event: '',
    price: '',
    comment: ''
});

// Computed
const contentStatusMessage = computed(() => {
    // very strange problem with gettext:extract
    const msg1 = $gettext('You can record all operations') + ' : ';
    const msg2 = $gettext('purchase')
    const msg3 = $gettext('sale')
    const msg4 = $gettext('overhaul')
    const msg5 = $gettext('emergency folding')
    const msg6 = $gettext('chocking')
    const msg7 = $gettext('etc')
    const msg = msg1 + msg2 + ', ' + msg3 + ', ' + msg4 + ', ' + msg5 + ', ' + msg6 + ', ' + msg7 + '...';
    return msg;
});

const headers = computed(() => [
    { title: $gettext('Date'), key: 'M_Date', sortable: true, width: '15%' },
    { title: $gettext('Equipment'), key: 'M_Engin', sortable: true, width: '20%' },
    { title: $gettext('Operation'), key: 'M_Event', sortable: true, width: '20%' },
    { title: $gettext('Comment'), key: 'M_Comment', sortable: false, width: '35%' },
    { title: '', key: 'edit', sortable: false, width: '5%' },
    { title: '', key: 'delete', sortable: false, width: '5%' }
]);

const filteredRecords = computed(() => {
    if (!search.value) return equipRecords.value;
    const searchLower = search.value.toLowerCase();
    return equipRecords.value.filter(rec => {
        return (rec.M_Engin && rec.M_Engin.toLowerCase().includes(searchLower)) ||
            (rec.M_Event && rec.M_Event.toLowerCase().includes(searchLower)) ||
            (rec.M_Comment && rec.M_Comment.toLowerCase().includes(searchLower));
    });
});

const pageCount = computed(() => {
    return Math.max(1, Math.ceil(filteredRecords.value.length / itemsPerPage.value));
});

// Lifecycle
onMounted(() => {
    if (databaseStore.hasOpenDatabase) {
        checkEquipTable();
        loadEquipRecords();
        loadGliderList();
    }
});

// Watch for database changes
watch(() => databaseStore.hasOpenDatabase, (hasDb) => {
    if (hasDb) {
        checkEquipTable();
        loadEquipRecords();
        loadGliderList();
    }
});

/**
 * Check if Equip table exists, create if not
 */
function checkEquipTable() {
    if (!databaseStore.hasOpenDatabase) return;

    const checkSQL = `SELECT name FROM sqlite_master WHERE type='table' AND name='Equip'`;
    const result = databaseStore.query(checkSQL);

    if (!result.success || !result.data || !result.data[0] || result.data[0].values.length === 0) {
        // Create the table
        const createSQL = `CREATE TABLE IF NOT EXISTS Equip (
      M_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      M_Date TEXT,
      M_Engin TEXT,
      M_Event TEXT,
      M_Price TEXT,
      M_Comment TEXT
    )`;
        databaseStore.update(createSQL);
    }
}

/**
 * Load all equipment records from database
 */
function loadEquipRecords() {
    if (!databaseStore.hasOpenDatabase) return;

    const reqSQL = `SELECT M_ID, M_Date, M_Engin, M_Event, M_Comment, M_Price FROM Equip ORDER BY M_Date DESC`;
    const result = databaseStore.query(reqSQL);

    if (result.success && result.data && result.data[0]) {
        const columns = result.data[0].columns;
        const values = result.data[0].values;
        equipRecords.value = values.map(row => {
            const obj = {};
            columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj;
        });
    } else {
        equipRecords.value = [];
    }
}

/**
 * Load glider list from Vol table
 */
function loadGliderList() {
    if (!databaseStore.hasOpenDatabase) return;

    const reqSQL = `SELECT V_Engin, strftime('%Y-%m', V_Date) AS LastFlown FROM Vol GROUP BY upper(V_Engin) ORDER BY strftime('%Y-%m', V_Date) DESC`;
    const result = databaseStore.query(reqSQL);

    if (result.success && result.data && result.data[0]) {
        const values = result.data[0].values;
        gliderList.value = values
            .filter(row => row[0] && row[0].trim() !== '')
            .map(row => row[0]);
    } else {
        gliderList.value = [];
    }
}

/**
 * Get glider total hours and flights
 */
function getGliderStats(gliderName) {
    if (!databaseStore.hasOpenDatabase) return { flights: 0, hours: 0, min: 0 };

    const reqSQL = `SELECT Sum(V_Duree) AS seconds, Count(V_ID) as flights FROM Vol WHERE V_Engin = '${gliderName}'`;
    const result = databaseStore.query(reqSQL);

    if (result.success && result.data && result.data[0] && result.data[0].values.length > 0) {
        const row = result.data[0].values[0];
        const seconds = row[0] || 0;
        const flights = row[1] || 0;

        if (seconds > 0) {
            const nbHours = Math.floor(seconds / 3600);
            const nbMin = String(Math.floor((seconds - (nbHours * 3600)) / 60)).padStart(2, '0');
            return { flights, hours: nbHours, min: nbMin };
        }
    }

    return { flights: 0, hours: 0, min: '00' };
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    } catch {
        return dateStr;
    }
}

/**
 * Reset form
 */
function resetForm() {
    form.id = -1;
    form.date = '';
    form.engin = '';
    form.event = '';
    form.price = '';
    form.comment = '';
    selectedGlider.value = null;
    otherInput.value = '';
    showGliderSelect.value = false;
    showOtherInput.value = false;
}

// ---- Event Handlers ----

function onAddNew() {
    resetForm();
    isEditing.value = false;
    showInputForm.value = true;
}

function onEditRecord(record) {
    resetForm();
    isEditing.value = true;
    form.id = record.M_ID;
    // Extract date from datetime
    if (record.M_Date) {
        const datePart = record.M_Date.split(' ')[0];
        form.date = datePart;
    }
    form.engin = record.M_Engin || '';
    form.event = record.M_Event || '';
    form.price = record.M_Price || '';
    form.comment = record.M_Comment || '';
    showInputForm.value = true;
}

function onDeleteRecord(record) {
    if (confirm($gettext('Are you sure you want to delete this record?'))) {
        const reqSQL = `DELETE FROM Equip WHERE M_ID = ${record.M_ID}`;
        const result = databaseStore.update(reqSQL);

        if (result.success) {
            snackbarMessage.value = $gettext('Record deleted');
            snackbar.value = true;
            loadEquipRecords();
            emit('dbUpdated');
        } else {
            snackbarMessage.value = $gettext('Error deleting record');
            snackbar.value = true;
        }
    }
}

function onGliderChoice() {
    showGliderSelect.value = true;
    showOtherInput.value = false;
}

function onOtherChoice() {
    showOtherInput.value = true;
    showGliderSelect.value = false;
    otherInput.value = form.engin;
}

function onClearChoice() {
    showGliderSelect.value = false;
    showOtherInput.value = false;
    selectedGlider.value = null;
    otherInput.value = '';
    form.engin = '';
}

function onGliderSelected(gliderName) {
    if (gliderName) {
        form.engin = gliderName;

        // Add glider stats to comment
        const stats = getGliderStats(gliderName);
        const statsMsg = `${gliderName} -> ${stats.flights} ${$gettext('flights')} ${$gettext('registered')} ${$gettext('for')} ${stats.hours}h${stats.min}mn`;

        if (form.comment) {
            form.comment += ' ' + statsMsg;
        } else {
            form.comment = statsMsg;
        }

        // Hide selection UI but keep form.engin
        showGliderSelect.value = false;
        selectedGlider.value = null;
    }
}

function onOtherInput() {
    form.engin = otherInput.value.toUpperCase();
}

function onCancel() {
    showInputForm.value = false;
    resetForm();
}

function onValidate() {
    // Validation
    if (!form.date) {
        snackbarMessage.value = $gettext('Date is required');
        snackbar.value = true;
        return;
    }
    if (!form.engin) {
        snackbarMessage.value = $gettext('Equipment is required');
        snackbar.value = true;
        return;
    }
    if (!form.event) {
        snackbarMessage.value = $gettext('Operation is required');
        snackbar.value = true;
        return;
    }

    const sqlDate = form.date + ' 00:00:00';
    const engin = form.engin.toUpperCase();
    const event = form.event.toUpperCase();
    const price = form.price || '';
    const comment = form.comment || '';

    let result;
    if (form.id > 0) {
        // Update
        const reqSQL = `UPDATE Equip SET M_Date='${sqlDate}', M_Engin='${engin}', M_Event='${event}', M_Price='${price}', M_Comment='${comment}' WHERE M_ID = ${form.id}`;
        result = databaseStore.update(reqSQL);
    } else {
        // Insert
        const reqSQL = `INSERT INTO Equip (M_Date, M_Engin, M_Event, M_Price, M_Comment) VALUES ('${sqlDate}', '${engin}', '${event}', '${price}', '${comment}')`;
        result = databaseStore.update(reqSQL);
    }

    if (result.success) {
        snackbarMessage.value = form.id > 0 ? $gettext('Record updated') : $gettext('Record created');
        snackbar.value = true;
        showInputForm.value = false;
        resetForm();
        loadEquipRecords();
        emit('dbUpdated');
    } else {
        snackbarMessage.value = $gettext('Error saving record');
        snackbar.value = true;
    }
}
</script>

<style scoped>
.equip-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    height: calc(100vh - 160px);
}

.presentation-section {
    flex-shrink: 0;
}

.presentation-card {
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
}

.info-text {
    color: #555;
    font-size: 0.9rem;
}

.search-field {
    max-width: 250px;
}

.table-section {
    flex: 1;
    overflow: auto;
    background: #fff;
    border-radius: 8px;
    border: 1px solid #ddd;
}

.equip-table {
    width: 100%;
}

.table-header {
    font-weight: 700 !important;
    font-size: 1em;
    background-color: #f5f5f5;
}

.equip-table tr {
    font-size: 0.9em;
}

.col-date {
    width: 15%;
}

.col-engin {
    width: 20%;
}

.col-event {
    width: 20%;
}

.col-comment {
    width: 35%;
}

.col-action {
    width: 5%;
    text-align: center;
}

.custom-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.input-section {
    flex-shrink: 0;
}

.input-card {
    border-radius: 8px;
}

.uppercase-input :deep(input) {
    text-transform: uppercase;
}

.gap-3 {
    gap: 12px;
}
</style>
