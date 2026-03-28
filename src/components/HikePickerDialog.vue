<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="650"
        persistent>
        <v-card>
            <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-hiking</v-icon>
                {{ $gettext('Associate a hike') }}
            </v-card-title>

            <v-card-text>
                <!-- Loading -->
                <div v-if="loading" class="d-flex justify-center pa-4">
                    <v-progress-circular indeterminate color="primary" />
                </div>

                <!-- HikeForm embedded for new hike creation -->
                <div v-else-if="showHikeFormInline">
                    <HikeForm :hike="null" @submit="onHikeFormSubmit" @cancel="showHikeFormInline = false" />
                </div>

                <!-- Normal picker -->
                <div v-else>
                    <!-- Current association info (if any) -->
                    <v-alert v-if="currentRandoId" type="success" variant="tonal" density="compact" class="mb-3">
                        <strong>{{ $gettext('Current hike') }}:</strong> {{ currentRandoNom }}
                        <span v-if="currentRandosDuree"> — {{ currentRandosDuree }}</span>
                    </v-alert>

                    <!-- Hike list -->
                    <v-radio-group v-if="hikeList.length > 0" v-model="selectedRandoId" class="hike-radio-group">
                        <v-radio v-for="hike in hikeList" :key="hike.R_ID" :value="hike.R_ID">
                            <template v-slot:label>
                                <div class="hike-label">
                                    <span class="hike-name">{{ hike.R_Nom }}</span>
                                    <span class="hike-meta text-grey ml-2">
                                        {{ hike.R_Deniv ? hike.R_Deniv + 'm' : '' }}
                                        {{ hike.R_sDuree ? '· ' + hike.R_sDuree : '' }}
                                    </span>
                                </div>
                            </template>
                        </v-radio>
                    </v-radio-group>

                    <!-- Today's duration input (only when a hike is selected from list) -->
                    <div v-if="selectedRandoId" class="duration-section mt-3">
                        <div class="field-label">{{ $gettext("Today's duration") }}</div>
                        <div class="duration-inputs">
                            <v-text-field v-model.number="todayHours" type="number" variant="outlined" density="compact"
                                hide-details min="0" max="99" suffix="h" class="duration-field" />
                            <v-text-field v-model.number="todayMinutes" type="number" variant="outlined"
                                density="compact" hide-details min="0" max="59" suffix="mn" class="duration-field" />
                        </div>
                        <div class="text-caption text-grey mt-1">
                            {{ $gettext('Reference duration') }}: {{ selectedHikeRef?.R_sDuree || '-' }}
                        </div>
                    </div>

                    <!-- New hike button -->
                    <v-btn color="secondary" variant="tonal" class="mt-3" @click="showHikeFormInline = true">
                        <v-icon start>mdi-plus</v-icon>
                        {{ $gettext('Create a new hike') }}
                    </v-btn>
                </div>
            </v-card-text>

            <v-card-actions v-if="!showHikeFormInline">
                <!-- Remove hike button (only if currently associated) -->
                <v-btn v-if="currentRandoId" color="error" variant="text" @click="onRemoveHike">
                    <v-icon start>mdi-link-off</v-icon>
                    {{ $gettext('Remove hike') }}
                </v-btn>
                <v-spacer />
                <v-btn variant="text" @click="$emit('cancel')">{{ $gettext('Cancel') }}</v-btn>
                <v-btn color="primary" variant="flat" :disabled="!selectedRandoId" @click="onConfirm">
                    {{ $gettext('OK') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGettext } from 'vue3-gettext';
import HikeForm from '@/components/HikeForm.vue';
import { useDatabaseStore } from '@/stores/database';

const { $gettext } = useGettext();
const databaseStore = useDatabaseStore();

const props = defineProps({
    modelValue: Boolean,
    flightId: { type: Number, default: null },
    // Current hike association on this flight (for edit mode)
    currentRandoId: { type: Number, default: null },
    currentRandoNom: { type: String, default: '' },
    currentRandosDuree: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue', 'saved', 'removed', 'cancel']);

const loading = ref(false);
const hikeList = ref([]);
const selectedRandoId = ref(null);
const showHikeFormInline = ref(false);
const todayHours = ref(0);
const todayMinutes = ref(0);

const selectedHikeRef = computed(() =>
    hikeList.value.find(h => h.R_ID === selectedRandoId.value) || null
);

/**
 * Load hike list and setup default selection
 */
function loadHikeList() {
    loading.value = true;
    hikeList.value = [];
    selectedRandoId.value = null;
    showHikeFormInline.value = false;
    todayHours.value = 0;
    todayMinutes.value = 0;

    const res = databaseStore.query('SELECT R_ID, R_Nom, R_Deniv, R_sDuree, R_Duree FROM Rando ORDER BY R_Nom');
    if (res.success && res.data && res.data[0] && res.data[0].values.length > 0) {
        const columns = res.data[0].columns;
        hikeList.value = res.data[0].values.map(row => {
            const obj = {};
            columns.forEach((c, i) => { obj[c] = row[i]; });
            return obj;
        });

        // If already associated, pre-select that hike
        if (props.currentRandoId) {
            selectedRandoId.value = props.currentRandoId;
            // Pre-fill today's duration from existing V_R_sDuree
            if (props.currentRandosDuree) {
                const m = props.currentRandosDuree.match(/(\d+)h(\d+)mn/);
                if (m) {
                    todayHours.value = parseInt(m[1]);
                    todayMinutes.value = parseInt(m[2]);
                }
            }
        }

        loading.value = false;
    } else {
        // Table is empty: go directly to HikeForm
        loading.value = false;
        showHikeFormInline.value = true;
    }
}

// Watch dialog open
watch(() => props.modelValue, (val) => {
    if (val) loadHikeList();
});

// When a hike is selected, pre-fill duration from the hike's reference
watch(selectedRandoId, (id) => {
    if (!id) return;
    // Only auto-fill if today's duration is still 0
    if (todayHours.value === 0 && todayMinutes.value === 0) {
        const ref = hikeList.value.find(h => h.R_ID === id);
        if (ref && ref.R_sDuree) {
            const m = ref.R_sDuree.match(/(\d+)h(\d+)mn/);
            if (m) {
                todayHours.value = parseInt(m[1]);
                todayMinutes.value = parseInt(m[2]);
            }
        }
    }
});

/**
 * Confirm selection of existing hike
 */
function onConfirm() {
    if (!selectedRandoId.value) return;
    const hike = selectedHikeRef.value;
    if (!hike) return;

    const h = Math.max(0, todayHours.value || 0);
    const mn = Math.min(59, Math.max(0, todayMinutes.value || 0));
    const duree = h * 3600 + mn * 60;
    const sDuree = `${h}h${String(mn).padStart(2, '0')}mn`;

    emit('saved', {
        randoId: hike.R_ID,
        randoNom: hike.R_Nom,
        randoDeniv: hike.R_Deniv || 0,
        sDuree,
        duree
    });
}

/**
 * A new hike was created inline via HikeForm
 */
function onHikeFormSubmit(hikeData) {
    // Insert the new hike into Rando table
    const params = {
        R_Nom: hikeData.nom,
        R_Depart: hikeData.depart,
        R_Arrivee: hikeData.arrivee,
        R_Deniv: hikeData.deniv || 0,
        R_sDuree: hikeData.sDuree,
        R_Duree: hikeData.duree || 0,
        R_Track: hikeData.track || null,
        R_Lat_Depart: hikeData.latDepart || 0,
        R_Long_Depart: hikeData.longDepart || 0,
        R_Lat_Fin: hikeData.latFin || 0,
        R_Long_Fin: hikeData.longFin || 0,
        R_Commentaire: ''
    };
    const result = databaseStore.insert('Rando', params);
    if (result.success) {
        // Get the new ID
        const newId = result.lastInsertRowid
            || databaseStore.query('SELECT MAX(R_ID) FROM Rando').data?.[0]?.values?.[0]?.[0]
            || null;

        emit('saved', {
            randoId: newId,
            randoNom: hikeData.nom,
            randoDeniv: hikeData.deniv || 0,
            sDuree: hikeData.sDuree,
            duree: hikeData.duree || 0
        });
    }
    showHikeFormInline.value = false;
}

/**
 * Remove the hike association
 */
function onRemoveHike() {
    emit('removed');
}
</script>

<style scoped>
.hike-radio-group {
    max-height: 280px;
    overflow-y: auto;
}

.hike-label {
    display: flex;
    align-items: baseline;
}

.hike-name {
    font-weight: 500;
}

.hike-meta {
    font-size: 0.8em;
}

.duration-section {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 10px 14px;
}

.field-label {
    font-size: 0.85em;
    font-weight: 600;
    color: #555;
    margin-bottom: 6px;
}

.duration-inputs {
    display: flex;
    gap: 8px;
}

.duration-field {
    max-width: 110px;
}
</style>
