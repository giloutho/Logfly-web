<template>
    <div class="full-map-view">
        <!-- App Bar -->
        <div class="toolbar-row">
            <div class="toolbar-left">
                <v-btn class="toolbar-btn" @click="infoDialog = true">Infos</v-btn>
                <v-btn class="toolbar-btn" @click="chronoDialog = true">Chronologie</v-btn>
                <v-btn class="toolbar-btn" @click="airspaceDialog = true">Espaces aériens</v-btn>
                <v-btn class="toolbar-btn" @click="scoreDialog = true">Score</v-btn>
                <v-btn class="toolbar-btn" @click="measureTool">Mesurer</v-btn>
                <v-btn class="toolbar-btn" @click="cuttingDialog = true">Couper</v-btn>
            </div>
            <div class="toolbar-right">
                <v-btn icon @click="$emit('close')">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </div>
        </div>

        <div class="toolbar-separator"></div>

        <!-- Map and Graph Container -->
        <div class="content-wrapper">
            <div class="map-section">
                <MapLeaflet ref="mapLeaflet" :geoJson="flightData?.decodedIgc?.GeoJSON"
                    :fixes="flightData?.decodedIgc?.fixes" @map-ready="onMapReady" />
            </div>

            <div class="graph-info" id="graph-info" ref="graphInfo">
                <!-- Info will be injected here or via Vue binding if improved -->
                <span v-if="hoverInfo" v-html="hoverInfo"></span>
                <span v-else>Survolez le graphe pour voir les détails</span>
            </div>

            <div class="graph-section">
                <GraphUplot v-if="flightData?.decodedIgc?.fixes" :fixes="flightData?.decodedIgc?.fixes" :height="150"
                    @cursor-changed="onGraphCursorChanged" />
            </div>
        </div>

        <!-- Dialogs -->
        <TraceInfoDialog v-model="infoDialog" :trackData="flightInfo" :anaResult="flightData?.anaTrack"
            :decodedData="flightData?.decodedIgc" />
        <ChronoView v-model="chronoDialog" />
        <AirspaceDialog v-model="airspaceDialog" :decodedData="flightData?.decodedIgc?.data" />
        <ScoreDialog v-model="scoreDialog" :scores="scores" :fixes="flightData?.decodedIgc?.fixes || []"
            :date="flightData?.decodedIgc?.info?.date || ''" :scoringFn="scoringFn" />
        <CuttingDialog v-model="cuttingDialog" />

    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MapLeaflet from './MapLeaflet.vue'
import GraphUplot from './GraphUplot.vue'
import TraceInfoDialog from './TraceInfoDialog.vue'
import ChronoView from './ChronoView.vue'
import AirspaceDialog from './AirspaceDialog.vue'
import ScoreDialog from './ScoreDialog.vue'
import CuttingDialog from './CuttingDialog.vue'
import { igcScoring } from '@/js/igc/igc-scoring.js'

const props = defineProps({
    flightData: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close'])

const infoDialog = ref(false)
const chronoDialog = ref(false)
const airspaceDialog = ref(false)
const scoreDialog = ref(false)
const cuttingDialog = ref(false)

const mapLeaflet = ref(null)
const hoverInfo = ref('')

const scores = [
    'FFVL',
    'XContest',
    'FAI',
    'FAI-Cylinders',
    'FAI-OAR',
    'FAI-OAR2',
    'XCLeague'
]

const flightInfo = computed(() => {
    if (!props.flightData) return {}
    return {
        date: props.flightData.day,
        pilot: props.flightData.decodedIgc?.info?.pilot,
        glider: props.flightData.glider
    }
})

// Function to pass to ScoreDialog
const scoringFn = igcScoring

function onMapReady(mapInstance) {
    // Determine what to do with map instance if needed
}

function measureTool() {
    // Implement measurement tool toggle logic here
    // checking if leaflet-measure plugin is available/needed
    // For now, placeholder alert
    alert("Outil de mesure à implémenter")
}

function onGraphCursorChanged(data) {
    // Update Hover Info
    const hground = 'N/A' // Need ground altitude logic

    // Simple HTML formatting mimicking the reference
    hoverInfo.value = `
        <span style="color:#1a6dcc;font-weight:bold;">🕒 ${new Date(data.timestamp).toLocaleTimeString()}</span>
        &nbsp;|&nbsp;
        <span style="color:#1976d2;">⛰️ ${data.altitude.toFixed(0)} m</span>
        &nbsp;|&nbsp;
        <span style="color:#388e3c;">⬇️ ${data.vario.toFixed(2)} m/s</span>
        &nbsp;|&nbsp;
        <span style="color:#e65100;">➡️ ${data.speed.toFixed(0)} km/h</span>
    `

    // Update Map Marker
    if (mapLeaflet.value) {
        mapLeaflet.value.setHoverPoint(data.lat, data.lon)
    }
}
</script>

<style scoped>
.full-map-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    padding: 8px;
}

.toolbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    flex-shrink: 0;
}

.toolbar-left {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.toolbar-btn {
    font-size: 0.85rem;
    min-width: 80px;
    padding: 0 10px;
    background: #f5f5f5;
    color: #333;
    border-radius: 4px;
    box-shadow: none;
    text-transform: none;
}

.toolbar-separator {
    width: 100%;
    height: 2px;
    background: #e0e0e0;
    margin-bottom: 8px;
    flex-shrink: 0;
}

.content-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    /* Important for flex nesting */
}

.map-section {
    flex: 1;
    min-height: 0;
    border: 1px solid #e0e0e0;
}

.graph-info {
    width: 100%;
    min-height: 28px;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    border-top: 1px solid #e0e0e0;
    font-size: 0.95em;
    padding: 6px 12px;
    color: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-shrink: 0;
}

.graph-section {
    height: 150px;
    background: #fafafa;
    border-top: 1px solid #e0e0e0;
    flex-shrink: 0;
}
</style>
