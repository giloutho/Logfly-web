<template>
  <div class="xcnav-view-root">
    <!-- Snackbar for messages -->
    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor" location="top">
      {{ snackbarMessage }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">{{ $gettext('Close') }}</v-btn>
      </template>
    </v-snackbar>

    <!-- Toolbar -->
    <v-toolbar density="compact" color="surface" class="border-b" elevation="2">
      <v-btn prepend-icon="mdi-routes" variant="text" @click="loadRoute">
        {{ $gettext('Route') }}
      </v-btn>

      <v-btn prepend-icon="mdi-chart-line" variant="text" @click="loadTrack">
        {{ $gettext('Track') }}
      </v-btn>

      <v-btn prepend-icon="mdi-airplane" variant="text" @click="openAirspaceDialog">
        {{ $gettext('Airspaces') }}
      </v-btn>

      <v-divider vertical class="mx-2"></v-divider>

      <!-- Route file name -->
      <div v-if="currentFileName" class="font-weight-medium text-primary mx-2">
        {{ currentFileName }}
      </div>

      <v-spacer></v-spacer>
    </v-toolbar>

    <!-- Info Bar -->
    <div class="info-bar">
      <div class="info-bar-content">
        <!-- Total distance -->
        <div class="info-item">
          <span class="info-label">{{ $gettext('Total distance') }}:</span>
          <span class="info-value">{{ totalDistance.toFixed(1) }}</span>
          <span class="info-unit">km</span>
        </div>

        <!-- Duration -->
        <div class="info-item">
          <span class="info-label">{{ $gettext('Duration') }}:</span>
          <span class="info-value">{{ formattedDuration }}</span>
        </div>

        <!-- Speed control -->
        <div class="info-item">
          <span class="info-label">{{ $gettext('Speed') }} (km/h):</span>
          <v-btn icon="mdi-minus" size="x-small" variant="flat" color="primary" @click="decreaseSpeed"></v-btn>
          <span class="info-value speed-value">{{ speed }}</span>
          <v-btn icon="mdi-plus" size="x-small" variant="flat" color="primary" @click="increaseSpeed"></v-btn>
        </div>

        <v-divider vertical class="mx-3"></v-divider>

        <!-- Scoring toggle -->
        <v-checkbox v-model="scoringEnabled" :label="$gettext('Scoring')" hide-details density="compact"
          class="scoring-checkbox"></v-checkbox>

        <!-- League selector -->
        <v-select v-model="selectedLeague" :items="leagues" item-title="title" item-value="value" density="compact"
          variant="outlined" hide-details class="league-select" :disabled="!scoringEnabled"></v-select>

        <v-divider vertical class="mx-3"></v-divider>

        <!-- Scoring results -->
        <div class="info-item">
          <v-chip size="small" color="secondary" variant="flat">
            {{ scoringType }}
          </v-chip>
        </div>

        <div class="info-item">
          <span class="info-label">{{ $gettext('Distance') }}:</span>
          <span class="info-value">{{ scoringDistance.toFixed(1) }}</span>
          <span class="info-unit">km</span>
        </div>

        <div class="info-item">
          <span class="info-label">{{ $gettext('Points') }}:</span>
          <span class="info-value scoring-points">{{ scoringPoints.toFixed(1) }}</span>
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <v-progress-circular v-if="loading" indeterminate color="primary" class="loading-spinner"></v-progress-circular>

    <!-- Main content -->
    <div class="content-wrapper">
      <!-- Tools sidebar -->
      <div class="tools-sidebar">
        <v-tooltip location="right" :text="$gettext('Draw route')">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" :icon="isDrawing ? 'mdi-pencil-off' : 'mdi-pencil'"
              :color="isDrawing ? 'warning' : 'primary'" variant="flat" size="large" class="tool-btn"
              @click="toggleDrawing"></v-btn>
          </template>
        </v-tooltip>

        <v-tooltip location="right" :text="$gettext('Add marker')">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon="mdi-map-marker-plus" :color="isAddingMarker ? 'warning' : 'default'"
              variant="flat" size="large" class="tool-btn" @click="toggleMarkerMode"></v-btn>
          </template>
        </v-tooltip>

        <v-divider class="my-2"></v-divider>

        <v-tooltip location="right" :text="$gettext('Clear route')">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon="mdi-trash-can-outline" color="error" variant="flat" size="large"
              class="tool-btn" :disabled="routePoints.length === 0" @click="clearRoute"></v-btn>
          </template>
        </v-tooltip>

        <v-tooltip location="right" :text="$gettext('Save route')">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon="mdi-content-save" color="success" variant="flat" size="large" class="tool-btn"
              :disabled="routePoints.length < 2" @click="openSaveDialog"></v-btn>
          </template>
        </v-tooltip>

        <v-divider class="my-2"></v-divider>

        <v-tooltip location="right" :text="$gettext('Measure')">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon="mdi-ruler" :color="isMeasuring ? 'warning' : 'default'" variant="flat"
              size="large" class="tool-btn" @click="toggleMeasure"></v-btn>
          </template>
        </v-tooltip>

        <v-tooltip location="right" :text="$gettext('Center on route')">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon="mdi-crosshairs-gps" variant="flat" size="large" class="tool-btn"
              :disabled="routePoints.length === 0" @click="centerOnRoute"></v-btn>
          </template>
        </v-tooltip>
      </div>

      <!-- Map container -->
      <div class="map-wrapper">
        <div id="xcnav-map" class="map-container"></div>
      </div>
    </div>

    <!-- Save dialog -->
    <v-dialog v-model="saveDialogOpen" max-width="400">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-content-save</v-icon>
          {{ $gettext('Save route') }}
        </v-card-title>
        <v-card-text>
          <v-checkbox v-model="includeMarkers" :label="$gettext('Include markers')" hide-details
            :disabled="markers.length === 0"></v-checkbox>
          <v-select v-model="selectedExportFormat" :items="exportFormats" item-title="title" item-value="value"
            :label="$gettext('Export format')" class="mt-4"></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="saveDialogOpen = false">{{ $gettext('Cancel') }}</v-btn>
          <v-btn color="success" variant="flat" @click="doExportRoute">{{ $gettext('Save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Airspace Dialog (reused component) -->
    <!-- TODO: Integrate AirspaceDialog component -->

    <!-- Hidden file inputs -->
    <input type="file" ref="routeFileInput" style="display: none" accept=".gpx,.cup,.kml,.xctsk,.wpt"
      @change="onRouteFileChange" />
    <input type="file" ref="trackFileInput" style="display: none" accept=".igc,.gpx" @change="onTrackFileChange" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useGettext } from "vue3-gettext";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';
import { navScoring, getScoringTypeLabel } from '@/js/routing/nav-scoring.js';
import { readRouteFile, getFormatLabel } from '@/js/xcnav/rte-read.js';
import { exportRoute, downloadFile, getExportFormats } from '@/js/xcnav/rte-write.js';
import { IGCDecoder } from '@/js/igc/igc-decoder.js';

const { $gettext } = useGettext();

// --- State ---
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('info');
const loading = ref(false);

// File inputs
const routeFileInput = ref(null);
const trackFileInput = ref(null);
const currentFileName = ref('');

// Map
let map = null;
let polyline = null;
let tempLine = null;
let arrowDecorator = null;
let closingCircle = null;

// Vertex markers (editable points)
let vertexMarkers = [];       // L.CircleMarker for each route point
let midpointMarkers = [];     // L.CircleMarker for segment midpoints
let segmentLabels = [];       // L.Tooltip for distance labels

// Drag state
let isDraggingVertex = false;
let draggingVertexIndex = -1;

// Layer groups
let scoreGroup = null;
let scoringLineLayer = null;
let scoringPointsLayer = null;
let markerGroup = null;
let trackGroup = null;
let thermalGroup = null;
let airspaceGroup = null;

// Route state
const routePoints = ref([]);  // Array of { lat, lng }
const markers = ref([]);      // Array of L.Marker
const isDrawing = ref(false);
const isAddingMarker = ref(false);
const isMeasuring = ref(false);

// Info bar state
const speed = ref(20);
const totalDistance = ref(0);
const scoringEnabled = ref(true);
const selectedLeague = ref('XContest');
const scoringType = ref($gettext('Open distance'));
const scoringDistance = ref(0);
const scoringPoints = ref(0);

// Leagues
const leagues = [
  { title: 'FFVL', value: 'FFVL' },
  { title: 'XContest', value: 'XContest' },
  { title: 'FAI', value: 'FAI/OLC' },
  { title: 'XCLeague', value: 'XCLeague' }
];

// Save dialog
const saveDialogOpen = ref(false);
const includeMarkers = ref(false);
const selectedExportFormat = ref('gpx');
const exportFormats = [
  { title: 'GPX (route)', value: 'gpx' },
  { title: 'GPX + markers', value: 'gpx-markers' },
  { title: 'GPX (waypoints)', value: 'gpx-wpt' },
  { title: 'SeeYou CUP', value: 'cup' },
  { title: 'Google Earth KML', value: 'kml' },
  { title: 'XCTrack', value: 'xctsk' },
  { title: 'GPSDump', value: 'wpt' }
];

// --- Computed ---
const formattedDuration = computed(() => {
  if (totalDistance.value === 0 || speed.value === 0) return '0:00';
  const hours = totalDistance.value / speed.value;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
});

// --- Lifecycle ---
onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (map) {
    map.off();
    map.remove();
  }
});

// Watch for scoring changes (debounced to avoid excessive calculations)
watch([routePoints, selectedLeague, scoringEnabled], () => {
  if (scoringEnabled.value && routePoints.value.length >= 2) {
    debouncedCalculateScoring();
  } else {
    clearScoringLayers();
    scoringDistance.value = 0;
    scoringPoints.value = 0;
    scoringType.value = $gettext('Open distance');
  }
}, { deep: true });

// --- Methods ---

function showMessage(msg, color = 'info') {
  snackbarMessage.value = msg;
  snackbarColor.value = color;
  snackbar.value = true;
}

function initMap() {
  map = L.map('xcnav-map').setView([45.8326, 6.865], 10);

  // Base layers
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  });
  const openTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM'
  });

  osm.addTo(map);

  // Layer control
  const baseMaps = {
    "OpenStreetMap": osm,
    "OpenTopoMap": openTopo
  };

  // Overlay layers
  scoreGroup = L.layerGroup().addTo(map);
  markerGroup = L.layerGroup();
  trackGroup = L.layerGroup();
  thermalGroup = L.layerGroup();
  airspaceGroup = L.layerGroup();

  // Thermal overlay (kk7)
  const kk7Layer = L.tileLayer('https://thermal.kk7.ch/tiles/skyways_all_all/{z}/{x}/{y}.png?src=logfly.org', {
    attribution: 'thermal.kk7.ch',
    maxNativeZoom: 13,
    tms: true,
    opacity: 0.3
  });
  const kk7Group = L.layerGroup([kk7Layer]);

  const overlayMaps = {
    [$gettext('Score')]: scoreGroup,
    [$gettext('Waypoints')]: markerGroup,
    [$gettext('Tracks')]: trackGroup,
    [$gettext('Thermals')]: thermalGroup,
    [$gettext('Airspaces')]: airspaceGroup,
    "Thermal.kk7.ch": kk7Group
  };

  L.control.layers(baseMaps, overlayMaps).addTo(map);

  // Map events
  map.on('click', onMapClick);
  map.on('mousemove', onMouseMove);

  // Keyboard events
  document.addEventListener('keydown', onKeyDown);
}

// --- Drawing ---

function toggleDrawing() {
  if (isDrawing.value) {
    stopDrawing();
  } else {
    startDrawing();
  }
}

function startDrawing() {
  isDrawing.value = true;
  isAddingMarker.value = false;
  isMeasuring.value = false;
  map.getContainer().style.cursor = 'crosshair';
  showMessage($gettext('Click on map to add route points. Press Escape to finish.'), 'info');
}

function stopDrawing() {
  isDrawing.value = false;
  map.getContainer().style.cursor = '';

  // Remove temp line
  if (tempLine) {
    map.removeLayer(tempLine);
    tempLine = null;
  }

  if (routePoints.value.length >= 2) {
    showMessage(`${$gettext('Route created with')} ${routePoints.value.length} ${$gettext('points')}`, 'success');
  }
}

function onMapClick(e) {
  if (isDrawing.value) {
    addRoutePoint(e.latlng.lat, e.latlng.lng);
  } else if (isAddingMarker.value) {
    addMarker(e.latlng.lat, e.latlng.lng);
    isAddingMarker.value = false;
    map.getContainer().style.cursor = '';
  }
}

function onMouseMove(e) {
  if (!isDrawing.value || routePoints.value.length === 0) return;

  const lastPoint = routePoints.value[routePoints.value.length - 1];

  if (tempLine) {
    tempLine.setLatLngs([
      [lastPoint.lat, lastPoint.lng],
      [e.latlng.lat, e.latlng.lng]
    ]);
  } else {
    tempLine = L.polyline([
      [lastPoint.lat, lastPoint.lng],
      [e.latlng.lat, e.latlng.lng]
    ], {
      color: '#3388ff',
      weight: 2,
      dashArray: '5, 10',
      opacity: 0.7
    }).addTo(map);
  }
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    if (isDrawing.value) {
      stopDrawing();
    }
    if (isAddingMarker.value) {
      isAddingMarker.value = false;
      map.getContainer().style.cursor = '';
    }
  }
}

function addRoutePoint(lat, lng) {
  routePoints.value.push({ lat, lng });
  updatePolyline();
  updateTotalDistance();
}

function updatePolyline() {
  const latlngs = routePoints.value.map(p => [p.lat, p.lng]);

  if (polyline) {
    polyline.setLatLngs(latlngs);
  } else {
    polyline = L.polyline(latlngs, {
      color: '#3388ff',
      weight: 3,
      opacity: 0.9
    }).addTo(map);
  }

  updateVertexMarkers();
  updateMidpointMarkers();
  updateSegmentLabels();
  updateArrows();
  updateClosingCircle();
}

function updateVertexMarkers() {
  // Clear existing vertex markers
  vertexMarkers.forEach(m => map.removeLayer(m));
  vertexMarkers = [];

  // Create vertex markers for each route point
  routePoints.value.forEach((point, index) => {
    const isFirst = index === 0;
    const isLast = index === routePoints.value.length - 1;

    const marker = L.circleMarker([point.lat, point.lng], {
      radius: isFirst || isLast ? 8 : 6,
      fillColor: isFirst ? '#28a745' : (isLast ? '#ff6b6b' : '#3388ff'),
      color: '#fff',
      weight: 2,
      fillOpacity: 1,
      className: 'vertex-marker'
    }).addTo(map);

    // Make vertex draggable
    marker.on('mousedown', (e) => {
      if (!isDrawing.value) {
        L.DomEvent.stopPropagation(e);
        startDragVertex(index);
      }
    });

    // Click to delete (except first point if more than 2 points)
    marker.on('click', (e) => {
      if (!isDrawing.value && !isDraggingVertex && routePoints.value.length > 2 && index !== 0) {
        L.DomEvent.stopPropagation(e);
        deleteVertex(index);
      }
    });

    // Ctrl/Cmd + click on last point to continue drawing
    marker.on('click', (e) => {
      if (isLast && (e.originalEvent.ctrlKey || e.originalEvent.metaKey)) {
        L.DomEvent.stopPropagation(e);
        startDrawing();
        showMessage($gettext('Continue drawing from last point'), 'info');
      }
    });

    // Tooltip with point info
    const tooltipContent = isFirst ? $gettext('Start') :
      isLast ? `${$gettext('End')} - ${totalDistance.value.toFixed(1)} km` :
        `${$gettext('Point')} ${index + 1}`;
    marker.bindTooltip(tooltipContent, { permanent: false, direction: 'top', offset: [0, -8] });

    vertexMarkers.push(marker);
  });
}

function updateMidpointMarkers() {
  // Clear existing midpoint markers
  midpointMarkers.forEach(m => map.removeLayer(m));
  midpointMarkers = [];

  if (routePoints.value.length < 2) return;

  // Create midpoint markers for segment insertion
  for (let i = 0; i < routePoints.value.length - 1; i++) {
    const p1 = routePoints.value[i];
    const p2 = routePoints.value[i + 1];
    const midLat = (p1.lat + p2.lat) / 2;
    const midLng = (p1.lng + p2.lng) / 2;

    const marker = L.circleMarker([midLat, midLng], {
      radius: 5,
      fillColor: '#aaa',
      color: '#fff',
      weight: 1,
      fillOpacity: 0.7,
      className: 'midpoint-marker'
    }).addTo(map);

    // Click to insert a new point
    const segmentIndex = i;
    marker.on('mousedown', (e) => {
      if (!isDrawing.value) {
        L.DomEvent.stopPropagation(e);
        startDragMidpoint(segmentIndex, midLat, midLng);
      }
    });

    marker.bindTooltip($gettext('Drag to insert point'), { permanent: false, direction: 'top', offset: [0, -6] });

    midpointMarkers.push(marker);
  }
}

function updateSegmentLabels() {
  // Clear existing labels
  segmentLabels.forEach(l => map.removeLayer(l));
  segmentLabels = [];

  if (routePoints.value.length < 2) return;

  // Create distance labels for each segment
  for (let i = 0; i < routePoints.value.length - 1; i++) {
    const p1 = routePoints.value[i];
    const p2 = routePoints.value[i + 1];
    const midLat = (p1.lat + p2.lat) / 2;
    const midLng = (p1.lng + p2.lng) / 2;

    const segmentDist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);

    const label = L.tooltip({
      permanent: true,
      direction: 'center',
      className: 'segment-label'
    })
      .setLatLng([midLat, midLng])
      .setContent(`${segmentDist.toFixed(1)} km`)
      .addTo(map);

    segmentLabels.push(label);
  }
}

function startDragVertex(index) {
  isDraggingVertex = true;
  draggingVertexIndex = index;
  map.getContainer().style.cursor = 'grabbing';

  // Add mousemove and mouseup handlers to map
  map.on('mousemove', onDragVertex);
  map.on('mouseup', stopDragVertex);
}

function onDragVertex(e) {
  if (!isDraggingVertex || draggingVertexIndex < 0) return;

  // Update the point position
  routePoints.value[draggingVertexIndex] = {
    lat: e.latlng.lat,
    lng: e.latlng.lng
  };

  // Update polyline in real-time
  const latlngs = routePoints.value.map(p => [p.lat, p.lng]);
  if (polyline) {
    polyline.setLatLngs(latlngs);
  }

  // Update the vertex marker position
  if (vertexMarkers[draggingVertexIndex]) {
    vertexMarkers[draggingVertexIndex].setLatLng([e.latlng.lat, e.latlng.lng]);
  }
}

function stopDragVertex() {
  if (!isDraggingVertex) return;

  isDraggingVertex = false;
  draggingVertexIndex = -1;
  map.getContainer().style.cursor = '';

  // Remove drag handlers
  map.off('mousemove', onDragVertex);
  map.off('mouseup', stopDragVertex);

  // Full update
  updatePolyline();
  updateTotalDistance();
}

function startDragMidpoint(segmentIndex, lat, lng) {
  // Insert a new point at the midpoint position
  routePoints.value.splice(segmentIndex + 1, 0, { lat, lng });

  // Start dragging the newly inserted point
  updatePolyline();
  updateTotalDistance();

  // Start dragging the new vertex
  startDragVertex(segmentIndex + 1);
}

function deleteVertex(index) {
  if (routePoints.value.length <= 2) {
    showMessage($gettext('Cannot delete: minimum 2 points required'), 'warning');
    return;
  }
  if (index === 0) {
    showMessage($gettext('Cannot delete the start point'), 'warning');
    return;
  }

  routePoints.value.splice(index, 1);
  updatePolyline();
  updateTotalDistance();
  showMessage($gettext('Point deleted'), 'info');
}

function updateArrows() {
  // Remove existing arrow decorator
  if (arrowDecorator) {
    map.removeLayer(arrowDecorator);
    arrowDecorator = null;
  }

  if (!polyline || routePoints.value.length < 2) return;

  // Add arrow decorator
  arrowDecorator = L.polylineDecorator(polyline, {
    patterns: [
      {
        offset: 25,
        repeat: 100,
        symbol: L.Symbol.arrowHead({
          pixelSize: 12,
          polygon: false,
          pathOptions: {
            stroke: true,
            color: '#3388ff',
            weight: 2,
            fillOpacity: 1
          }
        })
      }
    ]
  }).addTo(map);
}

function updateClosingCircle() {
  if (routePoints.value.length < 2) {
    if (closingCircle) {
      map.removeLayer(closingCircle);
      closingCircle = null;
    }
    return;
  }

  const firstPoint = routePoints.value[0];
  // Radius depends on league rules, default 3km for FAI
  const radius = 3000;

  if (closingCircle) {
    closingCircle.setLatLng([firstPoint.lat, firstPoint.lng]);
  } else {
    closingCircle = L.circle([firstPoint.lat, firstPoint.lng], {
      radius: radius,
      color: '#ffd700',
      fillColor: '#ffd700',
      fillOpacity: 0.2,
      weight: 2
    }).addTo(scoreGroup);
  }
}

function updateTotalDistance() {
  let distance = 0;
  for (let i = 1; i < routePoints.value.length; i++) {
    const p1 = routePoints.value[i - 1];
    const p2 = routePoints.value[i];
    distance += calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
  }
  totalDistance.value = distance;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function clearRoute() {
  routePoints.value = [];
  totalDistance.value = 0;
  scoringDistance.value = 0;
  scoringPoints.value = 0;
  scoringType.value = $gettext('Open distance');

  if (polyline) {
    map.removeLayer(polyline);
    polyline = null;
  }
  if (tempLine) {
    map.removeLayer(tempLine);
    tempLine = null;
  }
  if (arrowDecorator) {
    map.removeLayer(arrowDecorator);
    arrowDecorator = null;
  }
  if (closingCircle) {
    map.removeLayer(closingCircle);
    closingCircle = null;
  }

  // Clear vertex markers
  vertexMarkers.forEach(m => map.removeLayer(m));
  vertexMarkers = [];

  // Clear midpoint markers
  midpointMarkers.forEach(m => map.removeLayer(m));
  midpointMarkers = [];

  // Clear segment labels
  segmentLabels.forEach(l => map.removeLayer(l));
  segmentLabels = [];

  // Clear markers
  markers.value.forEach(m => map.removeLayer(m));
  markers.value = [];

  // Clear score layers
  clearScoringLayers();
  scoreGroup.clearLayers();

  showMessage($gettext('Route cleared'), 'info');
}

function centerOnRoute() {
  if (routePoints.value.length === 0) return;

  if (polyline) {
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
  }
}

// --- Markers ---

function toggleMarkerMode() {
  isAddingMarker.value = !isAddingMarker.value;
  isDrawing.value = false;
  isMeasuring.value = false;

  if (isAddingMarker.value) {
    map.getContainer().style.cursor = 'crosshair';
    showMessage($gettext('Click on map to add a marker'), 'info');
  } else {
    map.getContainer().style.cursor = '';
  }
}

function addMarker(lat, lng) {
  const marker = L.marker([lat, lng], {
    draggable: true
  });

  const markerIndex = markers.value.length;

  const popupContent = `
    <div style="text-align: center;">
      <strong>Marker ${markerIndex + 1}</strong><br/>
      <button class="marker-delete-btn" onclick="window.deleteMarker(${markerIndex})">
        ${$gettext('Delete')}
      </button>
    </div>
  `;

  marker.bindPopup(popupContent);
  marker.addTo(markerGroup);
  markers.value.push(marker);

  if (!map.hasLayer(markerGroup)) {
    markerGroup.addTo(map);
  }

  showMessage($gettext('Marker added'), 'success');
}

// Global function for popup button
window.deleteMarker = (index) => {
  if (markers.value[index]) {
    markerGroup.removeLayer(markers.value[index]);
    markers.value[index] = null;
  }
};

// --- Measure ---

function toggleMeasure() {
  isMeasuring.value = !isMeasuring.value;
  isDrawing.value = false;
  isAddingMarker.value = false;
  // TODO: Implement measure tool
  if (isMeasuring.value) {
    showMessage($gettext('Measure tool - Coming soon'), 'info');
  }
}

// --- Speed control ---

function increaseSpeed() {
  if (speed.value < 50) {
    speed.value += 5;
  }
}

function decreaseSpeed() {
  if (speed.value > 5) {
    speed.value -= 5;
  }
}

// --- Scoring ---

let scoringDebounceTimer = null;

function debouncedCalculateScoring() {
  if (scoringDebounceTimer) {
    clearTimeout(scoringDebounceTimer);
  }
  scoringDebounceTimer = setTimeout(() => {
    calculateScoring();
  }, 300);
}

async function calculateScoring() {
  // Clear existing scoring layers
  clearScoringLayers();

  if (!scoringEnabled.value || routePoints.value.length < 2) {
    scoringDistance.value = 0;
    scoringPoints.value = 0;
    scoringType.value = $gettext('Open distance');
    return;
  }

  try {
    const result = await navScoring({
      route: routePoints.value,
      speed: speed.value,
      league: selectedLeague.value
    });

    if (result.success) {
      // Update info bar values
      scoringDistance.value = result.distance || 0;
      scoringPoints.value = result.score || 0;
      scoringType.value = getScoringTypeLabel(result.type, $gettext);

      // Display scoring on map
      displayScoringOnMap(result.geojson);
    } else {
      // Fallback to simple distance calculation
      scoringDistance.value = totalDistance.value;
      scoringPoints.value = 0;
      scoringType.value = $gettext('Open distance');
    }
  } catch (error) {
    console.error('[XcnavView] Scoring error:', error);
    scoringDistance.value = totalDistance.value;
    scoringPoints.value = 0;
    scoringType.value = $gettext('Open distance');
  }
}

function clearScoringLayers() {
  if (scoringLineLayer) {
    scoreGroup.removeLayer(scoringLineLayer);
    scoringLineLayer = null;
  }
  if (scoringPointsLayer) {
    scoreGroup.removeLayer(scoringPointsLayer);
    scoringPointsLayer = null;
  }
}

function displayScoringOnMap(geojson) {
  if (!geojson || !geojson.features) return;

  // Style definitions for scoring elements
  const lineStyle = {
    color: '#ff6b35',
    weight: 3,
    opacity: 0.9,
    dashArray: '8, 4'
  };

  const pointStyle = {
    radius: 8,
    fillColor: '#ff6b35',
    color: '#fff',
    weight: 2,
    fillOpacity: 0.9
  };

  const polygonStyle = {
    color: '#ffd700',
    weight: 2,
    fillColor: '#ffd700',
    fillOpacity: 0.15
  };

  // Create GeoJSON layer with custom styling
  scoringLineLayer = L.geoJSON(geojson, {
    style: function (feature) {
      if (feature.geometry.type === 'LineString') {
        return lineStyle;
      } else if (feature.geometry.type === 'Polygon') {
        return polygonStyle;
      }
      return {};
    },
    pointToLayer: function (feature, latlng) {
      const marker = L.circleMarker(latlng, pointStyle);
      if (feature.properties && feature.properties.popupContent) {
        marker.bindPopup(feature.properties.popupContent);
      }
      return marker;
    },
    onEachFeature: function (feature, layer) {
      // Add popups for lines
      if (feature.geometry.type === 'LineString' && feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent);
      }
    },
    filter: function (feature) {
      // Filter out certain features if needed
      return true;
    }
  });

  scoringLineLayer.addTo(scoreGroup);
}

// --- File I/O ---

function loadRoute() {
  routeFileInput.value.click();
}

function loadTrack() {
  trackFileInput.value.click();
}

async function onRouteFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  loading.value = true;
  currentFileName.value = file.name;

  try {
    const content = await file.text();
    const result = readRouteFile(content, file.name);

    if (result.success && result.route.length > 0) {
      // Clear existing route
      clearRouteOnly();

      // Add loaded points to route
      result.route.forEach(point => {
        routePoints.value.push({
          lat: point.lat,
          lng: point.lng,
          name: point.name,
          altitude: point.altitude
        });
      });

      // Update display
      updatePolyline();
      updateTotalDistance();

      // Center on route
      if (polyline) {
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }

      showMessage(`${$gettext('Route loaded')}: ${result.route.length} ${$gettext('points')} (${getFormatLabel(result.format)})`, 'success');
    } else {
      showMessage(result.error || $gettext('No route found in file'), 'warning');
    }
  } catch (error) {
    console.error('[XcnavView] Error loading route:', error);
    showMessage($gettext('Error loading route'), 'error');
  } finally {
    loading.value = false;
    event.target.value = '';
  }
}

async function onTrackFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  loading.value = true;

  try {
    const content = await file.text();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.igc')) {
      // Parse IGC file
      const decoder = new IGCDecoder(content);
      const parseResult = decoder.parse();

      if (parseResult && decoder.fixes && decoder.fixes.length > 0) {
        displayTrack(decoder.fixes, decoder.info);
        showMessage(`${$gettext('Track loaded')}: ${decoder.info.pilot || 'Unknown pilot'} - ${decoder.info.date}`, 'success');
      } else {
        showMessage($gettext('No valid track data found'), 'warning');
      }
    } else if (fileName.endsWith('.gpx')) {
      // Parse GPX track
      displayGpxTrack(content);
      showMessage($gettext('GPX track loaded'), 'success');
    } else {
      showMessage($gettext('Unsupported track format'), 'warning');
    }
  } catch (error) {
    console.error('[XcnavView] Error loading track:', error);
    showMessage($gettext('Error loading track'), 'error');
  } finally {
    loading.value = false;
    event.target.value = '';
  }
}

function displayTrack(fixes, info) {
  // Clear existing track
  trackGroup.clearLayers();

  // Create track polyline
  const trackPoints = fixes.map(fix => [fix.latitude, fix.longitude]);
  const trackLine = L.polyline(trackPoints, {
    color: '#ff9800',
    weight: 2,
    opacity: 0.8
  });

  trackLine.addTo(trackGroup);

  // Show track layer
  if (!map.hasLayer(trackGroup)) {
    trackGroup.addTo(map);
  }

  // Fit bounds if no route is displayed
  if (routePoints.value.length === 0) {
    map.fitBounds(trackLine.getBounds(), { padding: [50, 50] });
  }
}

function displayGpxTrack(content) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');
    const tracks = xmlDoc.getElementsByTagName('trk');

    trackGroup.clearLayers();

    for (let t = 0; t < tracks.length; t++) {
      const trkSegs = tracks[t].getElementsByTagName('trkseg');
      for (let s = 0; s < trkSegs.length; s++) {
        const trkPts = trkSegs[s].getElementsByTagName('trkpt');
        const trackPoints = [];

        for (let i = 0; i < trkPts.length; i++) {
          const pt = trkPts[i];
          trackPoints.push([
            parseFloat(pt.getAttribute('lat')),
            parseFloat(pt.getAttribute('lon'))
          ]);
        }

        if (trackPoints.length > 0) {
          const trackLine = L.polyline(trackPoints, {
            color: '#ff9800',
            weight: 2,
            opacity: 0.8
          });
          trackLine.addTo(trackGroup);
        }
      }
    }

    if (!map.hasLayer(trackGroup)) {
      trackGroup.addTo(map);
    }

    // Fit bounds if no route
    if (routePoints.value.length === 0 && trackGroup.getLayers().length > 0) {
      map.fitBounds(trackGroup.getBounds(), { padding: [50, 50] });
    }
  } catch (error) {
    console.error('[XcnavView] Error parsing GPX track:', error);
  }
}

function openAirspaceDialog() {
  // TODO: Integrate AirspaceDialog component
  showMessage($gettext('Airspace dialog - Coming soon'), 'info');
}

// --- Save/Export ---

function openSaveDialog() {
  includeMarkers.value = markers.value.filter(m => m !== null).length > 0;
  saveDialogOpen.value = true;
}

function doExportRoute() {
  if (routePoints.value.length < 2) {
    showMessage($gettext('Route must have at least 2 points'), 'warning');
    return;
  }

  const result = exportRoute({
    route: routePoints.value,
    markers: includeMarkers.value ? markers.value.filter(m => m !== null) : [],
    format: selectedExportFormat.value,
    name: currentFileName.value ? currentFileName.value.replace(/\.[^/.]+$/, '') : 'LogflyRoute',
    includeMarkers: includeMarkers.value
  });

  if (result.success) {
    const fileName = currentFileName.value ? currentFileName.value.replace(/\.[^/.]+$/, '') : 'LogflyRoute';
    downloadFile(result.content, fileName, result.extension, result.mimeType);
    showMessage($gettext('Route exported successfully'), 'success');
    saveDialogOpen.value = false;
  } else {
    showMessage(result.error || $gettext('Export failed'), 'error');
  }
}

// Clear route only (without markers)
function clearRouteOnly() {
  routePoints.value = [];
  totalDistance.value = 0;
  scoringDistance.value = 0;
  scoringPoints.value = 0;
  scoringType.value = $gettext('Open distance');

  if (polyline) {
    map.removeLayer(polyline);
    polyline = null;
  }
  if (tempLine) {
    map.removeLayer(tempLine);
    tempLine = null;
  }
  if (arrowDecorator) {
    map.removeLayer(arrowDecorator);
    arrowDecorator = null;
  }
  if (closingCircle) {
    map.removeLayer(closingCircle);
    closingCircle = null;
  }

  vertexMarkers.forEach(m => map.removeLayer(m));
  vertexMarkers = [];
  midpointMarkers.forEach(m => map.removeLayer(m));
  midpointMarkers = [];
  segmentLabels.forEach(l => map.removeLayer(l));
  segmentLabels = [];

  clearScoringLayers();
  scoreGroup.clearLayers();
}
</script>

<style scoped>
.xcnav-view-root {
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

/* Info Bar */
.info-bar {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  padding: 8px 16px;
  overflow-x: auto;
}

.info-bar-content {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: max-content;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-label {
  font-size: 0.85rem;
  color: #666;
}

.info-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
}

.info-unit {
  font-size: 0.8rem;
  color: #888;
}

.speed-value {
  min-width: 24px;
  text-align: center;
}

.scoring-points {
  color: #1976d2;
  font-size: 1.1rem;
}

.scoring-checkbox {
  margin: 0;
}

.league-select {
  width: 120px;
  min-width: 120px;
}

:deep(.league-select .v-field__input) {
  font-size: 0.85rem;
  padding: 4px 8px;
}

/* Content wrapper */
.content-wrapper {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* Tools sidebar */
.tools-sidebar {
  width: 56px;
  background: #f0f0f0;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  gap: 4px;
}

.tool-btn {
  width: 44px !important;
  height: 44px !important;
}

/* Map */
.map-wrapper {
  flex: 1;
  position: relative;
  min-width: 0;
}

.map-container {
  width: 100%;
  height: 100%;
}

/* Marker delete button in popup */
:deep(.marker-delete-btn) {
  background: #f44336;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
  font-size: 0.85rem;
}

:deep(.marker-delete-btn:hover) {
  background: #d32f2f;
}

/* Segment distance labels */
:deep(.segment-label) {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #3388ff;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

/* Vertex marker hover cursor */
:deep(.vertex-marker) {
  cursor: grab;
}

:deep(.vertex-marker:hover) {
  cursor: grab;
}

/* Midpoint marker hover */
:deep(.midpoint-marker) {
  cursor: pointer;
  transition: fill-opacity 0.2s;
}

:deep(.midpoint-marker:hover) {
  fill-opacity: 1 !important;
}

/* Arrow heads on polyline */
:deep(.leaflet-interactive) {
  cursor: default;
}
</style>