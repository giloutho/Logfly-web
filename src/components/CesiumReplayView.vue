<template>
    <v-dialog v-model="dialog" fullscreen transition="dialog-bottom-transition">
        <v-card class="cesium-replay-card">
            <!-- Toolbar -->
            <v-toolbar color="primary" density="compact">
                <v-toolbar-title>{{ $gettext('3D Flight Replay') }}</v-toolbar-title>
                <v-spacer></v-spacer>

                <!-- Playback controls -->
                <div class="playback-controls">
                    <v-btn icon size="small" @click="togglePlayback" :title="isPlaying ? 'Pause' : 'Play'">
                        <v-icon>{{ isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                    </v-btn>
                    <v-btn icon size="small" @click="restartAnimation" title="Restart">
                        <v-icon>mdi-restart</v-icon>
                    </v-btn>
                    <v-btn-toggle v-model="speedMultiplier" mandatory density="compact" class="speed-toggle">
                        <v-btn :value="1" size="small">x1</v-btn>
                        <v-btn :value="5" size="small">x5</v-btn>
                        <v-btn :value="10" size="small">x10</v-btn>
                        <v-btn :value="30" size="small">x30</v-btn>
                    </v-btn-toggle>
                </div>

                <v-divider vertical class="mx-2"></v-divider>

                <!-- Camera mode -->
                <v-btn-toggle v-model="cameraMode" mandatory density="compact" class="camera-toggle">
                    <v-btn value="side" size="small" title="Side view">
                        <v-icon>mdi-eye-outline</v-icon>
                    </v-btn>
                    <v-btn value="follow" size="small" title="Follow view">
                        <v-icon>mdi-airplane</v-icon>
                    </v-btn>
                    <v-btn value="free" size="small" title="Free camera">
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

                <!-- Graph info bar -->
                <div class="graph-info">
                    <span v-if="hoverInfo" v-html="hoverInfo"></span>
                    <span v-else>{{ $gettext('Hover over the graph to see details') }}</span>
                </div>

                <!-- Graph section -->
                <div class="graph-section">
                    <GraphUplot v-if="fixes && fixes.length > 0" :fixes="fixes" :groundAltitudes="groundAltitudes"
                        :height="150" :currentIndex="currentFixIndex"
                        :offsetUTC="flightData?.decodedIgc?.info?.offsetUTC || 0" @cursor-changed="onGraphCursorChanged"
                        @click-graph="onGraphClick" />
                </div>
            </div>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, toRaw } from 'vue';
import { useGettext } from "vue3-gettext";
import GraphUplot from './GraphUplot.vue';
import { igcToCzml, getFixIndexForTimestamp, julianDateToTimestamp } from '@/js/igc/igc-to-czml.js';

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
const speedMultiplier = ref(30);  // Default to x30
const cameraMode = ref('follow');  // Default to follow for free navigation
const currentFixIndex = ref(0);
const hoverInfo = ref('');
const groundAltitudes = ref(null);
const isFullView = ref(false);  // Start focused on takeoff

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

async function initCesium() {
    if (!cesiumContainer.value) return;

    // Dynamically load Cesium if not already loaded
    if (!window.Cesium) {
        await loadCesiumScripts();
    }

    const Cesium = window.Cesium;
    Cesium.Ion.defaultAccessToken = CESIUM_TOKEN;

    // Initialize viewer with animation and timeline
    viewer = new Cesium.Viewer(cesiumContainer.value, {
        terrainProvider: await Cesium.createWorldTerrainAsync(),
        animation: true,      // Show animation widget
        timeline: true,       // Show timeline widget
        baseLayerPicker: true,
        geocoder: false,
        homeButton: true,
        sceneModePicker: true,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,       // Disable InfoBox to avoid sandbox error
        shouldAnimate: false  // Start paused
    });

    // Load flight data if available
    if (fixes.value && fixes.value.length > 0) {
        loadFlightAnimation();
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

function loadFlightAnimation() {
    if (!viewer || !fixes.value || fixes.value.length === 0) return;

    const Cesium = window.Cesium;

    // Convert IGC to CZML with paraglider icon
    const czml = igcToCzml(fixes.value, {
        name: 'Paragliding Flight',
        trailColor: [245, 176, 39, 255],  // #F5B027 golden/orange
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
    viewer.entities.removeAll(); // Clear any previous static entities

    const dataSource = new Cesium.CzmlDataSource();
    dataSource.load(czml).then(() => {
        viewer.dataSources.add(dataSource);

        // Ensure camera isn't locked by a previous lookAt
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

        // Apply the dataSource clock to the viewer (this has the correct times from CZML)
        if (dataSource.clock) {
            viewer.clock.startTime = dataSource.clock.startTime;
            viewer.clock.stopTime = dataSource.clock.stopTime;
            viewer.clock.clockRange = dataSource.clock.clockRange;
            viewer.clock.multiplier = speedMultiplier.value;
        }

        // NOTE: We intentionally do NOT add a static polyline entity here.
        // In production builds, polyline geometry creation can trigger a Cesium worker NaN error
        // depending on the packed data passed to workers.

        // Get the paraglider entity
        const paraglider = dataSource.entities.getById('paraglider');
        if (paraglider) {
            // Don't auto-track entity - let user navigate freely
            viewer.trackedEntity = undefined;

            // Initial camera: focus on takeoff (first valid fix)
            const startFix = fixes.value[0];
            if (startFix) {
                const lon = Number(startFix.longitude);
                const lat = Number(startFix.latitude);
                const alt = Number(startFix.gpsAltitude ?? startFix.pressureAltitude ?? 0);

                // Start in replay mode focused on takeoff
                isFullView.value = false;
                viewer.clock.currentTime = Cesium.JulianDate.clone(viewer.clock.startTime);
                currentFixIndex.value = 0;

                if (Number.isFinite(lon) && Number.isFinite(lat)) {
                    const centerHeight = Number.isFinite(alt) ? Math.max(0, alt) : 0;
                    const center = Cesium.Cartesian3.fromDegrees(lon, lat, centerHeight);
                    const sphere = new Cesium.BoundingSphere(center, 1500);

                    // Larger range = less zoom (icon visible immediately)
                    viewer.camera.flyToBoundingSphere(sphere, {
                        duration: 1.2,
                        offset: new Cesium.HeadingPitchRange(
                            Cesium.Math.toRadians(0),
                            Cesium.Math.toRadians(-45),
                            9000
                        )
                    });
                }
            }
        }
    }).catch((error) => {
        console.error('Error loading CZML:', error);
    });

    // Load ground altitudes if available in flightData
    if (props.flightData?.anaTrack?.elevation) {
        groundAltitudes.value = props.flightData.anaTrack.elevation;
    }
}

function setupCameraMode(entity) {
    if (!viewer || !entity) return;

    const Cesium = window.Cesium;

    switch (cameraMode.value) {
        case 'side':
            // Side view - offset to the side and slightly above
            viewer.trackedEntity = entity;
            viewer.trackedEntity = undefined;

            // Use a custom camera update
            if (clockTickListener) {
                // Camera will be updated in onClockTick
            }
            break;

        case 'follow':
            // Standard follow mode
            viewer.trackedEntity = entity;
            break;

        case 'free':
            // Free camera - no tracking
            viewer.trackedEntity = undefined;
            break;
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

    // Update camera for side view mode
    if (cameraMode.value === 'side') {
        updateSideViewCamera(idx);
    }

    // Update playing state
    isPlaying.value = viewer.clock.shouldAnimate;
}

function updateSideViewCamera(idx) {
    if (!viewer || idx < 0 || idx >= fixes.value.length) return;

    const Cesium = window.Cesium;
    const fix = fixes.value[idx];

    // Calculate heading based on flight direction
    let heading = 0;
    if (idx > 0) {
        const prevFix = fixes.value[idx - 1];
        heading = Math.atan2(
            fix.longitude - prevFix.longitude,
            fix.latitude - prevFix.latitude
        );
    }

    // Position camera to the side
    const offset = 0.003; // ~300m offset
    const cameraPosition = Cesium.Cartesian3.fromDegrees(
        fix.longitude + Math.cos(heading + Math.PI / 2) * offset,
        fix.latitude + Math.sin(heading + Math.PI / 2) * offset,
        (fix.gpsAltitude || 1000) + 200
    );

    const targetPosition = Cesium.Cartesian3.fromDegrees(
        fix.longitude,
        fix.latitude,
        fix.gpsAltitude || 1000
    );

    // Smooth camera movement
    viewer.camera.lookAt(
        targetPosition,
        new Cesium.HeadingPitchRange(
            heading + Math.PI / 2,
            Cesium.Math.toRadians(-15),
            1500
        )
    );
}

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

    // Calculate vario and speed
    let vario = 0;
    let speed = 0;
    if (idx > 0) {
        const prevFix = fixes.value[idx - 1];
        const dt = (fix.timestamp - prevFix.timestamp) / 1000;
        if (dt > 0) {
            vario = ((fix.gpsAltitude || 0) - (prevFix.gpsAltitude || 0)) / dt;
            const dx = Math.sqrt(
                Math.pow((fix.latitude - prevFix.latitude) * 111000, 2) +
                Math.pow((fix.longitude - prevFix.longitude) * 111000 * Math.cos(fix.latitude * Math.PI / 180), 2)
            );
            speed = (dx / dt) * 3.6;
        }
    }

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

    const Cesium = window.Cesium;

    // If we're in full view mode and starting playback, switch to replay mode
    if (isFullView.value && !viewer.clock.shouldAnimate) {
        isFullView.value = false;
        // Reset to start
        viewer.clock.currentTime = viewer.clock.startTime;
        currentFixIndex.value = 0;
    }

    viewer.clock.shouldAnimate = !viewer.clock.shouldAnimate;
    isPlaying.value = viewer.clock.shouldAnimate;
}

function restartAnimation() {
    if (!viewer) return;
    const Cesium = window.Cesium;
    viewer.clock.currentTime = viewer.clock.startTime;
    currentFixIndex.value = 0;
}

function toggleFullView() {
    if (!viewer || !fixes.value || fixes.value.length === 0) return;

    const Cesium = window.Cesium;
    isFullView.value = !isFullView.value;

    // Unlock camera first (in case it was locked by lookAt in side view mode)
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

    if (isFullView.value) {
        // Switch to full track view: pause animation and jump to end to show complete trail
        viewer.clock.shouldAnimate = false;
        isPlaying.value = false;

        // Jump to end time - this will show the complete trail path
        viewer.clock.currentTime = viewer.clock.stopTime;
        currentFixIndex.value = fixes.value.length - 1;

        // Zoom out to see the entire track
        const dataSource = viewer.dataSources.get(0);
        if (dataSource) {
            const paraglider = dataSource.entities.getById('paraglider');
            if (paraglider) {
                viewer.flyTo(paraglider, {
                    duration: 1.0,
                    offset: new Cesium.HeadingPitchRange(
                        Cesium.Math.toRadians(0),
                        Cesium.Math.toRadians(-60),
                        15000  // Higher altitude to see full track
                    )
                });
            }
        }
    } else {
        // Switch back to replay mode - restart from beginning
        viewer.clock.currentTime = viewer.clock.startTime;
        currentFixIndex.value = 0;

        // Fly closer to the animated entity
        const dataSource = viewer.dataSources.get(0);
        if (dataSource) {
            const paraglider = dataSource.entities.getById('paraglider');
            if (paraglider) {
                viewer.flyTo(paraglider, {
                    duration: 1.5,
                    offset: new Cesium.HeadingPitchRange(
                        Cesium.Math.toRadians(-90),
                        Cesium.Math.toRadians(-30),
                        5000
                    )
                });
            }
        }
    }
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
watch(cameraMode, () => {
    if (viewer) {
        const dataSource = viewer.dataSources.get(0);
        if (dataSource) {
            const paraglider = dataSource.entities.getById('paraglider');
            setupCameraMode(paraglider);
        }
    }
});

watch(() => props.modelValue, async (val) => {
    if (val) {
        await nextTick();
        // Short delay to ensure container is rendered
        setTimeout(() => {
            initCesium();
        }, 100);
    }
});

watch(() => props.flightData, () => {
    if (viewer && fixes.value && fixes.value.length > 0) {
        loadFlightAnimation();
    }
}, { deep: true });

function close() {
    // Reset state for next open (start focused on takeoff)
    isFullView.value = false;
    currentFixIndex.value = 0;
    cameraMode.value = 'follow';
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

.playback-controls {
    display: flex;
    align-items: center;
    gap: 4px;
}

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
