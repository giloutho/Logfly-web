<template>
    <div class="full-map-view">
        <!-- App Bar -->
        <div class="toolbar-row">
            <div class="toolbar-left">
                <v-btn class="toolbar-btn" @click="infoDialog = true"> {{ $gettext('Infos') }}</v-btn>
                <v-btn class="toolbar-btn" @click="openChrono">{{ $gettext('Pathway') }}</v-btn>
                <v-btn class="toolbar-btn" @click="airspaceDialog = true">{{ $gettext('Airspaces') }}</v-btn>
                <v-btn class="toolbar-btn" @click="scoreDialog = true">{{ $gettext('Score') }}</v-btn>
                <v-btn class="toolbar-btn" :color="isCutting ? 'error' : ''" @click="toggleCutting">{{ isCutting ?
                    $gettext('Cancel') : $gettext('Cut') }}
                </v-btn>
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
                <span v-else>{{ $gettext('Hover over the graph to see details') }}</span>
            </div>
            <div class="graph-section">
                <GraphUplot v-if="flightData?.decodedIgc?.fixes && flightData.decodedIgc.fixes.length > 0"
                    :fixes="flightData?.decodedIgc?.fixes" :groundAltitudes="groundAltitudes" :height="150"
                    :cuttingMode="isCutting" :cutStart="cutStartIndex" :cutEnd="cutEndIndex"
                    @cursor-changed="onGraphCursorChanged" @click-graph="onGraphClick" />
            </div>
            <TraceInfoDialog v-model="infoDialog" :trackData="flightInfo" :anaResult="flightData?.anaTrack"
                :decodedData="flightData?.decodedIgc" />
            <ChronoView v-model="chronoDialog" :anaResult="flightData?.anaTrack" @jump-to="onChronoJump"
                @jump-to-takeoff="onJumpTakeoff" @jump-to-landing="onJumpLanding" />
            <AirspaceDialog v-model="airspaceDialog" :decodedData="flightData?.decodedIgc"
                :flightData="flightData?.decodedIgc" :groundAltitudes="groundAltitudes"
                @display-airspaces="onDisplayAirspaces" @display-verification="onDisplayVerification"
                @start-progress="onStartProgress" @end-progress="onEndProgress" />
            <ScoreDialog v-model="scoreDialog" :scores="scores" :fixes="flightData?.decodedIgc?.fixes || []"
                :date="flightData?.decodedIgc?.info?.date || ''" :scoringFn="scoringFn" @score-result="onScoreResult" />
            <ScoreResultDialog v-if="scoreResultDialog" :result="currentScoreResult" :league="currentLeague"
                @close="scoreResultDialog = false" />
            <CuttingDialog v-model="cuttingDialog" :startPoint="cutStartPoint" :endPoint="cutEndPoint"
                @confirm="confirmCut" @cancel="cancelCut" />
            <ProgressDialog v-model="progressDialog" :message="progressMessage" @cancel="onProgressCancel" />

        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import MapLeaflet from './MapLeaflet.vue'
import GraphUplot from './GraphUplot.vue'
import TraceInfoDialog from './TraceInfoDialog.vue'
import ScoreResultDialog from './ScoreResultDialog.vue'
import ChronoView from './ChronoView.vue'
import AirspaceDialog from './AirspaceDialog.vue'
import ScoreDialog from './ScoreDialog.vue'
import CuttingDialog from './CuttingDialog.vue'
import ProgressDialog from './ProgressDialog.vue'
import { interruptCheck } from '@/js/airspaces/airspaces-open.js'
import { igcScoring } from '@/js/igc/igc-scoring.js'
import { getAltitudesForPoints } from '@/js/geo/elevation.js'
import { encodeIGC } from '@/js/igc/igc-encoding.js'
import { parseIGC } from '@/modules/Tracks/js/igc-parser.js'
import { useDatabaseStore } from '@/stores/database'

const databaseStore = useDatabaseStore();
const { $gettext } = useGettext();

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
const scoreResultDialog = ref(false)
const cuttingDialog = ref(false)
const progressDialog = ref(false)
const progressMessage = ref('Airspaces checking in progress')

const mapLeaflet = ref(null)
const hoverInfo = ref('')
const groundAltitudes = ref(null)
const currentScoreResult = ref(null)
const currentLeague = ref('')

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

onMounted(() => {
    if (props.flightData?.decodedIgc?.fixes) {
        loadGroundAltitudes()
    }
})

watch(() => props.flightData, () => {
    if (props.flightData?.decodedIgc?.fixes) {
        loadGroundAltitudes()
    }
    loadAnalysisLayers()
}, { deep: true })

async function loadGroundAltitudes() {
    // Check if we already have it in props
    if (props.flightData.anaTrack?.elevation && props.flightData.anaTrack.elevation.length > 0) {
        groundAltitudes.value = props.flightData.anaTrack.elevation
        return
    }

    const fixes = props.flightData.decodedIgc.fixes

    try {
        const altitudes = await getAltitudesForPoints(fixes)
        if (altitudes) {
            groundAltitudes.value = altitudes
            // console.log('Altitudes sol chargées')
            // Optionnel : mettre à jour l'objet source si on veut le conserver pour cette session
            if (props.flightData.anaTrack) {
                props.flightData.anaTrack.elevation = altitudes
            }
        }
    } catch (e) {
        console.error("Erreur chargement altitudes sol", e)
    }
}


function onMapReady(mapInstance) {
    // Load extra layers if data available
    loadAnalysisLayers()
}

function openChrono() {
    chronoDialog.value = true
    if (mapLeaflet.value) {
        mapLeaflet.value.setAnalysisLayersVisibility(true)
    }
}

function loadAnalysisLayers() {
    if (props.flightData?.anaTrack && mapLeaflet.value) {
        if (props.flightData.anaTrack.geoThermals) {
            mapLeaflet.value.displayThermals(props.flightData.anaTrack.geoThermals)
        }
        if (props.flightData.anaTrack.geoGlides) {
            mapLeaflet.value.displayGlides(props.flightData.anaTrack.geoGlides)
        }
    }
}

function onChronoJump(coords) {
    if (mapLeaflet.value) {
        mapLeaflet.value.displaySegment(coords)
    } else {
        console.error('FullMapView: mapLeaflet ref is missing')
    }
}

function onJumpTakeoff() {
    console.log('FullMapView: onJumpTakeoff')
    if (mapLeaflet.value && mapLeaflet.value.displayTakeOff) {
        mapLeaflet.value.displayTakeOff()
    } else {
        console.error('FullMapView: mapLeaflet ref is missing or displayTakeOff not defined')
    }
}

function onJumpLanding() {
    console.log('FullMapView: onJumpLanding')
    if (mapLeaflet.value && mapLeaflet.value.displayLanding) {
        mapLeaflet.value.displayLanding()
    } else {
        console.error('FullMapView: mapLeaflet ref is missing or displayLanding not defined')
    }
}

function onDisplayAirspaces(geoJsonData) {
    if (mapLeaflet.value) {
        mapLeaflet.value.displayAirspaceLayer(geoJsonData)
    }
}

function onDisplayVerification(checkResult) {
    if (mapLeaflet.value) {
        const fixes = props.flightData?.decodedIgc?.fixes
        mapLeaflet.value.displayVerification(checkResult, fixes)
    }
}

function onScoreResult({ league, result }) {
    currentLeague.value = league
    currentScoreResult.value = result
    scoreResultDialog.value = true
    if (mapLeaflet.value) {
        mapLeaflet.value.displayScoringResult(result, league)
    }
}

function onStartProgress(message) {
    progressMessage.value = message || 'Airspaces checking in progress'
    progressDialog.value = true
}

function onEndProgress() {
    progressDialog.value = false
}

function onProgressCancel() {
    interruptCheck()
    progressDialog.value = false
}



function onGraphCursorChanged(data) {
    // Update Hover Info
    // const hground = 'N/A' // Need ground altitude logic
    // Ground altitude is passed via data now if graph updated OR we look it up here via index

    // GraphUplot updates the event with ground altitude if available? 
    // Wait, GraphUplot emits simplified data. 
    // Let's rely on GraphUplot to pass back the data corresponding to the index, OR look into groundAltitudes.value[index]

    const index = data.index
    let groundAlt = 'N/A'
    let hground = 'N/A'
    if (groundAltitudes.value && groundAltitudes.value[index] != null) {
        groundAlt = groundAltitudes.value[index].toFixed(0)
        hground = groundAltitudes.value[index] !== undefined && groundAltitudes.value[index] !== null ? (data.altitude - groundAltitudes.value[index]).toFixed(0) : 'N/A';
    }

    // Simple HTML formatting mimicking the reference
    hoverInfo.value = `
        <span style="color:#1a6dcc;font-weight:bold;">🕒 ${new Date(data.timestamp).toLocaleTimeString()}</span>
        &nbsp;|&nbsp;
        <span style="color:#1976d2;">⛰️ ${data.altitude.toFixed(0)} m</span>
        &nbsp;|&nbsp;
        <span style="color:#5d4037;">🟫 Sol ${groundAlt} m</span>
        &nbsp;|&nbsp;
        <span style="color:#6d4c41;">⬇️ ${hground} m</span>
        &nbsp;|&nbsp;
        <span style="color:#388e3c;">↕️ ${data.vario.toFixed(2)} m/s</span>
        &nbsp;|&nbsp;
        <span style="color:#e65100;">➡️ ${data.speed.toFixed(0)} km/h</span>
    `

    // Update Map Marker
    if (mapLeaflet.value) {
        mapLeaflet.value.setHoverPoint(data.lat, data.lon)
    }
}

const isCutting = ref(false)
const cutStartIndex = ref(null)
const cutEndIndex = ref(null)
const cutStartPoint = ref(null)
const cutEndPoint = ref(null)

function toggleCutting() {
    if (isCutting.value) {
        cancelCut()
    } else {
        isCutting.value = true
        cutStartIndex.value = null
        cutEndIndex.value = null
        alert('Sélectionner par un clic sur la courbe d\'altitude le point de départ et le point de fin de la portion à conserver')
    }
}

function onGraphClick(index) {
    if (!isCutting.value) return
    const fixes = props.flightData?.decodedIgc?.fixes
    if (!fixes || !fixes[index]) return

    const fix = fixes[index]
    const dateObj = new Date(fix.timestamp)
    const timeStr = dateObj.getHours().toString().padStart(2, '0') + ':' + dateObj.getMinutes().toString().padStart(2, '0') + ':' + dateObj.getSeconds().toString().padStart(2, '0')
    const pointInfo = {
        index: index,
        time: timeStr
    }

    if (cutStartIndex.value === null) {
        cutStartIndex.value = index
        cutStartPoint.value = pointInfo
    } else if (cutEndIndex.value === null) {
        // Ensure start < end
        if (index < cutStartIndex.value) {
            cutEndIndex.value = cutStartIndex.value
            cutEndPoint.value = cutStartPoint.value
            cutStartIndex.value = index
            cutStartPoint.value = pointInfo
        } else {
            cutEndIndex.value = index
            cutEndPoint.value = pointInfo
        }
        // Open confirmation
        cuttingDialog.value = true
    }
}

function cancelCut() {
    isCutting.value = false
    cutStartIndex.value = null
    cutEndIndex.value = null
    cutStartPoint.value = null
    cutEndPoint.value = null
    cuttingDialog.value = false
}

async function confirmCut() {
    const startIdx = cutStartIndex.value
    const endIdx = cutEndIndex.value
    const fixes = props.flightData?.decodedIgc?.fixes
    const headers = props.flightData?.decodedIgc?.info
    console.log('FullMapView: confirmCut', startIdx, endIdx, fixes.length)

    if (startIdx !== null && endIdx !== null && fixes) {
        const newFixes = fixes.slice(startIdx, endIdx + 1)
        const newIgcString = encodeIGC(newFixes, {
            date: props.flightData.day, // headers.date might be DD/MM/YY
            pilotName: headers.pilot,
            gliderType: props.flightData.glider,
            gliderId: headers.gliderId
        })
        // check parse
        const newFlight = parseIGC(newIgcString)
        if (newFlight.isValid && props.flightData.dbId) {
            const duration = newFlight.duration
            const sDuration = newFlight.durationStr
            console.log('FullMapView: confirmCut', duration, sDuration)
            // Update DB
            const result = databaseStore.update(
                "UPDATE Vol SET V_Duree = ?, V_sDuree = ?, V_IGC = ? WHERE V_ID = ?",
                [duration, sDuration, newIgcString, props.flightData.dbId]
            )
            if (result.success) {
                alert('Trace mise à jour avec succès.')
                emit('close') // Close FullMap to refresh parent logic
            } else {
                alert('Erreur lors de la mise à jour de la base de données.')
            }
        } else {
            alert('Erreur lors de la génération du fichier IGC.')
        }
    }
    cancelCut()
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
