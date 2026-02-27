<template>
    <div class="external-layout" :class="{ 'fullscreen-mode': fullscreen }">
        <!-- Left panel: Map -->
        <div class="left-panel">
            <LittleMapView v-if="decodedTrack && decodedTrack.GeoJSON" ref="littleMapRef"
                :geoJson="decodedTrack.GeoJSON" :scoreJson="scoreJson" :hideAnalyze="true"
                @open-full-map="onOpenFullMap" @open-cesium="onOpenCesium" />
            <div v-else class="no-track-message">
                <p>Chargement de la trace...</p>
            </div>
        </div>

        <!-- Right panel: Info + Details -->
        <div class="right-panel">
            <!-- Top title: FileName + Close -->
            <div class="top-title">
                <span class="title-label">{{ $gettext('External track') }} :</span>
                <span class="filename-text">{{ fileName }}</span>
                <v-btn icon density="compact" variant="text" class="close-icon" @click="onClose">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </div>

            <!-- Top block: TraceInfoPanel -->
            <div class="top-block">
                <TraceInfoPanel :decodedData="decodedTrack" :anaResult="analysisTrack" />
            </div>

            <!-- Bottom block: ExternalDetails -->
            <div class="bottom-block">
                <ExternalDetails :decodedData="decodedTrack" :anaResult="analysisTrack" :rawIgcContent="rawIgcContent"
                    @score-computed="onScoreComputed" />
            </div>
        </div>

        <!-- Full Map Dialog -->
        <v-dialog v-model="showFullMap" fullscreen persistent transition="dialog-bottom-transition">
            <FullMapView v-if="flightData" :flightData="flightData" @close="showFullMap = false" />
        </v-dialog>

        <!-- Cesium 3D View Dialog -->
        <CesiumReplayView v-model="showCesiumView" :flightData="flightData" @close="showCesiumView = false" />
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import LittleMapView from '@/components/LittleMapView.vue';
import TraceInfoPanel from '@/components/TraceInfoPanel.vue';
import ExternalDetails from '@/components/ExternalDetails.vue';
import FullMapView from '@/components/FullMapView.vue';
import CesiumReplayView from '@/components/CesiumReplayView.vue';

const props = defineProps({
    decodedTrack: {
        type: Object,
        required: true
    },
    analysisTrack: {
        type: Object,
        default: null
    },
    rawIgcContent: {
        type: String,
        default: ''
    },
    fileName: {
        type: String,
        default: ''
    },
    fullscreen: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['close']);

const littleMapRef = ref(null);
const scoreJson = ref(null);
const showFullMap = ref(false);
const showCesiumView = ref(false);

// Construct flightData for FullMapView / CesiumReplayView
const flightData = computed(() => {
    if (!props.decodedTrack) return null;
    return {
        decodedIgc: props.decodedTrack,
        anaTrack: props.analysisTrack,
        site: props.decodedTrack?.info?.site || 'External Track',
        day: props.decodedTrack?.info?.date || ''
    };
});

function onScoreComputed(result) {
    scoreJson.value = result;
}

function onOpenFullMap() {
    showFullMap.value = true;
}

function onOpenCesium() {
    showCesiumView.value = true;
}

function onOpenAnalyze() {
    console.log('Open Analyze requested');
}

function onClose() {
    emit('close');
}
</script>

<style scoped>
.external-layout {
    display: flex;
    flex-direction: row;
    width: 100vw;
    height: 90vh;
    margin: 0;
    padding: 10px;
    gap: 2vw;
    box-sizing: border-box;
    background: #fff;
    position: relative;
}

.external-layout.fullscreen-mode {
    height: 100vh;
}

.left-panel,
.right-panel {
    height: 100%;
    box-sizing: border-box;
}

.left-panel {
    width: 50%;
    background: #f0f0f0;
    border: 2px solid #333;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.right-panel {
    width: 50%;
    display: flex;
    flex-direction: column;
    padding-right: 50px;
    gap: 10px;
}

.top-title {
    width: 100%;
    height: 6%;
    background: #f0f0f0;
    border: 2px solid #333;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    position: relative;
}

.filename-text {
    font-weight: bold;
    color: #333;
    font-size: 1.1rem;
}

.title-label {
    margin-right: 20px;
}

.top-block {
    width: 100%;
    height: 52%;
    background: #f0f0f0;
    border: 2px solid #333;
    border-radius: 10px;
    box-sizing: border-box;
    overflow: hidden;
}

.bottom-block {
    width: 100%;
    height: 30%;
    background: #f0f0f0;
    border: 2px solid #333;
    border-radius: 10px;
    box-sizing: border-box;
    overflow: hidden;
}

.no-track-message {
    text-align: center;
    padding: 20px;
    color: #666;
}

.close-icon {
    position: absolute;
    right: 4px;
}

@media (max-width: 900px) {
    .external-layout {
        flex-direction: column;
        /* Use calc to subtract the navbar height (~56px) */
        height: calc(100vh - 60px);
        padding: 2vw 1vw;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }

    .left-panel {
        width: 100%;
        height: 60vh;
        flex-shrink: 0;
    }

    .right-panel {
        width: 100%;
        height: auto;
        padding-right: 0;
        gap: 2vw;
    }

    .top-block,
    .bottom-block {
        height: auto;
        min-height: 200px;
        overflow: visible;
    }
}
</style>
