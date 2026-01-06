<template>
  <div class="airspaces-view-root">
    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor" location="top">
      {{ snackbarMessage }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Fermer</v-btn>
      </template>
    </v-snackbar>

    <!-- Toolbar -->
    <v-toolbar density="compact" color="surface" class="border-b flex-grow-0"
      style="z-index: 1001; position: relative;">
      <!-- File selection -->
      <v-btn prepend-icon="mdi-folder-open" variant="text" @click="triggerFileInput">
        {{ $gettext('Select file') }}
      </v-btn>
      <input type="file" ref="fileInput" style="display: none" accept=".txt" @change="onLocalFileChange" />

      <v-btn prepend-icon="mdi-cloud-download" variant="text" @click="downloadBazileFile">
        @Bazile
      </v-btn>

      <v-divider vertical class="mx-2"></v-divider>

      <!-- Current File Info -->
      <div v-if="currentFileName" class="d-flex align-center mx-2 font-weight-bold text-primary">
        {{ currentFileName }}
        <v-chip size="small" class="ml-2" color="primary" variant="outlined">{{ visibleCount }} / {{ totalCount
        }}</v-chip>
      </div>

      <v-spacer></v-spacer>

      <!-- Filters -->
      <div class="d-flex align-center gap-4 mr-4">
        <!-- Floor Filter -->
        <div class="d-flex align-center">
          <span class="text-caption mr-2 text-medium-emphasis">{{ $gettext('Floor') }}</span>
          <v-select v-model="floorFilter" :items="floorOptions" density="compact" variant="outlined" hide-details
            style="width: 100px"></v-select>
        </div>

        <!-- Restricted Filter -->
        <v-checkbox v-model="restrictedFilter" label="E,F,G, rest" density="compact" hide-details
          color="primary"></v-checkbox>
      </div>

      <v-divider vertical class="mx-2"></v-divider>

      <!-- Actions -->
      <v-btn prepend-icon="mdi-refresh" variant="text" @click="resetView" :disabled="!hasData">
        {{ $gettext('Reset') }}
      </v-btn>

      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" prepend-icon="mdi-export" variant="text" color="primary" :disabled="!hasData">
            {{ $gettext('Save/Export') }}
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="exportOpenAir" prepend-icon="mdi-file-document-outline">
            <v-list-item-title>OpenAir Format</v-list-item-title>
          </v-list-item>
          <v-list-item @click="exportGPX" prepend-icon="mdi-xml">
            <v-list-item-title>GPX Format</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-toolbar>

    <!-- Main Content -->
    <div class="content-wrapper">
      <!-- Left Panel: Tree View -->
      <div class="left-panel">
        <div v-if="loading" class="d-flex justify-center align-center h-100">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        <div v-else-if="!hasData"
          class="d-flex justify-center align-center h-100 text-medium-emphasis text-center pa-4">
          {{ $gettext('No airspace file loaded') }}
        </div>
        <div v-else class="tree-container">
          <!-- Custom Tree Implementation using v-list -->
          <v-list density="compact" :opened="openedGroups" @update:opened="loadGroup"> <!-- Vuetify 3 unified list -->

            <v-list-group value="all">
              <template v-slot:activator="{ props }">
                <!-- Header for All -->
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <v-checkbox-btn :model-value="allSelected" :indeterminate="allIndeterminate"
                      @click.stop="toggleAll"></v-checkbox-btn>
                  </template>
                  <v-list-item-title class="font-weight-bold">Airspaces</v-list-item-title>
                </v-list-item>
              </template>

              <!-- Classes Groups -->
              <v-list-group v-for="group in filteredGroups" :key="group.class" :value="group.class">
                <template v-slot:activator="{ props }">
                  <v-list-item v-bind="props">
                    <template v-slot:prepend>
                      <v-checkbox-btn :model-value="group.selected" :indeterminate="group.indeterminate"
                        @click.stop="toggleGroup(group)"></v-checkbox-btn>
                    </template>
                    <v-list-item-title>{{ group.class }} ({{ group.items.length }})</v-list-item-title>
                  </v-list-item>
                </template>

                <!-- Items -->
                <v-list-item v-for="item in group.items" :key="item.id" density="compact" class="pl-4">
                  <template v-slot:prepend>
                    <v-checkbox-btn v-model="item.selected" @update:model-value="onItemToggle(item)"
                      density="compact"></v-checkbox-btn>
                  </template>
                  <v-list-item-title class="text-caption">{{ item.name }}</v-list-item-title>
                </v-list-item>
              </v-list-group>

            </v-list-group>
          </v-list>
        </div>
      </div>

      <!-- Right Panel: Map -->
      <div class="right-panel">
        <div id="airspace-map" class="map-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { useGettext } from "vue3-gettext";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import booleanIntersects from '@turf/boolean-intersects';
import { decodeOpenAir, downloadBazile, setCatColor } from '@/js/airspaces/airspaces-open.js';

const { $gettext } = useGettext();

// Define emits to handle Extraneous non-emits event listeners warning
const emit = defineEmits(['db-updated']);

// --- State ---
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('info');
const loading = ref(false);
const fileInput = ref(null);

const currentFileName = ref('');
const floorFilter = ref(0); // 0 = All
const restrictedFilter = ref(true); // Default true

const rawAirspaces = ref([]); // All airspaces from file
const groupedData = ref([]); // Processed for tree: [{class: 'A', items: [...], selected: true, indeterminate: false}]
const openedGroups = ref(['all']);

// Map related
let map = null;
let mapLayers = new Map(); // id -> L.GeoJSON

// --- Constants ---
const floorOptions = [
  { title: 'All', value: 0 },
  ...Array.from({ length: 12 }, (_, i) => ({ title: (i + 1) * 500, value: (i + 1) * 500 }))
];

// --- Computed ---
const hasData = computed(() => rawAirspaces.value.length > 0);
const totalCount = computed(() => rawAirspaces.value.length);

const visibleCount = computed(() => {
  let count = 0;
  groupedData.value.forEach(g => {
    count += g.items.filter(i => i.selected).length;
  });
  return count;
});

const filteredGroups = computed(() => {
  return groupedData.value;
});

const allSelected = computed(() => groupedData.value.length > 0 && groupedData.value.every(g => g.selected));
const allIndeterminate = computed(() => groupedData.value.some(g => g.selected || g.indeterminate) && !allSelected.value);

// --- Lifecycle ---
onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (map) {
    map.remove();
  }
})

// --- Methods ---

function showMessage(msg, color = 'info') {
  snackbarMessage.value = msg;
  snackbarColor.value = color;
  snackbar.value = true;
}

function initMap() {
  map = L.map('airspace-map').setView([45.8326, 6.865], 9);

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  });
  const openTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
  });

  osm.addTo(map);

  const baseMaps = {
    "OpenStreetMap": osm,
    "OpenTopoMap": openTopo
  };

  L.control.layers(baseMaps).addTo(map);

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
    const content = e.target.result;
    // Allow UI to update (spinner show) before heavy processing
    setTimeout(() => {
      processFileContent(content);
      loading.value = false;
    }, 100);
  };
  reader.readAsText(file);
  event.target.value = ''; // Reset
}

async function downloadBazileFile() {
  loading.value = true;
  // Allow UI to update
  await nextTick();

  // Petit délai pour assurer l'affichage du spinner
  setTimeout(async () => {
    try {
      const result = await downloadBazile();
      if (result.success) {
        currentFileName.value = 'Bazile_OpenAir.txt';
        processFileContent(result.content);
        showMessage($gettext('Bazile file loaded successfully'), 'success');
      } else {
        showMessage($gettext('Error downloading Bazile file: ') + result.message || 'Unknown error', 'error');
      }
    } catch (e) {
      console.error(e);
      showMessage($gettext('Error'), 'error');
    } finally {
      loading.value = false;
    }
  }, 100);
}

function processFileContent(content) {
  const result = decodeOpenAir(content, false);
  if (result.airspaceSet && result.airspaceSet.length > 0) {
    rawAirspaces.value = result.airspaceSet.map((param, index) => ({
      ...param,
      id: index, // unique ID for tracking
      visible: true // visibility based on filters
    }));
    applyFilters(); // Builds groupedData and updates map
    fitMapBounds(result);
  } else {
    showMessage($gettext('No valid airspaces found in file'), 'warning');
    rawAirspaces.value = [];
    groupedData.value = [];
    clearMapLayers();
  }
}

function fitMapBounds(result) {
  if (mapLayers.size > 0) {
    const group = L.featureGroup(Array.from(mapLayers.values()));
    map.fitBounds(group.getBounds());
  } else {
    map.setView([45.8326, 6.865], 9);
  }
}

function clearMapLayers() {
  mapLayers.forEach(layer => map.removeLayer(layer));
  mapLayers.clear();
}

// --- Filtering & Tree Building ---

watch([floorFilter, restrictedFilter], () => {
  applyFilters();
});

function applyFilters() {
  clearMapLayers();

  // 1. Filter raw list based on global criteria
  const filteredAirspaces = rawAirspaces.value.filter(as => {
    let visible = true;
    if (floorFilter.value > 0 && as.floor >= floorFilter.value) {
      visible = false;
    }
    if (!restrictedFilter.value) {
      if (['E', 'F', 'G'].includes(as.class)) {
        visible = false;
      }
    }
    as.visible = visible;
    return visible;
  });

  // 2. Group by Class
  const groups = {};
  filteredAirspaces.forEach(as => {
    if (!groups[as.class]) {
      groups[as.class] = [];
    }
    groups[as.class].push({
      id: as.id,
      name: as.name,
      class: as.class,
      data: as,
      selected: true
    });
  });

  // 3. Convert to array and sort
  groupedData.value = Object.keys(groups).sort().map(cls => ({
    class: cls,
    items: groups[cls].sort((a, b) => a.name.localeCompare(b.name)),
    selected: true,
    indeterminate: false
  }));

  // 4. Update Map
  updateMapFromSelection();
}

function updateMapFromSelection() {
  const activeIds = new Set();

  groupedData.value.forEach(group => {
    group.items.forEach(item => {
      if (item.selected) {
        activeIds.add(item.id);
        if (!mapLayers.has(item.id)) {
          addLayerToMap(item.data);
        }
      }
    });
  });

  for (const [id, layer] of mapLayers.entries()) {
    if (!activeIds.has(id)) {
      map.removeLayer(layer);
      mapLayers.delete(id);
    }
  }
}

function addLayerToMap(airspace) {
  if (!airspace || !airspace.dbGeoJson || !airspace.dbGeoJson.properties) {
    return;
  }
  const color = getHexColor(airspace.dbGeoJson.properties.Cat);
  const layer = L.geoJSON(airspace.dbGeoJson, {
    style: {
      color: 'white',
      weight: 1,
      opacity: 1,
      fillColor: color,
      fillOpacity: 0.4
    },
    onEachFeature: (feature, l) => {
      feature.properties._internalId = airspace.id;
    }
  });

  layer.addTo(map);
  mapLayers.set(airspace.id, layer);
}


// --- Tree Interaction ---

function toggleAll() {
  const newState = !allSelected.value;
  groupedData.value.forEach(g => {
    g.selected = newState;
    g.indeterminate = false;
    g.items.forEach(i => i.selected = newState);
  });
  updateMapFromSelection();
}

function toggleGroup(group) {
  const newState = !group.selected;
  group.selected = newState;
  group.indeterminate = false;
  group.items.forEach(i => i.selected = newState);
  updateMapFromSelection();
}

function onItemToggle(item) {
  const group = groupedData.value.find(g => g.class === item.data.class);
  if (group) {
    const all = group.items.every(i => i.selected);
    const some = group.items.some(i => i.selected);
    group.selected = all;
    group.indeterminate = some && !all;
  }
  updateMapFromSelection();

  // Feature request: Zoom to bounds on select
  if (item.selected && item.data && item.data.dbGeoJson) {
    // Create a temporary layer to get bounds easily without searching the mapLayers map
    const tempLayer = L.geoJSON(item.data.dbGeoJson);
    try {
      const bounds = tempLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    } catch (e) {
      console.warn('Could not fit bounds', e);
    }
  }
}


// --- Map Interaction ---

function loadGroup(newVal) {
  openedGroups.value = newVal;
}

function onMapClick(e) {
  // Use Point GeoJSON for correct booleanIntersects checking
  const clickPoint = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [e.latlng.lng, e.latlng.lat]
    },
    properties: {}
  };

  const found = [];

  // Iterate over visible airspaces (from groupedData)
  // This avoids probing Leaflet layers which are nested LayerGroups and complex to check
  groupedData.value.forEach(group => {
    group.items.forEach(item => {
      if (item.selected && item.data && item.data.dbGeoJson) {
        try {
          if (booleanIntersects(clickPoint, item.data.dbGeoJson)) {
            found.push(item.data);
          }
        } catch (err) {
          // Ignore intersection errors
        }
      }
    });
  });

  if (found.length > 0) {
    let popupContent = '<div class="airspace-popup">';
    found.forEach(as => {
      popupContent += formatAirspacePopup(as);
    });
    popupContent += '</div>';

    L.popup()
      .setLatLng(e.latlng)
      .setContent(popupContent)
      .openOn(map);
  }
}

function formatAirspacePopup(as) {
  const p = as.dbGeoJson.properties;
  const catColor = getHexColor(p.Cat);
  const bgColor = getLabelColor(p.Cat);

  let html = `<div class="mb-3 border rounded overflow-hidden">`;
  html += `<div style="background-color: ${catColor}; color: ${bgColor === '#000000' ? 'black' : 'white'}; padding: 4px; text-align: center; font-weight: bold;">[${p.Class}] ${p.Name}</div>`;

  html += `<div class="pa-2 text-body-2" style="background-color: white; color: black;">`;

  const floorLabel = p.altLimitBottomAGL ? '(AGL) Floor' : 'Floor';
  const ceilingLabel = p.altLimitTopAGL ? '(AGL) Ceiling' : 'Ceiling';

  html += `<div><span class="font-weight-bold">${floorLabel}:</span> ${p.Floor}m</div>`;
  html += `<div><span class="font-weight-bold">${ceilingLabel}:</span> ${p.Ceiling}m</div>`;

  if (p.Comment) {
    html += `<div class="mt-2 text-caption font-italic">${p.Comment}</div>`;
  }

  html += `</div></div>`;
  return html;
}

// --- Utils (Colors) ---
function getHexColor(a) {
  const val = parseInt(a);
  if (val > 22) return '#999999';
  if (val > 21) return '#999999';
  if (val > 20) return '#FFCC00';
  if (val > 19) return '#5B900A';
  if (val > 18) return '#00FF00';
  if (val > 17) return '#66CCFF';
  if (val > 16) return '#FF9999';
  if (val > 15) return '#FF00FF';
  if (val > 14) return '#000000';
  if (val > 13) return '#9999CC';
  if (val > 12) return '#99FFFF';
  if (val > 11) return '#FFFF00';
  if (val > 10) return '#19BFBF';
  if (val > 9) return '#7FBC58';
  if (val > 8) return '#A47A11';
  if (val > 7) return '#900A68';
  if (val > 6) return '#4B0A90';
  if (val > 5) return '#FFCCCC';
  if (val > 4) return '#FF0000';
  if (val > 3) return '#0000FF';
  if (val > 2) return '#1971BF';
  if (val > 1) return '#FFCCCC';
  if (val > 0) return '#FE9A2E';
  return '#9999CC';
}

function getLabelColor(a) {
  const val = parseInt(a);
  if ([19, 15, 14, 10, 8, 7, 6, 4, 3, 2].includes(val)) return '#FFFFFF';
  return '#000000';
}

// --- Export ---
function exportOpenAir() {
  let content = '';
  groupedData.value.forEach(group => {
    group.items.forEach(item => {
      if (item.selected) {
        content += item.data.openair + "\r\n\r\n";
      }
    });
  });

  if (!content) {
    showMessage($gettext('No airspaces selected'), 'warning');
    return;
  }

  const header = `**********************************************************************
*                         OPEN AIR FILE                              *
*                      Generated by logfly-web                       *
*                                                                    *
**********************************************************************\r\n\r\n`;

  downloadFile(header + content, 'export_airspaces.txt', 'text/plain');
}

function exportGPX() {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Logfly" xmlns="http://www.topografix.com/GPX/1/1">`;

  groupedData.value.forEach(group => {
    group.items.forEach(item => {
      if (item.selected) {
        const gj = item.data.dbGeoJson;
        if (gj.geometry.type === 'Polygon') {
          gpx += `\n<rte><name>${escapeXml(item.name)}</name>`;
          const coords = gj.geometry.coordinates[0];
          coords.forEach(pt => {
            gpx += `\n<rtept lat="${pt[1]}" lon="${pt[0]}"></rtept>`;
          });
          gpx += `\n</rte>`;
        }
      }
    });
  });

  gpx += `\n</gpx>`;

  downloadFile(gpx, 'export_airspaces.gpx', 'application/gpx+xml');
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function resetView() {
  rawAirspaces.value = [];
  groupedData.value = [];
  currentFileName.value = '';
  clearMapLayers();
}

</script>

<style scoped>
/* Ensure the root takes full height relative to parent container (router-view) */
.airspaces-view-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  /* Ensure it contains absolute children if any */
}

/* Sidebar for tree */
.left-panel {
  width: 25%;
  min-width: 300px;
  border-right: 1px solid #ddd;
  overflow-y: auto;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
}

.tree-container {
  flex: 1;
}

/* Map area */
.right-panel {
  flex: 1;
  position: relative;
  /* Leaflet needs relative/absolute parent */
}

.map-container {
  width: 100%;
  height: 100%;
  z-index: 1;
  /* Ensure map is below overlay UI if any */
}

.gap-4 {
  gap: 16px;
}

/* Scrollbar styling for list */
.left-panel::-webkit-scrollbar {
  width: 6px;
}

.left-panel::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.left-panel::-webkit-scrollbar-thumb {
  background: #ccc;
}

.left-panel::-webkit-scrollbar-thumb:hover {
  background: #888;
}

/* Custom Popup Style */
:deep(.leaflet-popup-content-wrapper) {
  padding: 0;
  overflow: hidden;
}

:deep(.leaflet-popup-content) {
  margin: 0;
  width: 300px !important;
}
</style>