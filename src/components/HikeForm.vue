<template>
    <v-card class="hike-form-card">
        <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-hiking</v-icon>
            {{ isEditing ? $gettext('Edit hike') : $gettext('New hike') }}
        </v-card-title>

        <v-card-text>
            <v-row>
                <!-- Left Panel: Form Fields -->
                <v-col cols="12" md="5">

                    <!-- Row 1: GPS File selector -->
                    <v-row dense class="mb-2">
                        <v-col cols="8">
                            <div class="field-label">{{ $gettext('GPS track (IGC or GPX)') }}</div>
                            <div class="gps-file-row">
                                <v-text-field v-model="gpsFileName" :label="$gettext('No file selected')"
                                    density="compact" variant="outlined" hide-details readonly class="flex-grow-1" />
                                <v-btn color="primary" variant="flat" size="small" class="ml-2"
                                    @click="triggerFileInput">
                                    <v-icon start>mdi-file-import</v-icon>
                                    {{ $gettext('Import') }}
                                </v-btn>
                                <input ref="fileInput" type="file" accept=".igc,.gpx" style="display:none"
                                    @change="onFileSelected" />
                            </div>
                            <div v-if="gpsStatus" class="gps-status mt-1" :class="gpsStatusType">
                                {{ gpsStatus }}
                            </div>
                        </v-col>
                    </v-row>

                    <!-- Row 2: Name -->
                    <v-row dense class="mt-2">
                        <v-col cols="8">
                            <v-text-field v-model="form.nom" :label="$gettext('Name')" density="compact"
                                variant="outlined" hide-details class="uppercase-input"
                                @input="forceUppercase('nom')" />
                        </v-col>
                    </v-row>

                    <!-- Row 3: Start -->
                    <v-row dense class="mt-2">
                        <v-col cols="8">
                            <v-text-field v-model="form.depart" :label="$gettext('Start')" density="compact"
                                variant="outlined" hide-details class="uppercase-input"
                                @input="forceUppercase('depart')" />
                        </v-col>
                    </v-row>

                    <!-- Row 4: End -->
                    <v-row dense class="mt-2">
                        <v-col cols="8">
                            <v-text-field v-model="form.arrivee" :label="$gettext('End')" density="compact"
                                variant="outlined" hide-details class="uppercase-input"
                                @input="forceUppercase('arrivee')" />
                        </v-col>
                    </v-row>

                    <!-- Row 5: Elevation gain -->
                    <v-row dense class="mt-2">
                        <v-col cols="3">
                            <v-text-field v-model.number="form.deniv" :label="$gettext('Elevation gain') + ' (m)'"
                                density="compact" variant="outlined" hide-details type="number" min="0" />
                        </v-col>
                    </v-row>

                    <!-- Row 6: Duration -->
                    <v-row dense class="mt-2">
                        <v-col cols="12">
                            <div class="field-label">{{ $gettext('Duration') }}</div>
                            <div class="duration-inputs">
                                <v-text-field v-model.number="form.durationHours" type="number" variant="outlined"
                                    density="compact" hide-details min="0" max="99" suffix="h" class="duration-field" />
                                <v-text-field v-model.number="form.durationMinutes" type="number" variant="outlined"
                                    density="compact" hide-details min="0" max="59" suffix="mn"
                                    class="duration-field" />
                            </div>
                        </v-col>
                    </v-row>

                    <!-- Row 7: Starting coordinates -->
                    <v-row dense class="mt-3 align-center">
                        <v-col cols="12">
                            <div class="field-label">{{ $gettext('Starting coordinates') }}</div>
                        </v-col>
                        <v-col cols="3">
                            <v-text-field v-model="form.latDepart" :label="$gettext('Latitude')" density="compact"
                                variant="outlined" hide-details readonly />
                        </v-col>
                        <v-col cols="3">
                            <v-text-field v-model="form.longDepart" :label="$gettext('Longitude')" density="compact"
                                variant="outlined" hide-details readonly />
                        </v-col>
                        <v-col cols="1">
                            <v-btn :color="mapClickMode === 'start' ? 'warning' : 'primary'" variant="flat" size="small"
                                @click="activateMapClick('start')" :title="$gettext('Click on map to set start point')">
                                <v-icon>mdi-map-marker</v-icon>
                            </v-btn>
                        </v-col>
                    </v-row>

                    <!-- Row 8: End coordinates -->
                    <v-row dense class="mt-2 align-center">
                        <v-col cols="12">
                            <div class="field-label">{{ $gettext('End coordinates') }}</div>
                        </v-col>
                        <v-col cols="3">
                            <v-text-field v-model="form.latFin" :label="$gettext('Latitude')" density="compact"
                                variant="outlined" hide-details readonly />
                        </v-col>
                        <v-col cols="3">
                            <v-text-field v-model="form.longFin" :label="$gettext('Longitude')" density="compact"
                                variant="outlined" hide-details readonly />
                        </v-col>
                        <v-col cols="1">
                            <v-btn :color="mapClickMode === 'end' ? 'warning' : 'primary'" variant="flat" size="small"
                                @click="activateMapClick('end')" :title="$gettext('Click on map to set end point')">
                                <v-icon>mdi-map-marker-check</v-icon>
                            </v-btn>
                        </v-col>
                    </v-row>

                    <!-- Row 9: Actions -->
                    <v-row class="mt-4" justify="center">
                        <v-col cols="4">
                            <v-btn color="error" size="small" variant="flat" @click="onCancel">
                                {{ $gettext('Cancel') }}
                            </v-btn>
                        </v-col>
                        <v-col cols="4">
                            <v-btn color="success" size="small" variant="flat" @click="onSubmit">
                                {{ $gettext('OK') }}
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-col>

                <!-- Right Panel: Map -->
                <v-col cols="12" md="7">
                    <div ref="mapContainer" class="map-container"></div>
                    <div v-if="mapClickMode" class="map-info-banner">
                        <v-chip :color="mapClickMode === 'start' ? 'warning' : 'success'" size="small" variant="flat">
                            <v-icon start size="small">mdi-cursor-default-click</v-icon>
                            {{ mapClickMode === "start" ? $gettext("Click map to set starting point") :
                                $gettext("Click map to set end point") }}
                        </v-chip>
                    </div>
                    <div v-else class="map-info-banner">
                        <v-chip color="secondary" size="small" variant="flat">
                            <v-icon start size="small">mdi-map</v-icon>
                            {{ $gettext('Use Map buttons to set coordinates by clicking on map') }}
                        </v-chip>
                    </div>
                </v-col>
            </v-row>
        </v-card-text>

        <!-- Validation Error Snackbar -->
        <v-snackbar v-model="showError" color="error" :timeout="3000">
            {{ errorMessage }}
        </v-snackbar>
    </v-card>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useGettext } from 'vue3-gettext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createBaseMaps, getDefaultLayerName } from '@/js/leaflet/tiles.js';
import { parseGPX } from '@/js/gpx/gpx-parser.js';
import { gpxToIgc } from '@/js/gpx/gpx-to-igc.js';
import { igcDecoding } from '@/js/igc/igc-decoder.js';

const { $gettext } = useGettext();

// Props
const props = defineProps({
    hike: {
        type: Object,
        default: null
    }
});

// Emits
const emit = defineEmits(['submit', 'cancel']);

// Default coordinates (Lake Annecy)
const DEFAULT_LAT = 45.835775;
const DEFAULT_LONG = 6.205428;

// Map refs
const mapContainer = ref(null);
const fileInput = ref(null);
let map = null;
let startMarker = null;
let endMarker = null;
let trackLayer = null;

// Map click mode: null | 'start' | 'end'
const mapClickMode = ref(null);

// GPS file state
const gpsFileName = ref('');
const gpsStatus = ref('');
const gpsStatusType = ref('');

// Form state
const form = reactive({
    id: 0,
    nom: '',
    depart: '',
    arrivee: '',
    deniv: 0,
    durationHours: 0,
    durationMinutes: 0,
    latDepart: '',
    longDepart: '',
    latFin: '',
    longFin: '',
    track: null  // IGC string or null
});

// UI state
const showError = ref(false);
const errorMessage = ref('');
const isEditing = ref(false);

// Leaflet icons for start/end
const startIcon = L.divIcon({
    html: '<div style="background:#4CAF50;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,0.5)"></div>',
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});
const endIcon = L.divIcon({
    html: '<div style="background:#F44336;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,0.5)"></div>',
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

function forceUppercase(field) {
    form[field] = form[field].toUpperCase();
}

function triggerFileInput() {
    fileInput.value?.click();
}

/**
 * Handle GPS file selection (IGC or GPX)
 */
async function onFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    gpsFileName.value = file.name;
    gpsStatus.value = $gettext('Reading file...');
    gpsStatusType.value = 'status-info';

    const ext = file.name.split('.').pop().toLowerCase();
    const text = await file.text();

    if (ext === 'igc') {
        await processIGC(text);
    } else if (ext === 'gpx') {
        await processGPX(text);
    } else {
        gpsStatus.value = $gettext('Unsupported format (use IGC or GPX)');
        gpsStatusType.value = 'status-error';
    }

    // Reset input so same file can be re-selected
    event.target.value = '';
}

/**
 * Process IGC file content
 */
async function processIGC(igcText) {
    try {
        const result = await igcDecoding(igcText);
        if (!result.success) {
            gpsStatus.value = $gettext('IGC decoding error: ') + result.message;
            gpsStatusType.value = 'status-error';
            return;
        }

        const decoded = result.data;
        form.track = igcText;

        // First and last fixes
        const fixes = decoded.fixes;
        if (fixes.length >= 2) {
            form.latDepart = fixes[0].latitude.toFixed(5);
            form.longDepart = fixes[0].longitude.toFixed(5);
            form.latFin = fixes[fixes.length - 1].latitude.toFixed(5);
            form.longFin = fixes[fixes.length - 1].longitude.toFixed(5);
        }

        // Duration from stat
        const totalSecs = decoded.stat.duration || 0;
        form.durationHours = Math.floor(totalSecs / 3600);
        form.durationMinutes = Math.floor((totalSecs % 3600) / 60);

        // Elevation gain: maxalt - minialt (GPS)
        const maxAlt = decoded.stat.maxalt?.gps || 0;
        const minAlt = decoded.stat.minialt?.gps || 0;
        form.deniv = Math.max(0, Math.round(maxAlt - minAlt));

        // Display track on map
        await displayTrackGeoJSON(decoded.GeoJSON);

        gpsStatus.value = `IGC: ${fixes.length} ${$gettext('points')}`;
        gpsStatusType.value = 'status-ok';
    } catch (err) {
        gpsStatus.value = $gettext('IGC read error: ') + err.message;
        gpsStatusType.value = 'status-error';
    }
}

/**
 * Process GPX file content – converts to IGC
 */
async function processGPX(gpxText) {
    try {
        const gpxData = parseGPX(gpxText);
        if (!gpxData.success) {
            gpsStatus.value = $gettext('GPX parsing error: ') + gpxData.message;
            gpsStatusType.value = 'status-error';
            return;
        }

        const igcResult = gpxToIgc(gpxData);
        if (!igcResult.success) {
            gpsStatus.value = $gettext('GPX→IGC conversion error: ') + igcResult.message;
            gpsStatusType.value = 'status-error';
            return;
        }

        form.track = igcResult.igcString;

        // Extract coordinates from GPX data
        const allPoints = gpxData.tracks.flatMap(t => t.points);
        if (allPoints.length >= 2) {
            form.latDepart = allPoints[0].lat.toFixed(5);
            form.longDepart = allPoints[0].lon.toFixed(5);
            form.latFin = allPoints[allPoints.length - 1].lat.toFixed(5);
            form.longFin = allPoints[allPoints.length - 1].lon.toFixed(5);
        }

        // Duration from first/last timestamp
        const firstTime = allPoints[0]?.time;
        const lastTime = allPoints[allPoints.length - 1]?.time;
        if (firstTime && lastTime) {
            const totalSecs = Math.round((lastTime - firstTime) / 1000);
            form.durationHours = Math.floor(totalSecs / 3600);
            form.durationMinutes = Math.floor((totalSecs % 3600) / 60);
        }

        // Elevation gain: max ele - min ele
        const eles = allPoints.map(p => p.ele).filter(e => e !== null && !isNaN(e));
        if (eles.length > 0) {
            form.deniv = Math.max(0, Math.round(Math.max(...eles) - Math.min(...eles)));
        }

        // Build GeoJSON from GPX to display on map
        const coords = allPoints.map(p => [p.lon, p.lat, p.ele || 0]);
        const geoJson = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: coords }
            }]
        };
        await displayTrackGeoJSON(geoJson);

        gpsStatus.value = `GPX→IGC: ${igcResult.nbPoints} ${$gettext('points')}`;
        gpsStatusType.value = 'status-ok';
    } catch (err) {
        gpsStatus.value = $gettext('GPX read error: ') + err.message;
        gpsStatusType.value = 'status-error';
    }
}

/**
 * Display a GeoJSON track on the map
 */
async function displayTrackGeoJSON(geoJson) {
    if (!map) return;
    await nextTick();

    // Clear existing
    clearMapLayers();

    trackLayer = L.geoJSON(geoJson, {
        style: { color: '#3388ff', weight: 3, opacity: 0.8 }
    }).addTo(map);

    // Find first/last coords
    const feature = geoJson.features?.[0];
    if (feature?.geometry?.coordinates?.length > 0) {
        const coords = feature.geometry.coordinates;
        const startPt = coords[0];
        const endPt = coords[coords.length - 1];
        startMarker = L.marker([startPt[1], startPt[0]], { icon: startIcon }).addTo(map);
        endMarker = L.marker([endPt[1], endPt[0]], { icon: endIcon }).addTo(map);
    }

    // Fit bounds
    try {
        const bounds = trackLayer.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    } catch (_) { /* ignore */ }
}

/**
 * Clear all map layers
 */
function clearMapLayers() {
    if (trackLayer) { map.removeLayer(trackLayer); trackLayer = null; }
    if (startMarker) { map.removeLayer(startMarker); startMarker = null; }
    if (endMarker) { map.removeLayer(endMarker); endMarker = null; }
}

/**
 * Activate map-click mode for start or end coordinates
 */
function activateMapClick(mode) {
    if (mapClickMode.value === mode) {
        mapClickMode.value = null;
    } else {
        mapClickMode.value = mode;
    }
}

/**
 * Handle map click for coordinate picking
 */
function onMapClick(e) {
    if (!mapClickMode.value) return;

    const lat = e.latlng.lat.toFixed(5);
    const lng = e.latlng.lng.toFixed(5);

    if (mapClickMode.value === 'start') {
        form.latDepart = lat;
        form.longDepart = lng;
        // Update or create start marker
        if (startMarker) map.removeLayer(startMarker);
        startMarker = L.marker([e.latlng.lat, e.latlng.lng], { icon: startIcon }).addTo(map);
    } else {
        form.latFin = lat;
        form.longFin = lng;
        if (endMarker) map.removeLayer(endMarker);
        endMarker = L.marker([e.latlng.lat, e.latlng.lng], { icon: endIcon }).addTo(map);
    }

    mapClickMode.value = null;
}

/**
 * Initialize the Leaflet map
 */
function initMap() {
    if (!mapContainer.value) return;

    map = L.map(mapContainer.value).setView([DEFAULT_LAT, DEFAULT_LONG], 10);

    const mapBaseLayers = createBaseMaps();
    mapBaseLayers[getDefaultLayerName()].addTo(map);
    L.control.layers(mapBaseLayers, null, { collapsed: false }).addTo(map);

    map.on('click', onMapClick);
}

/**
 * Validate form
 */
function validateForm() {
    if (!form.nom || form.nom.trim() === '') {
        errorMessage.value = $gettext('Name must not be null');
        showError.value = true;
        return false;
    }
    return true;
}

/**
 * Parse duration to seconds and formatted string
 */
function parseDuration() {
    const hours = Math.max(0, form.durationHours || 0);
    const minutes = Math.min(59, Math.max(0, form.durationMinutes || 0));
    const totalSeconds = hours * 3600 + minutes * 60;
    const strDuree = `${hours}h${String(minutes).padStart(2, '0')}mn`;
    return { seconds: totalSeconds, formatted: strDuree };
}

/**
 * Submit form
 */
function onSubmit() {
    if (!validateForm()) return;

    const duration = parseDuration();
    const hikeData = {
        id: form.id,
        nom: form.nom.toUpperCase(),
        depart: form.depart.toUpperCase(),
        arrivee: form.arrivee.toUpperCase(),
        deniv: form.deniv || 0,
        sDuree: duration.formatted,
        duree: duration.seconds,
        track: form.track || null,
        latDepart: parseFloat(form.latDepart) || 0,
        longDepart: parseFloat(form.longDepart) || 0,
        latFin: parseFloat(form.latFin) || 0,
        longFin: parseFloat(form.longFin) || 0,
        newHike: form.id === 0
    };

    emit('submit', hikeData);
}

function onCancel() {
    emit('cancel');
}

/**
 * Initialize form with hike data or defaults
 */
function initForm() {
    if (props.hike && props.hike.id > 0) {
        isEditing.value = true;
        form.id = props.hike.id;
        form.nom = props.hike.nom || '';
        form.depart = props.hike.depart || '';
        form.arrivee = props.hike.arrivee || '';
        form.deniv = props.hike.deniv || 0;
        form.latDepart = props.hike.latDepart ? props.hike.latDepart.toString() : '';
        form.longDepart = props.hike.longDepart ? props.hike.longDepart.toString() : '';
        form.latFin = props.hike.latFin ? props.hike.latFin.toString() : '';
        form.longFin = props.hike.longFin ? props.hike.longFin.toString() : '';
        form.track = props.hike.track || null;

        // Parse sDuree (e.g. "2h30mn")
        if (props.hike.sDuree) {
            const match = props.hike.sDuree.match(/(\d+)h(\d+)mn/);
            if (match) {
                form.durationHours = parseInt(match[1]);
                form.durationMinutes = parseInt(match[2]);
            }
        }

        if (props.hike.track) {
            gpsFileName.value = $gettext('Track loaded');
        }
    } else {
        isEditing.value = false;
        form.id = 0;
        form.nom = '';
        form.depart = '';
        form.arrivee = '';
        form.deniv = 0;
        form.durationHours = 0;
        form.durationMinutes = 0;
        form.latDepart = '';
        form.longDepart = '';
        form.latFin = '';
        form.longFin = '';
        form.track = null;
        gpsFileName.value = '';
        gpsStatus.value = '';
    }
}

watch(() => props.hike, () => {
    initForm();
}, { deep: true });

onMounted(() => {
    initForm();
    nextTick(() => {
        initMap();
        // If editing and has track, display it
        if (props.hike?.track) {
            igcDecoding(props.hike.track).then(result => {
                if (result.success) {
                    displayTrackGeoJSON(result.data.GeoJSON);
                }
            }).catch(() => { /* ignore */ });
        }
    });
});

onBeforeUnmount(() => {
    if (map) {
        map.remove();
        map = null;
    }
});
</script>

<style scoped>
.hike-form-card {
    width: min(1100px, 90vw);
    margin: 0 auto;
}

.map-container {
    height: 560px;
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(var(--v-border-color), 0.12);
    cursor: crosshair;
}

.map-info-banner {
    display: flex;
    justify-content: center;
    margin-top: 8px;
}

.uppercase-input :deep(input) {
    text-transform: uppercase;
}

.field-label {
    font-size: 0.85em;
    font-weight: 600;
    color: #555;
    margin-bottom: 4px;
}

.gps-file-row {
    display: flex;
    align-items: center;
}

.gps-status {
    font-size: 0.8em;
    padding: 2px 6px;
    border-radius: 4px;
}

.status-ok {
    color: #388e3c;
    background: #e8f5e9;
}

.status-error {
    color: #c62828;
    background: #ffebee;
}

.status-info {
    color: #1565c0;
    background: #e3f2fd;
}

.duration-inputs {
    display: flex;
    gap: 8px;
}

.duration-field {
    flex: 1;
    max-width: 110px;
}

.duration-field :deep(input) {
    text-align: center;
}
</style>
