<template>
    <div class="external-layout">
        <!-- Left panel: Map -->
        <div class="left-panel">
            <LittleMapView v-if="decodedTrack && decodedTrack.GeoJSON" ref="littleMapRef"
                :geoJson="decodedTrack.GeoJSON" :scoreJson="scoreJson" @open-full-map="onOpenFullMap"
                @open-cesium="onOpenCesium" @open-analyze="onOpenAnalyze" />
            <div v-else class="no-track-message">
                <p>Chargement de la trace...</p>
            </div>
        </div>

        <!-- Right panel: Info + Details -->
        <div class="right-panel">
            <!-- Top title: FileName -->
            <div class="top-title">
                <span class="filename-text">{{ fileName }}</span>
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

            <!-- Close button -->
            <v-btn class="close-btn" color="error" density="compact" @click="onClose">
                <v-icon start>mdi-close-circle-outline</v-icon>
                {{ $gettext('Close') }}
            </v-btn>
        </div>

        <!-- Full Map Dialog -->
        <v-dialog v-model="showFullMap" fullscreen transition="dialog-bottom-transition">
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
}

.filename-text {
    font-weight: bold;
    color: #333;
    font-size: 1.1rem;
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

.close-btn {
    align-self: center;
    margin-top: auto;
    margin-bottom: 20px;
    z-index: 100;
}

@media (max-width: 900px) {
    .external-layout {
        flex-direction: column;
        height: auto;
        padding: 2vw 1vw;
    }

    .left-panel,
    .right-panel {
        width: 100%;
        height: auto;
        min-height: 40vh;
    }

    .right-panel {
        padding-right: 0;
        gap: 2vw;
    }

    .top-block,
    .bottom-block {
        height: auto;
        min-height: 200px;
    }
}
</style>
