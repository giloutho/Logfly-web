<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="650">
        <v-card class="airspace-card">
            <v-card-text class="pa-4">

                <!-- Section: Display Airspaces -->
                <div class="section-header mb-4">
                    <v-icon color="primary" class="mr-2">mdi-eye</v-icon>
                    <span class="text-h6 text-primary font-weight-bold">{{ $gettext('Display airspaces') }}
                        [openAIP]</span>
                </div>

                <!-- Classes -->
                <div class="filter-group mb-3">
                    <div class="filter-label">{{ $gettext('Classes') }}</div>
                    <div class="d-flex flex-wrap gap-2">
                        <v-checkbox v-model="filters.classes" label="A" value="A" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.classes" label="B" value="B" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.classes" label="C" value="C" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.classes" label="D" value="D" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.classes" label="E" value="E" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.classes" label="F" value="F" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.classes" label="G" value="G" density="compact"
                            hide-details></v-checkbox>
                    </div>
                </div>

                <!-- Types -->
                <div class="filter-group mb-3">
                    <div class="filter-label">{{ $gettext('Types') }}</div>
                    <div class="d-flex flex-wrap gap-2">
                        <v-checkbox v-model="filters.types" :label="$gettext('Prohibited')" value="Prohibited"
                            density="compact" hide-details class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" :label="$gettext('Restricted')" value="Restricted"
                            density="compact" hide-details class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" :label="$gettext('Danger')" value="Danger" density="compact"
                            hide-details class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="CTR" value="CTR" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="TMA" value="TMA" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="RMZ" value="RMZ" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="TMZ" value="TMZ" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" :label="$gettext('Gliding')" value="Gliding"
                            density="compact" hide-details class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" :label="$gettext('Other')" value="Other" density="compact"
                            hide-details></v-checkbox>
                    </div>
                </div>

                <!-- Floor Limit -->
                <div class="filter-group mb-3">
                    <div class="filter-label">{{ $gettext('Floor limit') }}</div>
                    <v-radio-group v-model="filters.floor" inline density="compact" hide-details>
                        <v-radio label="500m" value="500" class="mr-4"></v-radio>
                        <v-radio label="1000m" value="1000" class="mr-4"></v-radio>
                        <v-radio label="2000m" value="2000" class="mr-4"></v-radio>
                        <v-radio label="3000m" value="3000" class="mr-4"></v-radio>
                        <v-radio label="4000m" value="4000" class="mr-4"></v-radio>
                        <v-radio label="5000m" value="5000"></v-radio>
                    </v-radio-group>
                </div>

                <!-- Radius -->
                <div class="filter-group mb-4">
                    <div class="filter-label">{{ $gettext('Radius') }}</div>
                    <v-radio-group v-model="filters.radius" inline density="compact" hide-details>
                        <v-radio label="50km" value="50" class="mr-3"></v-radio>
                        <v-radio label="100km" value="100" class="mr-3"></v-radio>
                        <v-radio label="150km" value="150" class="mr-3"></v-radio>
                        <v-radio label="200km" value="200" class="mr-3"></v-radio>
                        <v-radio label="300km" value="300" class="mr-3"></v-radio>
                        <v-radio label="400km" value="400" class="mr-3"></v-radio>
                        <v-radio label="500km" value="500"></v-radio>
                    </v-radio-group>
                </div>

                <!-- Display Button -->
                <div class="d-flex justify-center">
                    <v-btn color="primary" @click="displayAirspaces" prepend-icon="mdi-map-search" :loading="loading"
                        :disabled="loading">
                        {{ $gettext('Display') }}
                    </v-btn>
                </div>

                <!-- Error message -->
                <v-alert v-if="errorMessage" type="error" class="mt-4" density="compact" closable
                    @click:close="errorMessage = ''">
                    {{ errorMessage }}
                </v-alert>

            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="$emit('update:modelValue', false)">{{ $gettext('Close') }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { downloadAirspacesByCenter, processDecoding } from '@/js/airspaces/airspaces-aip.js'

const props = defineProps({
    modelValue: Boolean,
    mapCenter: {
        type: Object,  // { lat: number, lng: number }
        required: true
    }
})

const emit = defineEmits(['update:modelValue', 'display-airspaces'])

const loading = ref(false)
const errorMessage = ref('')

// Mapping for Values (matching reference logic)
// Classes: 0=A...6=G. Reference sends array of integers.
// Types: 0=Other ... 21=Gliding. Reference sends array of strings like "3", "1".

const filters = reactive({
    classes: ['A', 'B', 'C', 'D', 'E'], // Default checked
    types: ['Prohibited', 'Restricted', 'Danger'],
    floor: '500', // m
    radius: '100' // km - default 100km for route planning
})

const classMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6 }
const typeMap = {
    'Prohibited': '3',
    'Restricted': '1',
    'Danger': '2',
    'CTR': '4',
    'TMA': '7',
    'RMZ': '6',
    'TMZ': '5',
    'Gliding': '21',
    'Other': '0'
}

async function displayAirspaces() {
    loading.value = true
    errorMessage.value = ''

    // Prepare values
    const selectedClasses = filters.classes.map(c => classMap[c]).filter(v => v !== undefined)
    // Always add 'SUA' (id 8) as per reference
    selectedClasses.push(8)

    const selectedTypes = filters.types.map(t => typeMap[t]).filter(v => v !== undefined)

    const filterValues = {
        classes: selectedClasses,
        types: selectedTypes,
        floor: parseInt(filters.floor),
        radius: parseInt(filters.radius) * 1000 // Convert km to meters
    }

    console.log('[AirspaceRouteDialog] Fetching OpenAIP with:', filterValues)
    console.log('[AirspaceRouteDialog] Map center:', props.mapCenter)

    if (!props.mapCenter || props.mapCenter.lat === undefined || props.mapCenter.lng === undefined) {
        errorMessage.value = 'Map center not available'
        loading.value = false
        return
    }

    try {
        const dlResult = await downloadAirspacesByCenter(filterValues, props.mapCenter)

        if (dlResult.success) {
            console.log(`[AirspaceRouteDialog] Downloaded ${dlResult.airspaces.length} airspaces. Processing...`)

            if (dlResult.airspaces.length === 0) {
                errorMessage.value = 'No airspaces found in this area'
                loading.value = false
                return
            }

            const processed = await processDecoding(dlResult.airspaces, true, filterValues)

            if (processed.success) {
                console.log(`[AirspaceRouteDialog] Decoded ${processed.geojson.length} airspaces.`)
                emit('display-airspaces', processed.geojson)
                emit('update:modelValue', false) // Close dialog on success
            } else {
                errorMessage.value = processed.message || 'Error processing airspaces'
            }
        } else {
            errorMessage.value = dlResult.message || 'Error downloading airspaces'
        }
    } catch (error) {
        console.error('[AirspaceRouteDialog] Error:', error)
        errorMessage.value = 'Error: ' + error.message
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.section-header {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #e3f2fd;
    padding: 6px 12px;
    border-radius: 6px;
}

.filter-group {
    margin-bottom: 8px;
}

.filter-label {
    font-weight: 700;
    font-size: 0.9rem;
    margin-bottom: 2px;
    color: #333;
}

/* Reduce toggle size */
:deep(.v-selection-control) {
    min-height: 24px !important;
}

:deep(.v-label) {
    font-size: 0.85rem !important;
}
</style>
