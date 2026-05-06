<template>
    <v-dialog v-model="dialog" fullscreen transition="dialog-bottom-transition">
        <v-card class="cesium-replay-card">
            <!-- Toolbar -->
            <v-toolbar color="primary" density="compact">
                <v-toolbar-title>{{ $gettext('3D Flight Replay') }}</v-toolbar-title>
                <v-spacer></v-spacer>

                <!-- Terrain toggle -->
                <v-btn-toggle v-model="terrainProvider" mandatory density="compact" class="terrain-toggle">
                    <v-btn value="arcgis" size="small" title="ArcGIS Terrain">ArcGIS Terrain</v-btn>
                    <v-btn value="cesium" size="small" title="Cesium Terrain">Cesium Terrain</v-btn>
                </v-btn-toggle>

                <v-divider vertical class="mx-2"></v-divider>

                <!-- Camera mode -->
                <v-btn-toggle v-model="cameraMode" mandatory density="compact" class="camera-toggle">
                    <v-btn value="follow" size="small" :title="$gettext('Follow view')">
                        <v-icon>mdi-airplane</v-icon>
                    </v-btn>
                    <v-btn value="free" size="small" :title="$gettext('Free camera')">
                        <v-icon>mdi-axis-arrow</v-icon>
                    </v-btn>
                </v-btn-toggle>

                <v-divider vertical class="mx-2"></v-divider>

                <!-- Full view toggle -->
                <v-btn size="small" :color="isFullView ? 'warning' : ''" @click="toggleFullView"
                    :title="isFullView ? 'Mode Replay' : 'Vue Complète'">
                    <v-icon>{{ isFullView ? 'mdi-play-circle' : 'mdi-earth' }}</v-icon>
                    <span class="ml-1">{{ isFullView ? 'Replay' : 'Vue Complète' }}</span>
                </v-btn>

                <v-spacer></v-spacer>
                <v-btn icon @click="close">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-toolbar>

            <!-- Content wrapper -->
            <div class="content-wrapper">
                <!-- Cesium container -->
                <div ref="cesiumContainer" class="cesium-container"></div>

                <!-- Custom replay bar -->
                <div class="replay-bar">
                    <v-btn icon size="small" variant="text" @click="togglePlayback"
                        :title="isPlaying ? 'Pause' : 'Play'">
                        <v-icon>{{ isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                    </v-btn>
                    <v-btn icon size="small" variant="text" @click="restartAnimation" title="Restart">
                        <v-icon>mdi-restart</v-icon>
                    </v-btn>

                    <v-btn-toggle v-model="speedMultiplier" mandatory density="compact" class="speed-toggle">
                        <v-btn :value="1" size="x-small">x1</v-btn>
                        <v-btn :value="5" size="x-small">x5</v-btn>
                        <v-btn :value="10" size="x-small">x10</v-btn>
                        <v-btn :value="30" size="x-small">x30</v-btn>
                    </v-btn-toggle>

                    <span class="replay-time">{{ formatTime(sliderValue) }}</span>

                    <v-slider v-model="sliderValue" :min="0" :max="sliderMax" :step="0.1" hide-details
                        density="compact" class="replay-slider" @update:model-value="onSliderChange"
                        @start="onSliderDragStart" @end="onSliderDragEnd"
                        thumb-label="always" :thumb-label-formatter="formatTime" />

                    <span class="replay-time replay-time--total">{{ formatTime(sliderMax) }}</span>
                </div>

                <!-- Graph info bar -->
                <div class="graph-info">
                    <span v-if="hoverInfo" v-html="hoverInfo"></span>
                    <span v-else>{{ $gettext('Hover over the graph to see details') }}</span>
                </div>

                <!-- Graph section -->
                <div class="graph-section">
                    <GraphUplot v-if="fixes && fixes.length > 0" :fixes="fixes" :groundAltitudes="groundAltitudes"
                        :speeds="props.flightData?.decodedIgc?.speed" :varios="props.flightData?.decodedIgc?.vz"
                        :height="150" :currentIndex="currentFixIndex"
                        :offsetUTC="flightData?.decodedIgc?.info?.offsetUTC || 0" @cursor-changed="onGraphCursorChanged"
                        @click-graph="onGraphClick" />
                </div>
            </div>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick, toRaw } from 'vue';
import { useGettext } from "vue3-gettext";
import GraphUplot from './GraphUplot.vue';
import { igcToCzml, getFixIndexForTimestamp, julianDateToTimestamp } from '@/js/igc/igc-to-czml.js';
import { getAltitudesForPoints } from '@/js/geo/elevation.js';

const { $gettext } = useGettext();

const props = defineProps({
    modelValue: Boolean,
    flightData: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['update:modelValue', 'close']);

const cesiumContainer = ref(null);
let viewer = null;
let clockTickListener = null;

const dialog = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});

// Playback state
const isPlaying = ref(false);
const speedMultiplier = ref(10);  // Default to x10
const cameraMode = ref('follow');  // Start tracked like double-click, with wide viewFrom
const currentFixIndex = ref(0);
const hoverInfo = ref('');
const groundAltitudes = ref(null);
const isFullView = ref(false);
const terrainProvider = ref('arcgis');  // Default to ArcGIS Terrain

// Custom slider state
const sliderValue = ref(0);
const sliderMax = ref(100);
const isDraggingSlider = ref(false);
const wasPlayingBeforeDrag = ref(false);

// Store total duration in seconds for slider
let totalDurationSeconds = 0;
let paragliderEntity = null;  // Keep reference for follow mode

// Extract fixes from flight data and sanitize them (strip Vue proxies / ensure numbers)
const rawFixes = computed(() => props.flightData?.decodedIgc?.fixes || []);

const fixes = computed(() => {
    if (!rawFixes.value || rawFixes.value.length === 0) return [];

    return rawFixes.value
        .map((fix) => {
            const plain = toRaw(fix) || {};
            const lon = Number(plain.longitude);
            const lat = Number(plain.latitude);
            const alt = Number(plain.gpsAltitude ?? plain.pressureAltitude ?? 0);
            const ts = Number(plain.timestamp);

            return {
                ...plain,
                longitude: lon,
                latitude: lat,
                gpsAltitude: Number.isFinite(alt) ? alt : 0,
                timestamp: ts
            };
        })
        .filter((fix) =>
            Number.isFinite(fix.longitude) &&
            Number.isFinite(fix.latitude) &&
            Number.isFinite(fix.timestamp) &&
            fix.longitude >= -180 && fix.longitude <= 180 &&
            fix.latitude >= -90 && fix.latitude <= 90
        );
});

// Cesium Ion access token
const CESIUM_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ZDdkZjczNS1jNTA2LTQzMmItYjBjYy0wYjFlOTc5NmU1MWQiLCJpZCI6MTAzNjg4LCJpYXQiOjE2NTk2Mzc5MjB9.QX13Kb7nisYi733uOKSEAbomggCjUF-9xv2l3efpmWs';

// ArcGIS Terrain URL
const ARCGIS_TERRAIN_URL = 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer';

async function getTerrainProvider(type) {
    const Cesium = window.Cesium;
    if (type === 'arcgis') {
        return await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(ARCGIS_TERRAIN_URL);
    }
    return await Cesium.createWorldTerrainAsync();
}

async function initCesium() {
    if (!cesiumContainer.value) return;

    if (!window.Cesium) {
        await loadCesiumScripts();
    }

    const Cesium = window.Cesium;
    Cesium.Ion.defaultAccessToken = CESIUM_TOKEN;

    // Initialize viewer WITHOUT built-in animation/timeline widgets
    viewer = new Cesium.Viewer(cesiumContainer.value, {
        terrainProvider: await getTerrainProvider(terrainProvider.value),
        animation: false,       // Hide animation widget
        timeline: false,        // Hide timeline widget
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        shouldAnimate: true     // Auto-start playback
    });

    // --- Camera controls: left-drag to rotate/tilt, right-drag to zoom ---
    const controller = viewer.scene.screenSpaceCameraController;
    controller.tiltEventTypes = [
        Cesium.CameraEventType.LEFT_DRAG,
        Cesium.CameraEventType.PINCH,
        { eventType: Cesium.CameraEventType.LEFT_DRAG, modifier: Cesium.KeyboardEventModifier.CTRL },
        { eventType: Cesium.CameraEventType.RIGHT_DRAG, modifier: Cesium.KeyboardEventModifier.CTRL }
    ];
    controller.zoomEventTypes = [
        Cesium.CameraEventType.RIGHT_DRAG,
        Cesium.CameraEventType.WHEEL,
        Cesium.CameraEventType.PINCH
    ];

    // Load flight data if available
    if (fixes.value && fixes.value.length > 0) {
        await loadFlightAnimation();
    }

    // Setup clock tick listener for synchronization
    clockTickListener = viewer.clock.onTick.addEventListener(onClockTick);
}

function loadCesiumScripts() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.Cesium) {
            resolve();
            return;
        }

        // Load CSS
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://cesium.com/downloads/cesiumjs/releases/1.136/Build/Cesium/Widgets/widgets.css';
        document.head.appendChild(css);

        // Load JS
        const script = document.createElement('script');
        script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.136/Build/Cesium/Cesium.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Cesium'));
        document.head.appendChild(script);
    });
}

async function loadFlightAnimation() {
    if (!viewer || !fixes.value || fixes.value.length === 0) return;

    const Cesium = window.Cesium;

    // Convert IGC to CZML with paraglider icon
    const czml = igcToCzml(fixes.value, {
        name: 'Paragliding Flight',
        trailColor: [245, 176, 39, 255],
        trailWidth: 3,
        multiplier: speedMultiplier.value,
        billboardImage: '/paraglider-icon3.svg',
        billboardScale: 0.8
    });

    if (!czml) {
        console.error('Failed to convert IGC to CZML');
        return;
    }

    // Load CZML
    viewer.dataSources.removeAll();
    viewer.entities.removeAll();

    const dataSource = new Cesium.CzmlDataSource();
    const loadedDataSource = await dataSource.load(czml);
    viewer.dataSources.add(loadedDataSource);

    // Ensure camera isn't locked by a previous lookAt
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

    // Apply the dataSource clock to the viewer
    if (loadedDataSource.clock) {
        viewer.clock.startTime = loadedDataSource.clock.startTime.clone();
        viewer.clock.stopTime = loadedDataSource.clock.stopTime.clone();
        viewer.clock.clockRange = loadedDataSource.clock.clockRange;
        viewer.clock.multiplier = speedMultiplier.value;
    }

    // Calculate total duration for slider
    totalDurationSeconds = Cesium.JulianDate.secondsDifference(
        viewer.clock.stopTime,
        viewer.clock.startTime
    );
    sliderMax.value = totalDurationSeconds;
    sliderValue.value = 0;

    // Get the paraglider entity - fly to it first, then enable tracking
    paragliderEntity = loadedDataSource.entities.getById('paraglider');
    if (paragliderEntity) {
        // Define the desired viewFrom offset (east, north, up) in meters
        const viewFromOffset = new Cesium.Cartesian3(-1500, -2000, 200);
        paragliderEntity.viewFrom = viewFromOffset;

        // First fly to the entity with a proper orientation (roll=0, horizon level)
        await viewer.flyTo(paragliderEntity, {
            duration: 1.5,
            offset: new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(45),   // heading: look from the side
                Cesium.Math.toRadians(-30),  // pitch: gentle downward angle
                4000                          // range: distance from entity
            )
        });

        // Then enable tracking — camera smoothly transitions from current position
        viewer.trackedEntity = paragliderEntity;

        // Reset to start
        isFullView.value = false;
        viewer.clock.currentTime = Cesium.JulianDate.clone(viewer.clock.startTime);
        currentFixIndex.value = 0;
    }

    // Auto-start playback
    viewer.clock.shouldAnimate = true;
    isPlaying.value = true;

    // Load ground altitudes
    loadGroundAltitudes();
}

async function loadGroundAltitudes() {
    if (!props.flightData) return

    // Check if we already have it in props
    if (props.flightData.anaTrack?.elevation && props.flightData.anaTrack.elevation.length > 0) {
        groundAltitudes.value = props.flightData.anaTrack.elevation
        return
    }

    const fixes = props.flightData.decodedIgc?.fixes
    if (!fixes) return

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

function setupCameraMode(entity) {
    if (!viewer) return;

    if (cameraMode.value === 'follow' && entity) {
        viewer.trackedEntity = entity;
    } else {
        viewer.trackedEntity = undefined;
    }
}

function onClockTick(clock) {
    if (!viewer || !fixes.value || fixes.value.length === 0) return;

    const Cesium = window.Cesium;
    const currentTime = clock.currentTime;
    const timestamp = julianDateToTimestamp(currentTime);

    // Find the current fix index
    const idx = getFixIndexForTimestamp(fixes.value, timestamp);
    currentFixIndex.value = idx;

    // Update hover info
    updateHoverInfo(idx);

    // Update slider position (only if not being dragged)
    if (!isDraggingSlider.value) {
        const elapsed = Cesium.JulianDate.secondsDifference(currentTime, viewer.clock.startTime);
        sliderValue.value = Math.max(0, Math.min(sliderMax.value, elapsed));
    }

    // Update playing state
    isPlaying.value = viewer.clock.shouldAnimate;
}

// --- Slider functions ---

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function onSliderChange(val) {
    if (!viewer || !isDraggingSlider.value) return;
    const Cesium = window.Cesium;
    const newTime = Cesium.JulianDate.addSeconds(
        viewer.clock.startTime,
        val,
        new Cesium.JulianDate()
    );
    viewer.clock.currentTime = newTime;
}

function onSliderDragStart() {
    isDraggingSlider.value = true;
    wasPlayingBeforeDrag.value = isPlaying.value;
    if (viewer) {
        viewer.clock.shouldAnimate = false;
        isPlaying.value = false;
    }
}

function onSliderDragEnd() {
    isDraggingSlider.value = false;
    if (viewer && wasPlayingBeforeDrag.value) {
        viewer.clock.shouldAnimate = true;
        isPlaying.value = true;
    }
}

// --- Playback controls ---

function updateHoverInfo(idx) {
    if (idx < 0 || idx >= fixes.value.length) return;

    const fix = fixes.value[idx];
    const altitude = fix.gpsAltitude || 0;

    let groundAlt = 'N/A';
    let hground = 'N/A';
    if (groundAltitudes.value && groundAltitudes.value[idx] != null) {
        groundAlt = groundAltitudes.value[idx].toFixed(0);
        hground = (altitude - groundAltitudes.value[idx]).toFixed(0);
    }

    // Use pre-calculated smoothed values from decoder
    const vario = props.flightData?.decodedIgc?.vz?.[idx] || 0;
    const speed = props.flightData?.decodedIgc?.speed?.[idx] || 0;

    hoverInfo.value = `
        <span style="color:#1a6dcc;font-weight:bold;">🕒 ${new Date(fix.timestamp).toLocaleTimeString()}</span>
        &nbsp;|&nbsp;
        <span style="color:#1976d2;">⛰️ ${altitude.toFixed(0)} m</span>
        &nbsp;|&nbsp;
        <span style="color:#5d4037;">🟫 Sol ${groundAlt} m</span>
        &nbsp;|&nbsp;
        <span style="color:#6d4c41;">⬇️ ${hground} m</span>
        &nbsp;|&nbsp;
        <span style="color:#388e3c;">↕️ ${vario.toFixed(2)} m/s</span>
        &nbsp;|&nbsp;
        <span style="color:#e65100;">➡️ ${speed.toFixed(0)} km/h</span>
    `;
}

function togglePlayback() {
    if (!viewer) return;

    // If we're in full view mode, switch to replay mode first
    if (isFullView.value) {
        isFullView.value = false;
        viewer.clock.currentTime = viewer.clock.startTime;
        currentFixIndex.value = 0;
        sliderValue.value = 0;

        // Restore follow mode if active
        setupCameraMode(paragliderEntity);
    }

    viewer.clock.shouldAnimate = !viewer.clock.shouldAnimate;
    isPlaying.value = viewer.clock.shouldAnimate;
}

function restartAnimation() {
    if (!viewer) return;
    viewer.clock.currentTime = viewer.clock.startTime;
    currentFixIndex.value = 0;
    sliderValue.value = 0;
}

function toggleFullView() {
    if (!viewer || !fixes.value || fixes.value.length === 0) return;

    const Cesium = window.Cesium;
    isFullView.value = !isFullView.value;

    // Unlock camera first
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

    if (isFullView.value) {
        // Pause and show complete track
        viewer.clock.shouldAnimate = false;
        isPlaying.value = false;
        viewer.clock.currentTime = viewer.clock.stopTime;
        currentFixIndex.value = fixes.value.length - 1;
        sliderValue.value = sliderMax.value;
        viewer.trackedEntity = undefined;

        // Zoom out to see entire track
        zoomToFullTrack(Cesium);
    } else {
        // Switch back to replay mode
        viewer.clock.currentTime = viewer.clock.startTime;
        currentFixIndex.value = 0;
        sliderValue.value = 0;

        // Restore follow mode if active
        setupCameraMode(paragliderEntity);

        viewer.clock.shouldAnimate = true;
        isPlaying.value = true;
    }
}

function zoomToFullTrack(Cesium) {
    if (!paragliderEntity) return;

    viewer.flyTo(paragliderEntity, {
        duration: 1.0,
        offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(0),
            Cesium.Math.toRadians(-60),
            20000
        )
    });
}

function onGraphCursorChanged(data) {
    // When user hovers on graph, update info but don't change animation time
    const idx = data.index;

    let groundAlt = 'N/A';
    let hground = 'N/A';
    if (groundAltitudes.value && groundAltitudes.value[idx] != null) {
        groundAlt = groundAltitudes.value[idx].toFixed(0);
        hground = (data.altitude - groundAltitudes.value[idx]).toFixed(0);
    }

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
    `;
}

function onGraphClick(idx) {
    // Jump animation to this point when user clicks on graph
    if (!viewer || !fixes.value || idx < 0 || idx >= fixes.value.length) return;

    const Cesium = window.Cesium;
    const fix = fixes.value[idx];
    const julianDate = Cesium.JulianDate.fromDate(new Date(fix.timestamp));
    viewer.clock.currentTime = julianDate;
    currentFixIndex.value = idx;
}

// Watch speed multiplier changes
watch(speedMultiplier, (newSpeed) => {
    if (viewer) {
        viewer.clock.multiplier = newSpeed;
    }
});

// Watch camera mode changes
watch(cameraMode, (newMode) => {
    if (!viewer) return;
    if (newMode === 'follow' && paragliderEntity) {
        viewer.trackedEntity = paragliderEntity;
    } else {
        viewer.trackedEntity = undefined;
    }
});

// Watch terrain provider changes
watch(terrainProvider, async (newTerrain) => {
    if (!viewer) return;
    const Cesium = window.Cesium;
    try {
        viewer.terrainProvider = await getTerrainProvider(newTerrain);
    } catch (e) {
        console.error('Error switching terrain provider:', e);
    }
});

watch(() => props.modelValue, async (val) => {
    if (val) {
        await nextTick();
        setTimeout(() => {
            initCesium();
        }, 100);
    }
});

watch(() => props.flightData, async () => {
    if (viewer && fixes.value && fixes.value.length > 0) {
        await loadFlightAnimation();
    }
}, { deep: true });

function close() {
    isFullView.value = false;
    currentFixIndex.value = 0;
    cameraMode.value = 'follow';
    sliderValue.value = 0;
    paragliderEntity = null;
    dialog.value = false;
    emit('close');
}

onBeforeUnmount(() => {
    if (clockTickListener) {
        clockTickListener();
        clockTickListener = null;
    }
    if (viewer) {
        viewer.destroy();
        viewer = null;
    }
});
</script>

<style scoped>
.cesium-replay-card {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.terrain-toggle,
.speed-toggle,
.camera-toggle {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}

.content-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
}

.cesium-container {
    flex: 1;
    width: 100%;
    min-height: 0;
}

/* Custom replay bar */
.replay-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    background: #263238;
    color: #fff;
    flex-shrink: 0;
    min-height: 44px;
}

.replay-bar .speed-toggle {
    background: rgba(255, 255, 255, 0.08);
}

.replay-time {
    font-variant-numeric: tabular-nums;
    font-size: 0.85em;
    color: #b0bec5;
    min-width: 48px;
    text-align: center;
    white-space: nowrap;
}

.replay-time--total {
    color: #78909c;
}

.replay-slider {
    flex: 1;
    margin: 0 4px;
}

.replay-slider :deep(.v-slider-thumb__label) {
    background: #1976d2;
    font-size: 0.75em;
    min-width: 48px;
}

.replay-slider :deep(.v-slider-track__fill) {
    background: #1976d2;
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

/* Hide Cesium branding/credits */
:deep(.cesium-viewer .cesium-widget-credits) {
    display: none !important;
}

:deep(.cesium-viewer-bottom) {
    display: none !important;
}
</style>
