<template>
  <div class="airspaces-view-root">
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

      <!-- Search Name -->
      <v-text-field v-if="hasData" v-model="searchQuery" :placeholder="$gettext('Search')" density="compact"
        variant="outlined" hide-details single-line append-inner-icon="mdi-magnify" class="mx-4"
        style="max-width: 250px" @keyup.enter="performSearch" @click:append-inner="performSearch"></v-text-field>

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

      <!-- Zone Selection -->
      <v-btn prepend-icon="mdi-selection-drag" variant="text" @click="enableZoneSelection"
        :disabled="!hasData || isSelecting" :color="isSelecting ? 'warning' : ''">
        {{ $gettext('Zone selection') }}
      </v-btn>

      <v-btn v-if="hasSelectionSnapshot" prepend-icon="mdi-undo" variant="text" @click="cancelZoneSelection"
        color="secondary">
        {{ $gettext('Cancel selection') }}
      </v-btn>

      <v-divider vertical class="mx-2"></v-divider>

      <!-- Actions -->
      <v-btn prepend-icon="mdi-refresh" variant="text" @click="resetView" :disabled="!hasData">
        {{ $gettext('Reset') }}
      </v-btn>

      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" prepend-icon="mdi-export" variant="text" color="primary" :disabled="!hasData">
            {{ $gettext('Save') }}/{{ $gettext('Export') }}
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="exportOpenAir" prepend-icon="mdi-file-document-outline">
            <v-list-item-title>{{ $gettext('Open Air format') }}</v-list-item-title>
          </v-list-item>
          <v-list-item @click="exportGPX" prepend-icon="mdi-xml">
            <v-list-item-title>{{ $gettext('GPX Format') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-toolbar>

    <!-- Main Content -->
    <div class="content-wrapper">
      <!-- Left Panel: Virtual Scroll List -->
      <div class="left-panel">
        <div v-if="loading" class="d-flex justify-center align-center h-100">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        <div v-else-if="!hasData"
          class="d-flex justify-center align-center h-100 text-medium-emphasis text-center pa-4">
          {{ $gettext('No airspace file loaded') }}
        </div>
        <template v-else>
          <!-- Header bar with global toggle -->
          <div class="list-header">
            <v-checkbox :model-value="allSelected" :indeterminate="allIndeterminate" @update:model-value="toggleAll"
              density="compact" hide-details class="mr-2"></v-checkbox>
            <span class="font-weight-bold">Airspaces</span>
          </div>

          <!-- Virtual Scroll List -->
          <!-- Gros problèmes avec le scroll vertical qui n'apparaissait jamais
              résolu en mettant une hauteur fixe. Si l'on tente un calcul dynamique cela ne fonctionne pas
              à priori pas gênant : 200 ou 400 il occupe toujours toute la hauteur disponible-->
          <v-virtual-scroll :items="flatList" :item-height="48" height="100" class="virtual-list">
            <template v-slot:default="{ item }">
              <!-- Class Header Item -->
              <div v-if="item.isHeader" class="list-item class-header" @click="toggleGroup(item.classKey)">
                <v-checkbox :model-value="getGroupSelected(item.classKey)"
                  :indeterminate="getGroupIndeterminate(item.classKey)" @click.stop="toggleGroup(item.classKey)"
                  density="compact" hide-details class="mr-2 flex-shrink-0"></v-checkbox>
                <div class="class-badge" :style="{ backgroundColor: getClassColor(item.classKey) }">
                  {{ item.classKey }}
                </div>
                <span class="item-name font-weight-medium">{{ item.label || `Classe ${item.classKey}` }}</span>
                <v-chip size="x-small" class="ml-auto" variant="outlined">{{ item.count }}</v-chip>
              </div>

              <!-- Airspace Item -->
              <div v-else class="list-item airspace-item" :class="{ 'item-selected': item.selected }"
                @click="onItemClick(item)">
                <v-checkbox v-model="item.selected" @click.stop="onItemToggle(item)" density="compact" hide-details
                  class="mr-2 flex-shrink-0"></v-checkbox>
                <div class="class-badge small" :style="{ backgroundColor: getClassColor(item.class) }">
                  {{ item.class }}
                </div>
                <span class="item-name text-truncate">{{ item.name }}</span>
              </div>
            </template>
          </v-virtual-scroll>
        </template>
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
import centroid from '@turf/centroid';
import { decodeOpenAir, downloadBazile, setCatColor } from '@/js/airspaces/airspaces-open.js';

const { $gettext } = useGettext();

// Define emits to handle Extraneous non-emits event listeners warning
const emit = defineEmits(['db-updated']);

const listHeight = ref(0)
const leftPanel = ref(null)

// --- State ---
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('info');
const loading = ref(false);
const fileInput = ref(null);

const currentFileName = ref('');
const floorFilter = ref(0); // 0 = All
const restrictedFilter = ref(true); // Default true
const searchQuery = ref('');

const rawAirspaces = ref([]); // All airspaces from file
const groupedData = ref([]); // Processed for tree: [{class: 'A', items: [...], selected: true, indeterminate: false}]
const openedGroups = ref(['all']);

// Map related
let map = null;
let mapLayers = new Map(); // id -> L.GeoJSON

// Zone selection state
const isSelecting = ref(false);
const hasSelectionSnapshot = ref(false);
let airspacesSnapshot = null; // Snapshot before zone selection
let selectionRectangle = null; // L.Rectangle for visual feedback
let selectionStartPoint = null; // Starting point of selection

// --- Constants ---
const floorOptions = [
  { title: 'All', value: 0 },
  ...Array.from({ length: 12 }, (_, i) => ({ title: (i + 1) * 500, value: (i + 1) * 500 }))
];

// Colors for each airspace class (A-G and special types)
const classColors = {
  'A': '#FF0000',   // Rouge vif
  'B': '#FF6600',   // Orange
  'C': '#FFCC00',   // Jaune doré
  'D': '#0066FF',   // Bleu
  'E': '#00CC66',   // Vert
  'F': '#9933FF',   // Violet
  'G': '#00CCCC',   // Cyan
  'CTR': '#FF3366', // Rose
  'R': '#CC0000',   // Rouge foncé (Restricted)
  'P': '#990000',   // Rouge sombre (Prohibited)
  'Q': '#FF6699',   // Rose clair (Danger)
  'W': '#996633',   // Marron (Wave)
  'GP': '#666666',  // Gris (Glider Prohibited)
  'TMZ': '#CC6600', // Orange foncé
  'RMZ': '#0099CC', // Bleu clair
};

// Labels for class headers (you can fill these in later)
const classLabels = {
  'A': '',
  'B': '',
  'C': '',
  'D': '',
  'E': '',
  'F': '',
  'G': '',
  'CTR': 'Control Zone',
  'R': 'Restricted',
  'P': 'Prohibited',
  'Q': 'Danger',
  'W': 'Wave Window',
  'GP': 'Glider Prohibited',
  'TMZ': 'Transponder Mandatory Zone',
  'RMZ': 'Radio Mandatory Zone',
};

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

// --- Flat list for virtual scroll ---
// Creates a flat list with headers for each class followed by its items
const flatList = computed(() => {
  const result = [];
  groupedData.value.forEach(group => {
    // Add class header
    result.push({
      isHeader: true,
      classKey: group.class,
      label: classLabels[group.class] || '',
      count: group.items.length
    });
    // Add all items of this class
    group.items.forEach(item => {
      result.push(item);
    });
  });
  return result;
});

const allSelected = computed(() => groupedData.value.length > 0 && groupedData.value.every(g => g.selected));
const allIndeterminate = computed(() => groupedData.value.some(g => g.selected || g.indeterminate) && !allSelected.value);

// --- Lifecycle ---
onMounted(() => {
  initMap();
  // On tentait de récupérer la hauteur du panneau gauche pour le virtual-scroll
  // pour pouvoir déterminer la hauteur à affecter au virtual-scroll
  // finalement on est resté sur une hauteur fixe, voir le commentaire ligne 109
  // 
  // Le panneau gauche a déjà la bonne hauteur (flex 1)
  // On récupère sa hauteur réelle et on la transmet au virtual‑scroll
  listHeight.value = leftPanel.value?.clientHeight ?? 0
  console.log('leftPanel', leftPanel.value, 'listHeight', listHeight.value);
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

function performSearch() {
  if (!searchQuery.value || searchQuery.value.length < 2) return;
  const term = searchQuery.value.toLowerCase();

  // Search in all raw airspaces - uses includes() to find term anywhere in the name
  const matches = rawAirspaces.value.filter(a => a.name.toLowerCase().includes(term));

  if (matches.length > 0) {
    // Create temp layers to calculate global bounds
    const layers = matches.map(m => L.geoJSON(m.dbGeoJson));
    if (layers.length > 0) {
      const group = L.featureGroup(layers);
      try {
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
          showMessage(`${matches.length} matches found`, 'success');

          // Show popup with all matching airspaces at the center of bounds
          const center = bounds.getCenter();
          let popupContent = '<div class="airspace-popup">';
          matches.forEach(as => {
            popupContent += formatAirspacePopup(as);
          });
          popupContent += '</div>';

          L.popup({ maxHeight: 400 })
            .setLatLng(center)
            .setContent(popupContent)
            .openOn(map);
        }
      } catch (e) {
        console.warn('Search fitBounds error', e);
      }
    }
  } else {
    showMessage($gettext('No airspace found'), 'warning');
  }
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
        showMessage($gettext('Error downloading Bazile file') + ': ' + result.message || 'Unknown error', 'error');
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
  // Reset selection state when loading a new file
  hasSelectionSnapshot.value = false;
  airspacesSnapshot = null;
  isSelecting.value = false;

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


// --- List Interaction ---

// Get color for a class
function getClassColor(classKey) {
  return classColors[classKey] || '#999999';
}

// Get text color for a class badge (for contrast)
function getClassTextColor(classKey) {
  const lightClasses = ['C', 'E', 'G', 'Q'];
  return lightClasses.includes(classKey) ? '#000000' : '#FFFFFF';
}

// Check if a group is fully selected
function getGroupSelected(classKey) {
  const group = groupedData.value.find(g => g.class === classKey);
  return group ? group.selected : false;
}

// Check if a group is indeterminate
function getGroupIndeterminate(classKey) {
  const group = groupedData.value.find(g => g.class === classKey);
  return group ? group.indeterminate : false;
}

function toggleAll() {
  const newState = !allSelected.value;
  groupedData.value.forEach(g => {
    g.selected = newState;
    g.indeterminate = false;
    g.items.forEach(i => i.selected = newState);
  });
  updateMapFromSelection();
}

function toggleGroup(classKey) {
  const group = groupedData.value.find(g => g.class === classKey);
  if (!group) return;

  const newState = !group.selected;
  group.selected = newState;
  group.indeterminate = false;
  group.items.forEach(i => i.selected = newState);
  updateMapFromSelection();
}

function onItemToggle(item) {
  const group = groupedData.value.find(g => g.class === item.class);
  if (group) {
    const all = group.items.every(i => i.selected);
    const some = group.items.some(i => i.selected);
    group.selected = all;
    group.indeterminate = some && !all;
  }
  updateMapFromSelection();
}

// Handle click on an item (zoom to bounds and show popup)
function onItemClick(item) {
  if (!item.data || !item.data.dbGeoJson) return;

  // If the item is not selected (not visible on map), make it visible first
  if (!item.selected) {
    item.selected = true;
    onItemToggle(item); // Update group state and map
  }

  const tempLayer = L.geoJSON(item.data.dbGeoJson);
  try {
    const bounds = tempLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });

      // Show popup at the center of the airspace
      const center = bounds.getCenter();
      const popupContent = '<div class="airspace-popup">' + formatAirspacePopup(item.data) + '</div>';
      L.popup()
        .setLatLng(center)
        .setContent(popupContent)
        .openOn(map);
    }
  } catch (e) {
    console.warn('Could not fit bounds', e);
  }
}


// --- Map Interaction ---

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
  // Reset selection state
  isSelecting.value = false;
  hasSelectionSnapshot.value = false;
  airspacesSnapshot = null;
}

// --- Zone Selection ---

function enableZoneSelection() {
  if (!map || !hasData.value) return;

  // Save snapshot of current airspaces for potential cancellation
  airspacesSnapshot = JSON.parse(JSON.stringify(rawAirspaces.value));
  hasSelectionSnapshot.value = true;
  isSelecting.value = true;

  showMessage($gettext('Click and drag to draw a selection rectangle'), 'info');

  // Change cursor to crosshair
  map.getContainer().style.cursor = 'crosshair';

  // Disable map dragging during selection
  map.dragging.disable();

  // Mouse down - start drawing
  const onMouseDown = (e) => {
    selectionStartPoint = e.latlng;

    // Create rectangle with zero size initially
    selectionRectangle = L.rectangle(
      [selectionStartPoint, selectionStartPoint],
      {
        color: '#3388ff',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.2,
        dashArray: '5, 5'
      }
    ).addTo(map);

    // Listen for mouse move
    map.on('mousemove', onMouseMove);
    map.once('mouseup', onMouseUp);
  };

  // Mouse move - update rectangle
  const onMouseMove = (e) => {
    if (selectionRectangle && selectionStartPoint) {
      const bounds = L.latLngBounds(selectionStartPoint, e.latlng);
      selectionRectangle.setBounds(bounds);
    }
  };

  // Mouse up - finish drawing
  const onMouseUp = (e) => {
    map.off('mousemove', onMouseMove);
    map.off('mousedown', onMouseDown);

    // Re-enable map dragging
    map.dragging.enable();
    map.getContainer().style.cursor = '';

    if (selectionRectangle && selectionStartPoint) {
      const bounds = L.latLngBounds(selectionStartPoint, e.latlng);

      // Remove the visual rectangle
      map.removeLayer(selectionRectangle);
      selectionRectangle = null;
      selectionStartPoint = null;

      // Check if rectangle is big enough (avoid accidental clicks)
      const size = map.latLngToLayerPoint(bounds.getNorthEast())
        .distanceTo(map.latLngToLayerPoint(bounds.getSouthWest()));

      if (size > 10) {
        // Apply the zone selection filter
        applyZoneSelection(bounds);
      } else {
        showMessage($gettext('Selection too small, please draw a larger rectangle'), 'warning');
      }
    }

    isSelecting.value = false;
  };

  // Handle escape key to cancel
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      cancelDrawing();
    }
  };

  const cancelDrawing = () => {
    map.off('mousedown', onMouseDown);
    map.off('mousemove', onMouseMove);
    map.off('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDown);

    if (selectionRectangle) {
      map.removeLayer(selectionRectangle);
      selectionRectangle = null;
    }
    selectionStartPoint = null;

    map.dragging.enable();
    map.getContainer().style.cursor = '';
    isSelecting.value = false;

    showMessage($gettext('Selection cancelled'), 'info');
  };

  document.addEventListener('keydown', onKeyDown);
  map.once('mousedown', onMouseDown);
}

function applyZoneSelection(bounds) {
  console.log('Selection bounds:', {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth()
  });

  // Filter airspaces whose centroid is INSIDE the selection rectangle
  // Using direct coordinate comparison for reliability
  const filteredAirspaces = rawAirspaces.value.filter(as => {
    if (!as.dbGeoJson) return false;
    try {
      // Calculate the centroid (center point) of the airspace
      const center = centroid(as.dbGeoJson);
      const [lng, lat] = center.geometry.coordinates;

      // Check if centroid is within bounds
      const isInside = (
        lng >= bounds.getWest() &&
        lng <= bounds.getEast() &&
        lat >= bounds.getSouth() &&
        lat <= bounds.getNorth()
      );

      if (isInside) {
        console.log('Keeping:', as.name, 'centroid:', [lng, lat]);
      }

      return isInside;
    } catch (err) {
      console.warn('Centroid check failed for', as.name, err);
      return false;
    }
  });

  const removedCount = rawAirspaces.value.length - filteredAirspaces.length;
  console.log('Filtered:', filteredAirspaces.length, 'Removed:', removedCount);

  if (filteredAirspaces.length === 0) {
    showMessage($gettext('No airspaces in selection area'), 'warning');
    return;
  }

  // Update rawAirspaces with filtered list
  rawAirspaces.value = filteredAirspaces;

  // Rebuild grouped data and map
  applyFilters();

  // Fit map to the new bounds
  if (mapLayers.size > 0) {
    const group = L.featureGroup(Array.from(mapLayers.values()));
    map.fitBounds(group.getBounds(), { padding: [50, 50] });
  }

  showMessage(`${filteredAirspaces.length} ${$gettext('airspaces kept')}, ${removedCount} ${$gettext('removed')}`, 'success');
}

function cancelZoneSelection() {
  if (!airspacesSnapshot) return;

  // Restore the snapshot
  rawAirspaces.value = airspacesSnapshot;
  airspacesSnapshot = null;
  hasSelectionSnapshot.value = false;

  // Rebuild grouped data and map
  applyFilters();

  // Fit map to restored bounds
  if (mapLayers.size > 0) {
    const group = L.featureGroup(Array.from(mapLayers.values()));
    map.fitBounds(group.getBounds(), { padding: [50, 50] });
  }

  showMessage($gettext('Selection cancelled, airspaces restored'), 'info');
}

</script>


<style scoped>
/* 
 * Layout Strategy:
 * - Root container fills available space
 * - Toolbar is at top with fixed height
 * - Content area uses flex to fill remaining space
 * - Left panel has a fixed header and virtual scroll list
 * - Map fills its container
 */

.airspaces-view-root {
  position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Toolbar - fixed at top, never scrolls or moves */
.airspaces-view-root :deep(.v-toolbar) {
  flex-shrink: 0;
  z-index: 100;
}

.content-wrapper {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

/* Left panel with virtual scroll */
.left-panel {
  width: 25%;
  min-width: 300px;
  max-width: 400px;
  height: 100%;
  border-right: 1px solid #ddd;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Fixed header at top of left panel */
.list-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ddd;
  flex-shrink: 0;
}

/* Virtual scroll takes remaining height */
.virtual-list {
  /* Prevents flex item from expanding */
  overflow-y: auto;
}

/* Common list item styles */
.list-item {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.list-item:hover {
  background-color: #e8f4fc;
}

/* Class header styling */
.class-header {
  background-color: #f5f5f5;
  font-weight: 500;
}

.class-header:hover {
  background-color: #e0e0e0;
}

/* Airspace item styling */
.airspace-item {
  padding-left: 24px;
}

.airspace-item.item-selected {
  background-color: #e3f2fd;
}

/* Class badge */
.class-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 24px;
  padding: 0 6px;
  border-radius: 4px;
  color: white;
  font-weight: bold;
  font-size: 12px;
  margin-right: 10px;
  flex-shrink: 0;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

.class-badge.small {
  min-width: 24px;
  height: 20px;
  font-size: 11px;
  margin-right: 8px;
}

/* Item name */
.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

/* Map area */
.right-panel {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-width: 0;
}

.map-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.gap-4 {
  gap: 16px;
}

/* Scrollbar styling for virtual list */
.virtual-list::-webkit-scrollbar {
  width: 8px;
}

.virtual-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.virtual-list::-webkit-scrollbar-thumb {
  background: #bbb;
  border-radius: 4px;
}

.virtual-list::-webkit-scrollbar-thumb:hover {
  background: #888;
}

/* Custom Popup Style */
:deep(.leaflet-popup-content-wrapper) {
  padding: 0;
  overflow: hidden;
  border-radius: 8px;
}

:deep(.leaflet-popup-content) {
  margin: 0;
  width: 300px !important;
  max-height: 400px;
  overflow-y: auto;
}

/* Scrollbar styling for popup */
:deep(.leaflet-popup-content)::-webkit-scrollbar {
  width: 6px;
}

:deep(.leaflet-popup-content)::-webkit-scrollbar-track {
  background: #f1f1f1;
}

:deep(.leaflet-popup-content)::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

:deep(.leaflet-popup-content)::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* Leaflet Draw styles for rectangle selection */
:deep(.leaflet-draw-section) {
  display: none !important;
}

:deep(.leaflet-draw-tooltip) {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

:deep(.leaflet-draw-tooltip-single) {
  margin-top: -12px;
  margin-left: 20px;
}

:deep(.leaflet-mouse-marker) {
  cursor: crosshair !important;
}

/* Make the drawing rectangle visible */
:deep(.leaflet-draw-guide-dash) {
  stroke: #3388ff;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
}

:deep(.leaflet-interactive.leaflet-draw-marker) {
  cursor: crosshair;
}
</style>