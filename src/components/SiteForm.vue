<template>
    <v-card class="site-form-card">
        <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-map-marker-plus</v-icon>
            {{ isEditing ? $gettext('Edit site') : $gettext('New site') }}
        </v-card-title>

        <v-card-text>
            <v-row>
                <!-- Left Panel: Form Fields -->
                <v-col cols="12" md="5">
                    <!-- Row 1: Site Type Radio -->
                    <v-row class="mb-2">
                        <v-col cols="12">
                            <v-radio-group v-model="form.siteType" inline hide-details density="compact">
                                <v-radio :label="$gettext('Take off')" value="D"></v-radio>
                                <v-radio :label="$gettext('Landing')" value="A"></v-radio>
                            </v-radio-group>
                        </v-col>
                    </v-row>

                    <!-- Row 2: Name -->
                    <v-row dense>
                        <v-col cols="12">
                            <v-text-field v-model="form.name" :label="$gettext('Name')" density="compact"
                                variant="outlined" hide-details class="uppercase-input" @input="forceUppercase('name')">
                            </v-text-field>
                        </v-col>
                    </v-row>

                    <!-- Row 3: Orientation, Altitude -->
                    <v-row dense class="mt-2">
                        <v-col cols="6">
                            <v-text-field v-model="form.orientation" :label="$gettext('Orientation')" density="compact"
                                variant="outlined" hide-details class="uppercase-input"
                                @input="forceUppercase('orientation')">
                            </v-text-field>
                        </v-col>
                        <v-col cols="6">
                            <v-text-field v-model="form.altitude" :label="$gettext('Alt') + ' (m)'" density="compact"
                                variant="outlined" hide-details type="number">
                            </v-text-field>
                        </v-col>
                    </v-row>

                    <!-- Row 4: ZIP code, City -->
                    <v-row dense class="mt-2">
                        <v-col cols="4">
                            <v-text-field v-model="form.zipCode" :label="$gettext('ZIP code')" density="compact"
                                variant="outlined" hide-details class="uppercase-input"
                                @input="forceUppercase('zipCode')">
                            </v-text-field>
                        </v-col>
                        <v-col cols="8">
                            <v-text-field v-model="form.city" :label="$gettext('City')" density="compact"
                                variant="outlined" hide-details class="uppercase-input" @input="forceUppercase('city')">
                            </v-text-field>
                        </v-col>
                    </v-row>

                    <!-- Row 5: Country -->
                    <v-row dense class="mt-2">
                        <v-col cols="12">
                            <v-text-field v-model="form.country" :label="$gettext('Country')" density="compact"
                                variant="outlined" hide-details class="uppercase-input"
                                @input="forceUppercase('country')">
                            </v-text-field>
                        </v-col>
                    </v-row>

                    <!-- Row 6: DD - Decimal Degrees -->
                    <v-row dense class="mt-3 align-center">
                        <v-col cols="2" class="text-center px-0">
                            <span class="font-weight-bold text-caption">DD</span>
                        </v-col>
                        <v-col cols="5">
                            <v-text-field v-model="coords.latDD" :label="$gettext('Latitude')" density="compact"
                                variant="outlined" hide-details :hint="'e.g [-]45.6789'" persistent-hint
                                @change="onLatDDChange">
                            </v-text-field>
                        </v-col>
                        <v-col cols="5">
                            <v-text-field v-model="coords.longDD" :label="$gettext('Longitude')" density="compact"
                                variant="outlined" hide-details :hint="'e.g [-]180.1234'" persistent-hint
                                @change="onLongDDChange">
                            </v-text-field>
                        </v-col>
                    </v-row>

                    <!-- Row 7: DMm - Degrees, decimal Minutes -->
                    <v-row dense class="mt-2 align-center">
                        <v-col cols="2" class="text-center px-0">
                            <span class="font-weight-bold text-caption">DMm</span>
                        </v-col>
                        <v-col cols="5">
                            <v-text-field v-model="coords.latDMm" :label="$gettext('Latitude')" density="compact"
                                variant="outlined" hide-details :hint="'e.g 45°34.9876N[S]'" persistent-hint
                                @change="onLatDMmChange">
                            </v-text-field>
                        </v-col>
                        <v-col cols="5">
                            <v-text-field v-model="coords.longDMm" :label="$gettext('Longitude')" density="compact"
                                variant="outlined" hide-details :hint="'e.g 120°27.1234W[E]'" persistent-hint
                                @change="onLongDMmChange">
                            </v-text-field>
                        </v-col>
                    </v-row>

                    <!-- Row 8: DMS - Degrees, Minutes, Seconds -->
                    <v-row dense class="mt-2 align-center">
                        <v-col cols="2" class="text-center px-0">
                            <span class="font-weight-bold text-caption">DMS</span>
                        </v-col>
                        <v-col cols="5">
                            <v-text-field v-model="coords.latDMS" :label="$gettext('Latitude')" density="compact"
                                variant="outlined" hide-details hint="e.g 08°51'29.76 N[S]" persistent-hint
                                @change="onLatDMSChange">
                            </v-text-field>
                        </v-col>
                        <v-col cols="5">
                            <v-text-field v-model="coords.longDMS" :label="$gettext('Longitude')" density="compact"
                                variant="outlined" hide-details hint="e.g 002°17'40.00 W[E]" persistent-hint
                                @change="onLongDMSChange">
                            </v-text-field>
                        </v-col>
                    </v-row>

                    <!-- Row 9: Comment -->
                    <v-row dense class="mt-3">
                        <v-col cols="12">
                            <v-textarea v-model="form.comment" :label="$gettext('Comment')" density="compact"
                                variant="outlined" hide-details rows="4">
                            </v-textarea>
                        </v-col>
                    </v-row>

                    <!-- Row 10: Actions -->
                    <v-row class="mt-4" justify="end">
                        <v-col cols="auto">
                            <v-btn color="error" variant="flat" @click="onCancel">
                                {{ $gettext('Cancel') }}
                            </v-btn>
                        </v-col>
                        <v-col cols="auto">
                            <v-btn color="success" variant="flat" @click="onSubmit">
                                {{ $gettext('OK') }}
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-col>

                <!-- Right Panel: Map -->
                <v-col cols="12" md="7">
                    <div ref="mapContainer" class="map-container"></div>
                    <div class="map-info-banner">
                        <v-chip color="secondary" size="small" variant="flat">
                            <v-icon start size="small">mdi-cursor-move</v-icon>
                            {{ $gettext('Move marker to change coordinates') }}
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
import { Position } from '@/js/geo/position.js';
import { baseMaps, osm } from '@/js/leaflet/tiles.js';

// Fix Leaflet default icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const { $gettext } = useGettext();

// Props
const props = defineProps({
    site: {
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
let map = null;
let marker = null;

// Position handler
const position = new Position();

// Form state
const form = reactive({
    id: 0,
    siteType: 'D', // D = Take Off, A = Landing
    name: '',
    orientation: '',
    altitude: '',
    zipCode: '',
    city: '',
    country: '',
    comment: ''
});

// Coordinates in all formats
const coords = reactive({
    latDD: '',
    longDD: '',
    latDMm: '',
    longDMm: '',
    latDMS: '',
    longDMS: ''
});

// UI state
const showError = ref(false);
const errorMessage = ref('');
const isEditing = ref(false);

/**
 * Force uppercase on form fields
 */
function forceUppercase(field) {
    form[field] = form[field].toUpperCase();
}

/**
 * Update all coordinate fields from Position object
 */
function updateCoordsFromPosition() {
    // DD format
    if (position.latitude < 0) {
        coords.latDD = '-' + Math.abs(position.latitude).toFixed(5);
    } else {
        coords.latDD = position.latitude.toFixed(5);
    }

    if (position.longitude < 0) {
        coords.longDD = '-' + Math.abs(position.longitude).toFixed(5);
    } else {
        coords.longDD = position.longitude.toFixed(5);
    }

    // DMm format
    coords.latDMm = position.getLatDMm();
    coords.longDMm = position.getLongDMm();

    // DMS format
    coords.latDMS = position.getLatDMS();
    coords.longDMS = position.getLongDMS();
}

/**
 * Update marker position on map
 */
function updateMarkerPosition() {
    if (marker && map) {
        marker.setLatLng([position.latitude, position.longitude]);
        map.panTo([position.latitude, position.longitude]);
    }
}

// ---- Coordinate Change Handlers ----

function onLatDDChange() {
    const value = parseFloat(coords.latDD);
    if (!isNaN(value) && value >= -90 && value <= 90) {
        position.setLatitudeDd(value.toFixed(5));
        updateCoordsFromPosition();
        updateMarkerPosition();
    }
}

function onLongDDChange() {
    const value = parseFloat(coords.longDD);
    if (!isNaN(value) && value >= -180 && value <= 180) {
        position.setLongitudeDd(value.toFixed(5));
        updateCoordsFromPosition();
        updateMarkerPosition();
    }
}

function onLatDMmChange() {
    // Parse format: 45°51.7800'N
    const match = coords.latDMm.match(/^(\d{1,2})°(\d{1,2}\.\d+)'([NS])$/i);
    if (match) {
        const deg = parseInt(match[1]);
        const min = parseFloat(match[2]);
        const hem = match[3].toUpperCase();
        position.setLatitudeDMm(deg, min, hem);
        updateCoordsFromPosition();
        updateMarkerPosition();
    }
}

function onLongDMmChange() {
    // Parse format: 6°10.3500'E
    const match = coords.longDMm.match(/^(\d{1,3})°(\d{1,2}\.\d+)'([EW])$/i);
    if (match) {
        const deg = parseInt(match[1]);
        const min = parseFloat(match[2]);
        const mer = match[3].toUpperCase();
        position.setLongitudeDMm(deg, min, mer);
        updateCoordsFromPosition();
        updateMarkerPosition();
    }
}

function onLatDMSChange() {
    // Parse format: 45°51'46.80"N
    const match = coords.latDMS.match(/^(\d{1,2})°(\d{1,2})'(\d{1,2}\.\d+)"([NS])$/i);
    if (match) {
        const deg = parseInt(match[1]);
        const min = parseInt(match[2]);
        const sec = parseFloat(match[3]);
        const hem = match[4].toUpperCase();
        position.setLatitudeDMS(deg, min, sec, hem);
        updateCoordsFromPosition();
        updateMarkerPosition();
    }
}

function onLongDMSChange() {
    // Parse format: 6°10'21.00"E
    const match = coords.longDMS.match(/^(\d{1,3})°(\d{1,2})'(\d{1,2}\.\d+)"([EW])$/i);
    if (match) {
        const deg = parseInt(match[1]);
        const min = parseInt(match[2]);
        const sec = parseFloat(match[3]);
        const mer = match[4].toUpperCase();
        position.setLongitudeDMS(deg, min, sec, mer);
        updateCoordsFromPosition();
        updateMarkerPosition();
    }
}

/**
 * Initialize the Leaflet map
 */
function initMap() {
    if (!mapContainer.value) return;

    // Create map centered on position
    map = L.map(mapContainer.value).setView([position.latitude, position.longitude], 12);

    // Add default tile layer (OpenStreetMap)
    osm.addTo(map);

    // Add layer control (same as LittleMapView)
    L.control.layers(baseMaps, null, { collapsed: false }).addTo(map);

    // Create custom violet marker icon
    const violetIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // Add draggable marker
    marker = L.marker([position.latitude, position.longitude], {
        icon: violetIcon,
        draggable: true
    }).addTo(map);

    // Handle marker drag end
    marker.on('dragend', () => {
        const latlng = marker.getLatLng();
        position.setLatitudeDd(latlng.lat.toFixed(5));
        position.setLongitudeDd(latlng.lng.toFixed(5));
        updateCoordsFromPosition();
    });
}

/**
 * Validate form fields
 */
function validateForm() {
    if (!form.name || form.name.trim() === '') {
        errorMessage.value = $gettext('Name must not be null');
        showError.value = true;
        return false;
    }

    const lat = parseFloat(coords.latDD);
    if (isNaN(lat) || lat === 0) {
        errorMessage.value = $gettext('Latitude must not be null');
        showError.value = true;
        return false;
    }

    const lng = parseFloat(coords.longDD);
    if (isNaN(lng) || lng === 0) {
        errorMessage.value = $gettext('Longitude must not be null');
        showError.value = true;
        return false;
    }

    return true;
}

/**
 * Handle form submission
 */
function onSubmit() {
    if (!validateForm()) return;

    const siteData = {
        id: form.id,
        nom: form.name.toUpperCase(),
        typeSite: form.siteType,
        orient: form.orientation.toUpperCase(),
        alti: form.altitude || '0',
        cp: form.zipCode.toUpperCase(),
        localite: form.city.toUpperCase(),
        pays: form.country.toUpperCase(),
        lat: parseFloat(coords.latDD),
        long: parseFloat(coords.longDD),
        comment: form.comment,
        update: new Date().toISOString().split('T')[0],
        newsite: form.id === 0
    };

    emit('submit', siteData);
}

/**
 * Handle cancel
 */
function onCancel() {
    emit('cancel');
}

/**
 * Initialize form with site data or defaults
 */
function initForm() {
    if (props.site && props.site.id > 0) {
        // Edit existing site
        isEditing.value = true;
        form.id = props.site.id;
        form.siteType = props.site.typeSite || 'D';
        form.name = props.site.nom || '';
        form.orientation = props.site.orient || '';
        form.altitude = props.site.alti || '';
        form.zipCode = props.site.cp || '';
        form.city = props.site.localite || '';
        form.country = props.site.pays || '';
        form.comment = props.site.comment || '';

        position.setLatitudeDd(props.site.lat.toFixed(5));
        position.setLongitudeDd(props.site.long.toFixed(5));
    } else {
        // New site with default coordinates
        isEditing.value = false;
        form.siteType = 'D';
        position.setLatitudeDd(DEFAULT_LAT.toFixed(5));
        position.setLongitudeDd(DEFAULT_LONG.toFixed(5));
    }

    updateCoordsFromPosition();
}

// Watch for site prop changes
watch(() => props.site, () => {
    initForm();
    if (map) {
        updateMarkerPosition();
    }
}, { deep: true });

onMounted(() => {
    initForm();
    nextTick(() => {
        initMap();
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
.site-form-card {
    width: min(1000px, 85vw);
    margin: 0 auto;
}

.map-container {
    height: 600px;
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(var(--v-border-color), 0.12);
}

.map-info-banner {
    display: flex;
    justify-content: center;
    margin-top: 8px;
}

.uppercase-input :deep(input) {
    text-transform: uppercase;
}

.font-weight-bold {
    font-weight: 600;
}
</style>
