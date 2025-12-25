<template>
    <v-dialog v-model="dialog" fullscreen transition="dialog-bottom-transition">
        <v-card class="cesium-view-card">
            <v-toolbar color="primary" density="compact">
                <v-toolbar-title>{{ $gettext('3D Flight View') }}</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn icon @click="close">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-toolbar>
            <div ref="cesiumContainer" class="cesium-container"></div>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useGettext } from "vue3-gettext";

const { $gettext } = useGettext();

const props = defineProps({
    modelValue: Boolean,
    gpxContent: {
        type: String,
        default: null
    }
});

const emit = defineEmits(['update:modelValue', 'close']);

const cesiumContainer = ref(null);
let viewer = null;
let gpxBlobUrl = null;

const dialog = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});

// Cesium Ion access token - use your own token for production
const CESIUM_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ZDdkZjczNS1jNTA2LTQzMmItYjBjYy0wYjFlOTc5NmU1MWQiLCJpZCI6MTAzNjg4LCJpYXQiOjE2NTk2Mzc5MjB9.QX13Kb7nisYi733uOKSEAbomggCjUF-9xv2l3efpmWs';

async function initCesium() {
    if (!cesiumContainer.value) return;

    // Dynamically load Cesium if not already loaded
    if (!window.Cesium) {
        await loadCesiumScripts();
    }

    const Cesium = window.Cesium;
    Cesium.Ion.defaultAccessToken = CESIUM_TOKEN;

    // Initialize viewer
    viewer = new Cesium.Viewer(cesiumContainer.value, {
        terrainProvider: Cesium.createWorldTerrain(),
        animation: false,
        timeline: false,
        baseLayerPicker: true,
        geocoder: false,
        homeButton: true,
        sceneModePicker: true,
        navigationHelpButton: false,
        fullscreenButton: false
    });

    // Load GPX if available
    if (props.gpxContent) {
        loadGpx(props.gpxContent);
    }
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
        css.href = 'https://cesium.com/downloads/cesiumjs/releases/1.96/Build/Cesium/Widgets/widgets.css';
        document.head.appendChild(css);

        // Load JS
        const script = document.createElement('script');
        script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.96/Build/Cesium/Cesium.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Cesium'));
        document.head.appendChild(script);
    });
}

function loadGpx(gpxContent) {
    if (!viewer || !gpxContent) return;

    const Cesium = window.Cesium;

    // Clean up previous blob URL
    if (gpxBlobUrl) {
        URL.revokeObjectURL(gpxBlobUrl);
    }

    // Create blob URL from GPX content
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    gpxBlobUrl = URL.createObjectURL(blob);

    // Load GPX
    viewer.dataSources.removeAll();
    viewer.dataSources.add(
        Cesium.GpxDataSource.load(gpxBlobUrl, {
            // clampToGround: false for flight paths (they should be above ground)
        })
    ).then((dataSource) => {
        viewer.flyTo(dataSource.entities);
    }).catch((error) => {
        console.error('Error loading GPX:', error);
    });
}

watch(() => props.modelValue, async (val) => {
    if (val) {
        await nextTick();
        // Short delay to ensure container is rendered
        setTimeout(() => {
            initCesium();
        }, 100);
    }
});

watch(() => props.gpxContent, (newContent) => {
    if (viewer && newContent) {
        loadGpx(newContent);
    }
});

function close() {
    dialog.value = false;
    emit('close');
}

onBeforeUnmount(() => {
    if (viewer) {
        viewer.destroy();
        viewer = null;
    }
    if (gpxBlobUrl) {
        URL.revokeObjectURL(gpxBlobUrl);
        gpxBlobUrl = null;
    }
});
</script>

<style scoped>
.cesium-view-card {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.cesium-container {
    flex: 1;
    width: 100%;
    min-height: 0;
}
</style>
