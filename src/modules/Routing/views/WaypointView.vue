<template>
  <div class="waypoint-view-root">
    <!-- Snackbar for messages -->
    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor" location="top">
      {{ snackbarMessage }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">{{ $gettext('Close') }}</v-btn>
      </template>
    </v-snackbar>

    <!-- Toolbar -->
    <v-toolbar density="compact" color="surface" class="border-b" elevation="2">
      <!-- File selection -->
      <v-btn prepend-icon="mdi-folder-open" variant="text" @click="triggerFileInput">
        {{ $gettext('Select a file') }}
      </v-btn>
      <input type="file" ref="fileInput" style="display: none" accept=".wpt,.cup,.gpx,.kml,.xctsk"
        @change="onLocalFileChange" />

      <v-btn prepend-icon="mdi-plus-circle" variant="text" @click="createNewSet">
        {{ $gettext('New set') }}
      </v-btn>

      <v-divider vertical class="mx-2"></v-divider>

      <!-- File info -->
      <div v-if="currentFileName" class="d-flex align-center mx-2 font-weight-bold text-primary">
        {{ currentFileName }}
        <v-chip size="small" class="ml-2" color="primary" variant="outlined">
          {{ selectedCount }} / {{ totalCount }}
        </v-chip>
      </div>

      <v-spacer></v-spacer>

      <!-- Export menu -->
      <v-menu v-if="hasData">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" prepend-icon="mdi-export" variant="text" color="primary">
            {{ $gettext('Save') }}/{{ $gettext('Export') }}
          </v-btn>
        </template>
        <v-list>
          <v-list-item v-for="format in exportFormats" :key="format.value" @click="exportToFormat(format.value)"
            prepend-icon="mdi-file-download">
            <v-list-item-title>{{ format.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-btn prepend-icon="mdi-refresh" variant="text" @click="resetView" :disabled="!hasData">
        {{ $gettext('Reset') }}
      </v-btn>
    </v-toolbar>

    <!-- Loading overlay -->
    <v-progress-circular v-if="loading" indeterminate color="primary" class="loading-spinner"></v-progress-circular>

    <!-- Main content -->
    <div class="content-wrapper">
      <!-- Left Panel: Waypoint List or Edit Form -->
      <div class="left-panel">
        <!-- Edit mode: Waypoint form -->
        <div v-if="editMode" class="edit-panel">
          <div class="edit-panel-header">
            <v-icon class="mr-2">mdi-map-marker-plus</v-icon>
            <span class="font-weight-bold">
              {{ editingWaypoint.id === null ? $gettext('New waypoint') : $gettext('Edit waypoint') }}
            </span>
          </div>

          <div class="edit-panel-content">
            <!-- Type selection -->
            <v-radio-group v-model="editingWaypoint.type" inline density="compact" class="mb-2">
              <v-radio :label="$gettext('Standard')" value="S"></v-radio>
              <v-radio :label="$gettext('Take off')" value="T"></v-radio>
              <v-radio :label="$gettext('Landing')" value="L"></v-radio>
            </v-radio-group>

            <!-- Long name -->
            <v-text-field v-model="editingWaypoint.longName" :label="$gettext('Name')" density="compact"
              variant="outlined" class="mb-2" @input="forceUppercase('longName')"></v-text-field>

            <!-- Short name -->
            <v-text-field v-model="editingWaypoint.shortName" :label="$gettext('Short name')" density="compact"
              variant="outlined" class="mb-2" maxlength="6" counter @input="forceUppercase('shortName')"></v-text-field>

            <!-- Altitude -->
            <v-text-field v-model.number="editingWaypoint.altitude" :label="$gettext('Altitude') + ' (m)'"
              density="compact" variant="outlined" type="number" class="mb-2"></v-text-field>

            <!-- Coordinates -->
            <v-row dense>
              <v-col cols="6">
                <v-text-field v-model.number="editingWaypoint.latitude" :label="$gettext('Latitude')" density="compact"
                  variant="outlined" type="number" step="0.00001" readonly></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field v-model.number="editingWaypoint.longitude" :label="$gettext('Longitude')"
                  density="compact" variant="outlined" type="number" step="0.00001" readonly></v-text-field>
              </v-col>
            </v-row>

            <!-- Map click hint -->
            <v-chip color="info" size="small" class="mb-3">
              <v-icon start size="small">mdi-cursor-default-click</v-icon>
              {{ $gettext('Click on map to set position') }}
            </v-chip>

            <!-- Action buttons -->
            <div class="d-flex justify-end gap-2">
              <v-btn color="grey" variant="outlined" @click="cancelEdit">
                {{ $gettext('Cancel') }}
              </v-btn>
              <v-btn color="success" variant="flat" @click="saveWaypoint" :disabled="!canSaveWaypoint">
                {{ $gettext('OK') }}
              </v-btn>
            </div>
          </div>
        </div>

        <!-- List mode: Waypoint list -->
        <div v-else class="list-panel">
          <!-- List header -->
          <div class="list-header">
            <v-checkbox v-model="allSelected" @change="toggleAllSelection" hide-details density="compact"
              :indeterminate="someSelected && !allSelected"></v-checkbox>
            <span class="ml-2 text-body-2">{{ $gettext('All') }}</span>
            <v-spacer></v-spacer>
            <v-btn v-if="hasData" size="small" color="primary" variant="tonal" prepend-icon="mdi-plus"
              @click="startNewWaypoint">
              {{ $gettext('New') }}
            </v-btn>
          </div>

          <!-- Virtual scroll list -->
          <v-virtual-scroll :items="waypoints" :height="listHeight" item-height="48" height="100" class="waypoint-list">
            <template v-slot:default="{ item }">
              <div class="waypoint-item" :class="{ 'waypoint-item-selected': item.selected }" @click="onItemClick(item)"
                @dblclick="startEditWaypoint(item)">
                <v-checkbox v-model="item.selected" @click.stop @change="onItemToggle(item)" hide-details
                  density="compact"></v-checkbox>

                <v-icon :color="getTypeColor(item.type)" class="mx-2">
                  {{ getTypeIcon(item.type) }}
                </v-icon>

                <div class="waypoint-info">
                  <div class="waypoint-name text-truncate">{{ item.longName || item.shortName }}</div>
                  <div class="waypoint-details text-truncate text-grey">
                    {{ item.shortName }} · {{ item.altitude }}m
                  </div>
                </div>

                <!-- Context menu -->
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" @click.stop></v-btn>
                  </template>
                  <v-list density="compact">
                    <v-list-item @click="startEditWaypoint(item)" prepend-icon="mdi-pencil">
                      <v-list-item-title>{{ $gettext('Edit') }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="centerOnWaypoint(item)" prepend-icon="mdi-crosshairs-gps">
                      <v-list-item-title>{{ $gettext('Center on map') }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="deleteWaypoint(item)" prepend-icon="mdi-delete" class="text-error">
                      <v-list-item-title>{{ $gettext('Delete') }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </template>
          </v-virtual-scroll>
        </div>
      </div>

      <!-- Right Panel: Map -->
      <div class="right-panel">
        <div id="waypoint-map" class="map-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useGettext } from "vue3-gettext";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { readWaypointFile } from '@/js/waypoints/wayp-read.js';
import { exportWaypoints, getExportFormats } from '@/js/waypoints/wayp-write.js';
import { createBaseMaps } from '@/js/leaflet/tiles.js';

const { $gettext } = useGettext();

// --- State ---
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('info');
const loading = ref(false);
const fileInput = ref(null);
const currentFileName = ref('');

// Waypoints data
const waypoints = ref([]);

// Edit mode
const editMode = ref(false);
const editingWaypoint = reactive({
  id: null,
  type: 'S',
  longName: '',
  shortName: '',
  altitude: 0,
  latitude: null,
  longitude: null
});
let editingMarker = null;

// Map
let map = null;
let markers = new Map(); // id -> L.Marker

// List height
const listHeight = ref(500);

// Export formats
const exportFormats = getExportFormats();

// --- Computed ---
const hasData = computed(() => waypoints.value.length > 0);
const totalCount = computed(() => waypoints.value.length);
const selectedCount = computed(() => waypoints.value.filter(w => w.selected).length);
const allSelected = computed({
  get: () => waypoints.value.length > 0 && waypoints.value.every(w => w.selected),
  set: () => { }
});
const someSelected = computed(() => waypoints.value.some(w => w.selected) && !allSelected.value);
const canSaveWaypoint = computed(() => {
  return editingWaypoint.longName.trim() !== '' &&
    editingWaypoint.latitude !== null &&
    editingWaypoint.longitude !== null;
});

// --- Lifecycle ---
onMounted(() => {
  initMap();
  calculateListHeight();
  window.addEventListener('resize', calculateListHeight);
});

onUnmounted(() => {
  if (map) {
    map.off();
    map.remove();
  }
  window.removeEventListener('resize', calculateListHeight);
});

// --- Methods ---

function showMessage(msg, color = 'info') {
  snackbarMessage.value = msg;
  snackbarColor.value = color;
  snackbar.value = true;
}

function calculateListHeight() {
  // Calculate available height for the list
  const viewportHeight = window.innerHeight;
  const headerHeight = 48 + 48; // Toolbar + list header
  listHeight.value = Math.max(300, viewportHeight - headerHeight - 100);
}

function initMap() {
  map = L.map('waypoint-map').setView([45.8326, 6.865], 9);

  const mapBaseLayers = createBaseMaps();
  mapBaseLayers['OpenStreetMap'].addTo(map);

  L.control.layers(mapBaseLayers).addTo(map);

  // Map click handler for edit mode
  map.on('click', onMapClick);
}

function triggerFileInput() {
  fileInput.value.click();
}

async function onLocalFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  loading.value = true;
  currentFileName.value = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    setTimeout(() => {
      const content = e.target.result;
      processFileContent(content, file.name);
      loading.value = false;
    }, 100);
  };
  reader.onerror = () => {
    showMessage($gettext('Error reading file'), 'error');
    loading.value = false;
  };
  reader.readAsText(file);

  // Reset input
  event.target.value = '';
}

function processFileContent(content, fileName) {
  const result = readWaypointFile(content, fileName);

  if (result.success && result.waypoints.length > 0) {
    waypoints.value = result.waypoints;
    updateMapMarkers();
    fitMapBounds();
    showMessage(`${result.waypoints.length} ${$gettext('waypoints loaded')} (${result.format})`, 'success');
  } else {
    showMessage(result.error || $gettext('No waypoints found'), 'warning');
  }
}

function createNewSet() {
  currentFileName.value = $gettext('New set');
  waypoints.value = [];
  clearMapMarkers();
  startNewWaypoint();
}

function resetView() {
  waypoints.value = [];
  currentFileName.value = '';
  editMode.value = false;
  clearMapMarkers();
  if (editingMarker) {
    map.removeLayer(editingMarker);
    editingMarker = null;
  }
}

// --- Map markers ---

function clearMapMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers.clear();
}

function updateMapMarkers() {
  clearMapMarkers();

  waypoints.value.forEach(wp => {
    if (wp.selected && wp.latitude && wp.longitude) {
      addMarkerForWaypoint(wp);
    }
  });
}

function addMarkerForWaypoint(wp) {
  const marker = L.marker([wp.latitude, wp.longitude], {
    icon: createMarkerIcon(wp.type)
  });

  const popupContent = `
    <div style="min-width: 150px;">
      <strong>${wp.longName || wp.shortName}</strong><br/>
      ${$gettext('Short')}: ${wp.shortName}<br/>
      ${$gettext('Altitude')}: ${wp.altitude} m<br/>
      ${$gettext('Lat')}: ${wp.latitude.toFixed(5)}<br/>
      ${$gettext('Lon')}: ${wp.longitude.toFixed(5)}
    </div>
  `;

  marker.bindPopup(popupContent);
  marker.addTo(map);
  markers.set(wp.id, marker);
}

function createMarkerIcon(type) {
  const colors = {
    'S': 'blue',
    'T': 'green',
    'L': 'red'
  };
  const color = colors[type] || 'blue';

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
}

function fitMapBounds() {
  if (markers.size > 0) {
    const group = L.featureGroup(Array.from(markers.values()));
    map.fitBounds(group.getBounds(), { padding: [50, 50] });
  }
}

// --- Waypoint interactions ---

function onItemClick(item) {
  centerOnWaypoint(item);
}

function centerOnWaypoint(item) {
  if (item.latitude && item.longitude) {
    map.setView([item.latitude, item.longitude], 14);
    const marker = markers.get(item.id);
    if (marker) {
      marker.openPopup();
    }
  }
}

function onItemToggle(item) {
  updateMapMarkers();
}

function toggleAllSelection() {
  const newValue = !allSelected.value;
  waypoints.value.forEach(w => w.selected = newValue);
  updateMapMarkers();
}

function getTypeIcon(type) {
  switch (type) {
    case 'T': return 'mdi-airplane-takeoff';
    case 'L': return 'mdi-airplane-landing';
    default: return 'mdi-map-marker';
  }
}

function getTypeColor(type) {
  switch (type) {
    case 'T': return 'green';
    case 'L': return 'red';
    default: return 'blue';
  }
}

// --- Edit mode ---

function startNewWaypoint() {
  editingWaypoint.id = null;
  editingWaypoint.type = 'S';
  editingWaypoint.longName = '';
  editingWaypoint.shortName = '';
  editingWaypoint.altitude = 0;
  editingWaypoint.latitude = null;
  editingWaypoint.longitude = null;

  editMode.value = true;

  // Change cursor to crosshair
  map.getContainer().style.cursor = 'crosshair';
}

function startEditWaypoint(item) {
  editingWaypoint.id = item.id;
  editingWaypoint.type = item.type;
  editingWaypoint.longName = item.longName;
  editingWaypoint.shortName = item.shortName;
  editingWaypoint.altitude = item.altitude;
  editingWaypoint.latitude = item.latitude;
  editingWaypoint.longitude = item.longitude;

  editMode.value = true;

  // Show editing marker
  if (item.latitude && item.longitude) {
    showEditingMarker(item.latitude, item.longitude);
  }
}

function cancelEdit() {
  editMode.value = false;
  if (editingMarker) {
    map.removeLayer(editingMarker);
    editingMarker = null;
  }
  map.getContainer().style.cursor = '';
}

function saveWaypoint() {
  if (!canSaveWaypoint.value) return;

  // Generate short name if empty
  if (!editingWaypoint.shortName.trim()) {
    const prefix = editingWaypoint.longName.substring(0, 3).toUpperCase();
    const num = (waypoints.value.length + 1).toString().padStart(3, '0');
    editingWaypoint.shortName = prefix + num;
  }

  if (editingWaypoint.id === null) {
    // New waypoint
    const newId = waypoints.value.length > 0
      ? Math.max(...waypoints.value.map(w => w.id)) + 1
      : 0;

    waypoints.value.push({
      id: newId,
      type: editingWaypoint.type,
      longName: editingWaypoint.longName,
      shortName: editingWaypoint.shortName,
      altitude: editingWaypoint.altitude,
      latitude: editingWaypoint.latitude,
      longitude: editingWaypoint.longitude,
      selected: true
    });

    showMessage($gettext('Waypoint added'), 'success');
  } else {
    // Update existing
    const index = waypoints.value.findIndex(w => w.id === editingWaypoint.id);
    if (index !== -1) {
      waypoints.value[index] = {
        ...waypoints.value[index],
        type: editingWaypoint.type,
        longName: editingWaypoint.longName,
        shortName: editingWaypoint.shortName,
        altitude: editingWaypoint.altitude,
        latitude: editingWaypoint.latitude,
        longitude: editingWaypoint.longitude
      };
    }

    showMessage($gettext('Waypoint updated'), 'success');
  }

  // Cleanup
  cancelEdit();
  updateMapMarkers();
}

function deleteWaypoint(item) {
  const index = waypoints.value.findIndex(w => w.id === item.id);
  if (index !== -1) {
    waypoints.value.splice(index, 1);
    updateMapMarkers();
    showMessage($gettext('Waypoint deleted'), 'info');
  }
}

function onMapClick(e) {
  if (editMode.value) {
    editingWaypoint.latitude = parseFloat(e.latlng.lat.toFixed(5));
    editingWaypoint.longitude = parseFloat(e.latlng.lng.toFixed(5));
    showEditingMarker(e.latlng.lat, e.latlng.lng);
  }
}

function showEditingMarker(lat, lng) {
  if (editingMarker) {
    editingMarker.setLatLng([lat, lng]);
  } else {
    editingMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'editing-marker',
        html: `<div style="background-color: orange; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      }),
      draggable: true
    }).addTo(map);

    editingMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      editingWaypoint.latitude = parseFloat(pos.lat.toFixed(5));
      editingWaypoint.longitude = parseFloat(pos.lng.toFixed(5));
    });
  }

  map.setView([lat, lng], map.getZoom());
}

function forceUppercase(field) {
  editingWaypoint[field] = editingWaypoint[field].toUpperCase();
}

// --- Export ---

function exportToFormat(format) {
  const selectedWaypoints = waypoints.value.filter(w => w.selected);
  if (selectedWaypoints.length === 0) {
    showMessage($gettext('No waypoints selected for export'), 'warning');
    return;
  }

  const baseName = currentFileName.value.replace(/\.[^/.]+$/, '') || 'waypoints';
  const result = exportWaypoints(selectedWaypoints, format, baseName);

  if (result.success) {
    showMessage($gettext('Export successful'), 'success');
  } else {
    showMessage(result.error || $gettext('Export failed'), 'error');
  }
}
</script>

<style scoped>
.waypoint-view-root {
  position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

.content-wrapper {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  width: 350px;
  min-width: 300px;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  background: #fafafa;
}

.right-panel {
  flex: 1;
  position: relative;
  min-width: 0;
}

.map-container {
  width: 100%;
  height: 100%;
}

/* Edit panel */
.edit-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.edit-panel-header {
  padding: 12px 16px;
  background: linear-gradient(135deg, #1976d2, #1565c0);
  color: white;
  display: flex;
  align-items: center;
}

.edit-panel-content {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

/* List panel */
.list-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  min-height: 48px;
}

.waypoint-list {
  overflow-y: auto;
}

.waypoint-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.waypoint-item:hover {
  background-color: rgba(25, 118, 210, 0.08);
}

.waypoint-item-selected {
  background-color: rgba(25, 118, 210, 0.04);
}

.waypoint-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.waypoint-name {
  font-weight: 500;
  font-size: 0.9rem;
}

.waypoint-details {
  font-size: 0.75rem;
}

/* Custom marker styles */
:deep(.custom-marker) {
  background: transparent;
  border: none;
}

:deep(.editing-marker) {
  background: transparent;
  border: none;
}

/* Gap utility */
.gap-2 {
  gap: 8px;
}
</style>