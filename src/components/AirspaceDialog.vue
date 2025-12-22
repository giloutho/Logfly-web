<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="650">
        <v-card class="airspace-card">
            <v-card-text class="pa-4">

                <!-- Section 1: Display Airspaces -->
                <div class="section-header mb-4">
                    <v-icon color="primary" class="mr-2">mdi-eye</v-icon>
                    <span class="text-h6 text-primary font-weight-bold">Display airspaces [openAIP]</span>
                </div>

                <!-- Classes -->
                <div class="filter-group mb-3">
                    <div class="filter-label">Classes</div>
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
                    <div class="filter-label">Types</div>
                    <div class="d-flex flex-wrap gap-2">
                        <v-checkbox v-model="filters.types" label="Prohibited" value="Prohibited" density="compact"
                            hide-details class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="Restricted" value="Restricted" density="compact"
                            hide-details class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="Danger" value="Danger" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="CTR" value="CTR" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="TMA" value="TMA" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="RMZ" value="RMZ" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="TMZ" value="TMZ" density="compact" hide-details
                            class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="Gliding" value="Gliding" density="compact"
                            hide-details class="mr-4"></v-checkbox>
                        <v-checkbox v-model="filters.types" label="Autre" value="Other" density="compact"
                            hide-details></v-checkbox>
                    </div>
                </div>

                <!-- Floor Limit -->
                <div class="filter-group mb-3">
                    <div class="filter-label">Limite plancher</div>
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
                    <div class="filter-label">Radius</div>
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
                <div class="d-flex justify-center mb-6">
                    <v-btn color="primary" @click="displayAirspaces" prepend-icon="mdi-map-search">
                        Display
                    </v-btn>
                </div>

                <v-divider class="mb-6"></v-divider>

                <!-- Section 2: Check the track -->
                <div class="section-header mb-4 text-center">
                    <v-icon color="primary" class="mr-2">mdi-cloud-check</v-icon>
                    <span class="text-h6 text-primary font-weight-bold">Check the track</span>
                </div>

                <div class="d-flex justify-space-between gap-4 mt-4">
                    <v-btn variant="text" color="primary" class="check-btn" @click="checkSource('openaip')">
                        OpenAip source
                    </v-btn>
                    <v-btn variant="text" color="primary" class="check-btn" @click="checkSource('bazile')">
                        Bazile source (fr)
                    </v-btn>
                    <v-btn variant="text" color="primary" class="check-btn" @click="checkSource('local')">
                        Local file source
                    </v-btn>
                </div>
                <input type="file" ref="fileInput" style="display: none" accept=".txt" @change="onLocalFileChange" />

            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="$emit('update:modelValue', false)">Fermer</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { downloadAirspaces, processDecoding, checkTrack } from '@/js/airspaces/airspaces-aip.js'
import { downloadBazile, checkOpenAir } from '@/js/airspaces/airspaces-open.js'

const props = defineProps({
    modelValue: Boolean,
    decodedData: Object,
    flightData: Object,
    groundAltitudes: Array
})

const fileInput = ref(null)

const emit = defineEmits(['update:modelValue', 'display-airspaces', 'display-verification', 'start-progress', 'end-progress'])

// Mapping for Values (matching reference logic)
// Classes: 0=A...6=G. Reference sends array of integers.
// Types: 0=Other ... 21=Gliding. Reference sends array of strings like "3", "1".

const filters = reactive({
    classes: ['A', 'B', 'C', 'D', 'E'], // Default checked
    types: ['Prohibited', 'Restricted', 'Danger'],
    floor: '500', // m
    radius: '50' // km
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
    // Prepare values
    const selectedClasses = filters.classes.map(c => classMap[c]).filter(v => v !== undefined)
    // Always add 'SUA' (id 8) as per reference
    selectedClasses.push(8)

    const selectedTypes = filters.types.map(t => typeMap[t]).filter(v => v !== undefined)

    const filterValues = {
        classes: selectedClasses,
        types: selectedTypes,
        floor: parseInt(filters.floor),
        radius: parseInt(filters.radius) * 1000 // Convert to meters for logic if reference used meters?
        // Reference logic: 
        // In fullmap-track.js: values.radius = radioValues[1]*1000 (so meters)
        // In airspaces-aip.js: if radius != 0, openAip_Url uses `dist=${distance}` where distance is filterValues.radius
        // So yes, meters.
    }

    console.log('Fetching OpenAIP with:', filterValues)

    if (!props.decodedData || !props.decodedData.fixes) {
        console.error("No track data available for bbox")
        return
    }

    // Prepare feature (bbox for radius 0)
    // In FullMapView or igc-decoder, GeoJSON is available.
    // decodedData has fixes, info, stat... does it have GeoJSON?
    // igc-decoder.js creates this.GeoJSON.
    // FullMapView passes `decodedData` (which is track.data).
    // Let's assume props.decodedData has GeoJSON or we can get bbox.
    // prop `decodedData` comes from `flightData.decodedIgc`.
    // Let's check `igc-decoder.js`. It returns `track` object.
    // `track.GeoJSON` exists.

    const feature = props.decodedData.GeoJSON?.features?.[0] || null
    if (!feature) {
        console.error('No GeoJSON feature found')
        return
    }

    try {
        const dlResult = await downloadAirspaces(filterValues, feature)
        if (dlResult.success) {
            console.log(`Downloaded ${dlResult.airspaces.length} airspaces. Processing...`)
            const processed = await processDecoding(dlResult.airspaces, true, filterValues)
            if (processed.success) {
                console.log(`Decoded ${processed.geojson.length} airspaces.`)
                emit('display-airspaces', processed.geojson)
                emit('update:modelValue', false) // Close dialog on success? Or keep open? Reference keeps open usually? Reference just displays.
                // Maybe keep open to allow changing filters.
            } else {
                console.error(processed.message)
            }
        } else {
            console.error(dlResult.message)
        }
    } catch (error) {
        console.error('Global error:', error)
    }
}

async function checkSource(source) {
    console.log('Check track with source:', source)
    if (source === 'openaip') {
        await checkOpenAip()
    } else if (source === 'bazile') {
        await checkBazile()
    } else if (source === 'local') {
        fileInput.value.click()
    }
}

async function onLocalFileChange(event) {
    const file = event.target.files[0]
    if (!file) return

    console.log('Local file selected:', file.name)
    emit('start-progress', 'Airspaces checking in progress')
    const reader = new FileReader()
    reader.onload = async (e) => {
        try {
            const content = e.target.result
            if (!content) {
                console.error('Failed to read local file')
                emit('end-progress')
                return
            }

            const track = props.decodedData
            const ground = props.groundAltitudes
            const checkResult = await checkOpenAir(content, track, ground)

            if (checkResult.success) {
                console.log(`Local check complete. Found ${checkResult.insidePoints.length} points inside.`)
                emit('display-verification', checkResult)
                emit('update:modelValue', false)
            } else {
                console.error(checkResult.message)
            }
        } finally {
            emit('end-progress')
        }
    }
    reader.readAsText(file)
    // Reset input so change event fires even for same file
    event.target.value = ''
}

async function checkBazile() {
    if (!props.flightData || !props.decodedData || !props.decodedData.fixes || !props.groundAltitudes) {
        console.error("Missing flight data or ground altitudes for checking")
        return
    }

    try {
        // Provide feedback on start? (Optional, handled by console logs or future UI feedback)
        console.log('Starting Bazile verification...')
        emit('start-progress', 'Airspaces checking in progress')
        const dlResult = await downloadBazile()

        if (dlResult.success) {
            console.log('Bazile file downloaded. Size:', dlResult.content.length)
            // Check
            const track = props.decodedData
            const ground = props.groundAltitudes

            // Note: checkOpenAir is async
            const checkResult = await checkOpenAir(dlResult.content, track, ground)

            if (checkResult.success) {
                console.log(`Check complete. Found ${checkResult.insidePoints.length} points inside.`)
                emit('display-verification', checkResult)
                emit('update:modelValue', false)
            } else {
                console.error(checkResult.message)
            }
        } else {
            console.error(dlResult.message)
        }
    } catch (e) {
        console.error('Error checking bazile:', e)
    } finally {
        emit('end-progress')
    }
}

async function checkOpenAip() {
    if (!props.flightData || !props.decodedData || !props.decodedData.fixes || !props.groundAltitudes) {
        console.error("Missing flight data or ground altitudes for checking")
        return
    }

    const feature = props.decodedData.GeoJSON?.features?.[0]
    if (!feature) {
        console.error('No GeoJSON feature found')
        return
    }

    // Default filters for checking (all relevant)
    // Logfly65 uses default: classes all but E? Or maybe specific list.
    // fullmap-track.js: onCheckOpenAipClicked calls openaip:check with args.
    // it doesn't seem to pass explicit filters, but ipcmain airspaces-aip.js: checkTrack uses 'filter = true' and 'filterValues'.
    // Wait, logfly65 ipcmain: `const filter = true // always set to true`
    // but what are filterValues? Passed from fullmap-track.
    // fullmap-track.js: `values.radius = radioValues[1]*1000` etc.
    // It captures CURRENT filter values from UI?
    // Let's assume we use current UI filters for verification as well, OR defaults.
    // Usually verification should check against ALL regulations, not filtered ones.
    // BUT logfly65 `onCheckOpenAipClicked` gets `defaultFilter`...
    // Let's use the current `filters` reactive object as base, similar to display.

    const selectedClasses = [0, 1, 2, 3, 8]
    const selectedTypes = ['3', '1', '2']

    const filterValues = {
        classes: selectedClasses,
        types: selectedTypes,
        floor: parseInt(props.decodedData.stat.maxalt.gps || '5000'),
        radius: 0
    }

    console.log('Filter values:', filterValues)

    try {
        const dlResult = await downloadAirspaces(filterValues, feature)
        if (dlResult.success) {
            console.log(`Downloaded ${dlResult.airspaces.length} airspaces for checking.`)
            // Decode with filter=true (passed to processDecoding? checkTrack calls it?)
            // update: in our port `processDecoding` does decoding. `checkTrack` does checking.
            // We need to decode first matching the steps in ipcmain airspaces-aip check handler.

            const processed = await processDecoding(dlResult.airspaces, true, filterValues)
            if (processed.success) {
                console.log(`Decoded ${processed.geojson.length} airspaces. Checking violations...`)

                // Track object needs to act like logfly65 track object (fixes, stat, GeoJSON)
                // props.decodedData IS the track object usually.
                const track = props.decodedData
                const ground = props.groundAltitudes

                const checkResult = await checkTrack(track, processed.geojson, ground)

                if (checkResult.success) {
                    console.log(`Check complete. Found ${checkResult.insidePoints.length} points inside.`)
                    emit('display-verification', checkResult)
                    emit('update:modelValue', false)
                } else {
                    console.error(checkResult.message)
                }
            } else {
                console.error(processed.message)
            }
        } else {
            console.error(dlResult.message)
        }
    } catch (e) {
        console.error('Error checking openaip:', e)
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

.check-btn {
    text-transform: none;
    text-decoration: underline;
    font-weight: bold;
    font-size: 0.9rem;
}
</style>
