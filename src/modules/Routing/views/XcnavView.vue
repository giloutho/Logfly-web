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
        <v-tooltip location="right" :text="$gettext('Draw a route')">
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
          <v-select v-model="selectedExportFormat" :items="exportFormats" item-title="title" item-value="value"
            :label="$gettext('Export format')" class="mb-4"></v-select>
          <v-checkbox v-model="includeMarkers" :label="$gettext('Include markers')" hide-details
            :disabled="!formatSupportsMarkers || markers.filter(m => m !== null).length === 0">
            <template v-slot:label>
              <span :class="{ 'text-grey': !formatSupportsMarkers }">{{ $gettext('Include markers') }}</span>
              <span v-if="!formatSupportsMarkers" class="text-caption text-grey ml-2">({{ $gettext('not supported')
                }})</span>
            </template>
          </v-checkbox>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="saveDialogOpen = false">{{ $gettext('Cancel') }}</v-btn>
          <v-btn color="success" variant="flat" @click="doExportRoute">{{ $gettext('Save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Airspace Dialog -->
    <AirspaceRouteDialog v-model="airspaceDialogOpen" :map-center="mapCenter" @display-airspaces="onDisplayAirspaces" />

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
import '@/js/leaflet/leaflet-measure.css';
import { navScoring, getScoringTypeLabel } from '@/js/routing/nav-scoring.js';
import { readRouteFile, getFormatLabel } from '@/js/xcnav/rte-read.js';
import { exportRoute, downloadFile, getExportFormats } from '@/js/xcnav/rte-write.js';
import { IGCDecoder } from '@/js/igc/igc-decoder.js';
import { IgcAnalyze } from '@/js/igc/igc-analyzer.js';
import AirspaceRouteDialog from '@/modules/Routing/components/AirspaceRouteDialog.vue';
import { createBaseMaps, getDefaultLayerName, createKk7 } from '@/js/leaflet/tiles.js';

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

// FAI sectors state
let faiSectors = [];      // Array of turnpoints { x: lng, y: lat }
let faiSectorPaths = [];  // Array of L.Polyline for FAI sector shapes
let currentFlightType = null;  // 'tri', 'fai', 'od', etc.

// Airspace dialog state
const airspaceDialogOpen = ref(false);
const mapCenter = ref({ lat: 45.5, lng: 6.5 });  // Default center (Alps)

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

// Formats that support including markers
const formatSupportsMarkers = computed(() => {
  const supportsMarkers = ['gpx-markers', 'gpx-wpt', 'kml'];
  return supportsMarkers.includes(selectedExportFormat.value);
});

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

  const mapBaseLayers = createBaseMaps();
  mapBaseLayers[getDefaultLayerName()].addTo(map);

  // Overlay layers
  scoreGroup = L.layerGroup().addTo(map);
  markerGroup = L.layerGroup();
  trackGroup = L.layerGroup();
  thermalGroup = L.layerGroup();
  airspaceGroup = L.layerGroup();

  // Thermal overlay (kk7)
  const kk7Layer = L.tileLayer('https://thermal.kk7.ch/tiles/skyways_all_all/{z}/{x}/{y}.png?src=logfly.app', {
    attribution: 'thermal.kk7.ch <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC-BY-NC-SA</a>',
    maxNativeZoom: 13,
    tms: true,
    opacity: 0.4
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

  L.control.layers(mapBaseLayers, overlayMaps).addTo(map);

  // Map events
  map.on('click', onMapClick);
  map.on('mousemove', onMouseMove);
  map.on('moveend', drawFAISectors);  // Redraw FAI sectors when map moves/zooms

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

  // Rebuild vertex markers so they become draggable (they were non-draggable during drawing)
  if (routePoints.value.length > 0) {
    updatePolyline();
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

    // Use L.Marker with DivIcon for proper dragging support
    // Using squares instead of circles to distinguish from scoring points
    const size = isFirst || isLast ? 18 : 14;
    const color = isFirst ? '#28a745' : (isLast ? '#ff6b6b' : '#3388ff');

    const icon = L.divIcon({
      className: 'vertex-div-icon',
      html: `<div class="vertex-point" style="
        width: ${size}px; 
        height: ${size}px; 
        background-color: ${color}; 
        border: 2px solid white; 
        border-radius: 3px; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: ${isFirst ? 'default' : 'grab'};
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });

    const marker = L.marker([point.lat, point.lng], {
      icon: icon,
      draggable: !isFirst && !isDrawing.value, // Make draggable except for start point
      bubblingMouseEvents: false,
      zIndexOffset: isFirst || isLast ? 1000 : 500
    }).addTo(map);

    // Store index in marker
    marker._vertexIndex = index;

    // Handle drag events
    marker.on('dragstart', () => {
      isDraggingVertex = true;
      draggingVertexIndex = index;
    });

    marker.on('drag', (e) => {
      const latlng = e.target.getLatLng();
      routePoints.value[index] = { lat: latlng.lat, lng: latlng.lng };

      // Update polyline in real-time
      const latlngs = routePoints.value.map(p => [p.lat, p.lng]);
      if (polyline) {
        polyline.setLatLngs(latlngs);
      }
    });

    marker.on('dragend', (e) => {
      isDraggingVertex = false;
      draggingVertexIndex = -1;

      const latlng = e.target.getLatLng();
      routePoints.value[index] = { lat: latlng.lat, lng: latlng.lng };

      // Full update after drag
      updatePolyline();
      updateTotalDistance();
    });

    // Single click handler for all click actions
    marker.on('click', (e) => {
      // Ignore clicks during drawing mode
      if (isDrawing.value) return;

      // Ignore if we just finished dragging
      if (isDraggingVertex) return;

      L.DomEvent.stopPropagation(e);

      // Ctrl/Cmd + click on last point to continue drawing
      if (isLast && (e.originalEvent.ctrlKey || e.originalEvent.metaKey)) {
        startDrawing();
        showMessage($gettext('Continue drawing from last point'), 'info');
        return;
      }

      // Click to delete (except first point, and need at least 2 points remaining)
      if (!isFirst && routePoints.value.length > 2) {
        deleteVertex(index);
      }
    });

    // Enhanced tooltip with instructions
    let tooltipText = isFirst ? $gettext('Start') :
      isLast ? `${$gettext('End')} - ${totalDistance.value.toFixed(1)} km` :
        `${$gettext('Point')} ${index + 1}`;

    if (!isFirst) {
      tooltipText += `\n${$gettext('Drag to move')}`;
      if (routePoints.value.length > 2) {
        tooltipText += `\n${$gettext('Click to delete')}`;
      }
      if (isLast) {
        tooltipText += `\n${$gettext('Ctrl/Cmd+click to continue')}`;
      }
    }

    marker.bindTooltip(tooltipText, {
      permanent: false,
      direction: 'top',
      offset: [0, -size / 2 - 4],
      className: 'vertex-tooltip'
    });

    vertexMarkers.push(marker);
  });
}

function updateMidpointMarkers() {
  // Clear existing midpoint markers
  midpointMarkers.forEach(m => map.removeLayer(m));
  midpointMarkers = [];

  if (routePoints.value.length < 2 || isDrawing.value) return;

  // Create midpoint markers for segment insertion
  for (let i = 0; i < routePoints.value.length - 1; i++) {
    const p1 = routePoints.value[i];
    const p2 = routePoints.value[i + 1];
    const midLat = (p1.lat + p2.lat) / 2;
    const midLng = (p1.lng + p2.lng) / 2;

    // Use L.Marker with DivIcon for proper dragging support
    // Using squares instead of circles to distinguish from scoring points
    const icon = L.divIcon({
      className: 'midpoint-div-icon',
      html: `<div class="midpoint-point" style="
        width: 14px; 
        height: 14px; 
        background-color: #888; 
        border: 2px solid white; 
        border-radius: 2px; 
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        cursor: pointer;
        opacity: 0.8;
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [6, 6]
    });

    const segmentIndex = i;
    const marker = L.marker([midLat, midLng], {
      icon: icon,
      draggable: true,
      bubblingMouseEvents: false,
      zIndexOffset: 100
    }).addTo(map);

    // Store segment index
    marker._segmentIndex = segmentIndex;

    // Handle drag start - insert the point
    marker.on('dragstart', (e) => {
      // Insert a new point at current marker position
      const latlng = e.target.getLatLng();
      routePoints.value.splice(segmentIndex + 1, 0, { lat: latlng.lat, lng: latlng.lng });
      isDraggingVertex = true;
      draggingVertexIndex = segmentIndex + 1;
    });

    // Handle drag - update the newly inserted point
    marker.on('drag', (e) => {
      if (draggingVertexIndex >= 0) {
        const latlng = e.target.getLatLng();
        routePoints.value[draggingVertexIndex] = { lat: latlng.lat, lng: latlng.lng };

        // Update polyline in real-time
        const latlngs = routePoints.value.map(p => [p.lat, p.lng]);
        if (polyline) {
          polyline.setLatLngs(latlngs);
        }
      }
    });

    // Handle drag end - finalize and rebuild markers
    marker.on('dragend', (e) => {
      if (draggingVertexIndex >= 0) {
        const latlng = e.target.getLatLng();
        routePoints.value[draggingVertexIndex] = { lat: latlng.lat, lng: latlng.lng };
      }
      isDraggingVertex = false;
      draggingVertexIndex = -1;

      // Full update to rebuild all markers
      updatePolyline();
      updateTotalDistance();
    });

    // Click to just insert (without drag)
    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      // Insert a new point at the midpoint
      routePoints.value.splice(segmentIndex + 1, 0, { lat: midLat, lng: midLng });
      updatePolyline();
      updateTotalDistance();
      showMessage($gettext('Point inserted'), 'info');
    });

    marker.bindTooltip($gettext('Click or drag to insert point'), {
      permanent: false,
      direction: 'top',
      offset: [0, -8]
    });

    midpointMarkers.push(marker);
  }
}

function updateSegmentLabels() {
  // Clear existing labels
  segmentLabels.forEach(l => map.removeLayer(l));
  segmentLabels = [];

  if (routePoints.value.length < 2) return;

  // Create distance labels for each segment with offset to avoid midpoint overlap
  for (let i = 0; i < routePoints.value.length - 1; i++) {
    const p1 = routePoints.value[i];
    const p2 = routePoints.value[i + 1];
    const midLat = (p1.lat + p2.lat) / 2;
    const midLng = (p1.lng + p2.lng) / 2;

    const segmentDist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);

    // Position label with offset (above the line, not at center)
    const label = L.tooltip({
      permanent: true,
      direction: 'top',
      offset: [0, -15],
      className: 'segment-label'
    })
      .setLatLng([midLat, midLng])
      .setContent(`${segmentDist.toFixed(1)} km`)
      .addTo(map);

    segmentLabels.push(label);
  }
}

// Note: startDragMidpoint is now handled inline in the marker events above

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

function addMarker(lat, lng, name = null, showSuccessMessage = true) {
  const markerIndex = markers.value.length;
  const markerName = name || `Marker ${markerIndex + 1}`;

  const marker = L.marker([lat, lng], {
    draggable: true,
    title: markerName  // Store name in marker options for export
  });

  const popupContent = `
    <div style="text-align: center;">
      <strong>${markerName}</strong><br/>
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

  if (showSuccessMessage) {
    showMessage($gettext('Marker added'), 'success');
  }
}

// Global function for popup button
window.deleteMarker = (index) => {
  if (markers.value[index]) {
    markerGroup.removeLayer(markers.value[index]);
    markers.value[index] = null;
  }
};

// --- Measure ---

// Measure tool state
let measureLayerGroup = null;
let measurePoints = [];
let measureTotalDistance = 0;
let measureLastPoint = null;
let measureTempLine = null;
let measureTooltip = null;
let measureOldCursor = null;

function toggleMeasure() {
  isMeasuring.value = !isMeasuring.value;
  isDrawing.value = false;
  isAddingMarker.value = false;

  if (isMeasuring.value) {
    startMeasuring();
    showMessage($gettext('Click to add points, double-click to finish'), 'info');
  } else {
    stopMeasuring();
  }
}

function startMeasuring() {
  // Save old cursor and set crosshair
  measureOldCursor = map.getContainer().style.cursor;
  map.getContainer().style.cursor = 'crosshair';

  // Disable double-click zoom while measuring
  map.doubleClickZoom.disable();

  // Initialize layer group for measure drawings
  if (!measureLayerGroup) {
    measureLayerGroup = L.layerGroup().addTo(map);
  }

  // Reset state
  measurePoints = [];
  measureTotalDistance = 0;
  measureLastPoint = null;

  // Add event listeners
  map.on('click', onMeasureClick);
  map.on('mousemove', onMeasureMouseMove);
  map.on('dblclick', onMeasureDoubleClick);
}

function stopMeasuring() {
  // Restore cursor
  if (measureOldCursor !== null) {
    map.getContainer().style.cursor = measureOldCursor;
  } else {
    map.getContainer().style.cursor = '';
  }

  // Re-enable double-click zoom
  map.doubleClickZoom.enable();

  // Remove event listeners
  map.off('click', onMeasureClick);
  map.off('mousemove', onMeasureMouseMove);
  map.off('dblclick', onMeasureDoubleClick);

  // Clear temporary line
  if (measureTempLine && measureLayerGroup) {
    measureLayerGroup.removeLayer(measureTempLine);
    measureTempLine = null;
  }

  // Clear measure layer (keeps the last measurement visible until next measure)
  if (measureLayerGroup) {
    measureLayerGroup.clearLayers();
  }

  // Reset state
  measurePoints = [];
  measureTotalDistance = 0;
  measureLastPoint = null;
  measureTooltip = null;
}

function onMeasureClick(e) {
  const latlng = e.latlng;

  if (measureLastPoint) {
    // Calculate distance from last point
    const segmentDistance = latlng.distanceTo(measureLastPoint);
    measureTotalDistance += segmentDistance;

    // Draw permanent line segment
    const line = L.polyline([measureLastPoint, latlng], {
      color: '#2196F3',
      weight: 2,
      opacity: 1
    }).addTo(measureLayerGroup);

    // Update tooltip with total distance
    updateMeasureTooltip(latlng);
  }

  // Add circle marker at click point
  L.circleMarker(latlng, {
    color: '#2196F3',
    fillColor: 'white',
    fillOpacity: 1,
    weight: 2,
    radius: 5
  }).addTo(measureLayerGroup);

  // Create initial tooltip
  createMeasureTooltip(latlng);

  measureLastPoint = latlng;
  measurePoints.push(latlng);
}

function onMeasureMouseMove(e) {
  if (!measureLastPoint) return;

  const latlng = e.latlng;

  // Update or create temporary line
  if (!measureTempLine) {
    measureTempLine = L.polyline([measureLastPoint, latlng], {
      color: '#2196F3',
      weight: 2,
      opacity: 0.6,
      dashArray: '6, 6'
    }).addTo(measureLayerGroup);
  } else {
    measureTempLine.setLatLngs([measureLastPoint, latlng]);
  }

  // Update tooltip position and distance
  if (measureTooltip) {
    measureTooltip.setLatLng(latlng);
    const segmentDistance = latlng.distanceTo(measureLastPoint);
    const totalWithSegment = measureTotalDistance + segmentDistance;
    updateMeasureTooltipContent(totalWithSegment, segmentDistance);
  }
}

function onMeasureDoubleClick(e) {
  L.DomEvent.preventDefault(e);
  L.DomEvent.stopPropagation(e);

  // Finish measurement
  if (measureTempLine && measureLayerGroup) {
    measureLayerGroup.removeLayer(measureTempLine);
    measureTempLine = null;
  }

  // Keep the measurement visible but stop measuring mode
  isMeasuring.value = false;

  // Restore cursor
  if (measureOldCursor !== null) {
    map.getContainer().style.cursor = measureOldCursor;
  } else {
    map.getContainer().style.cursor = '';
  }

  // Re-enable double-click zoom
  map.doubleClickZoom.enable();

  // Remove event listeners
  map.off('click', onMeasureClick);
  map.off('mousemove', onMeasureMouseMove);
  map.off('dblclick', onMeasureDoubleClick);

  // Reset state for next measurement
  measurePoints = [];
  measureLastPoint = null;
  measureTooltip = null;

  if (measureTotalDistance > 0) {
    showMessage(`${$gettext('Total distance')}: ${formatMeasureDistance(measureTotalDistance)}`, 'success');
  }
  measureTotalDistance = 0;
}

function createMeasureTooltip(latlng) {
  if (measureTooltip && measureLayerGroup) {
    measureLayerGroup.removeLayer(measureTooltip);
  }

  const icon = L.divIcon({
    className: 'leaflet-measure-tooltip',
    iconAnchor: [-5, -5]
  });

  measureTooltip = L.marker(latlng, {
    icon: icon,
    interactive: false
  }).addTo(measureLayerGroup);
}

function updateMeasureTooltip(latlng) {
  if (measureTooltip) {
    measureTooltip.setLatLng(latlng);
    updateMeasureTooltipContent(measureTotalDistance, 0);
  }
}

function updateMeasureTooltipContent(total, segment) {
  if (!measureTooltip || !measureTooltip._icon) return;

  const totalFormatted = formatMeasureDistance(total);
  let html = `<div class="leaflet-measure-tooltip-total">${totalFormatted}</div>`;

  if (segment > 0 && total !== segment) {
    const segmentFormatted = formatMeasureDistance(segment);
    html += `<div class="leaflet-measure-tooltip-difference">(+${segmentFormatted})</div>`;
  }

  measureTooltip._icon.innerHTML = html;
}

function formatMeasureDistance(meters) {
  if (meters < 1000) {
    return Math.round(meters) + ' m';
  } else {
    return (Math.round(meters / 10) / 100).toFixed(2) + ' km';
  }
}

// --- Speed control ---

function increaseSpeed() {
  if (speed.value < 50) {
    speed.value += 1;
  }
}

function decreaseSpeed() {
  if (speed.value > 5) {
    speed.value -= 1;
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
  // Clear FAI sectors
  if (faiSectorPaths.length > 0) {
    faiSectorPaths.forEach(path => scoreGroup.removeLayer(path));
    faiSectorPaths = [];
  }
  faiSectors = [];
  currentFlightType = null;
}

function displayScoringOnMap(geojson) {
  if (!geojson || !geojson.features) return;

  // Reset FAI sectors data
  faiSectors = [];
  currentFlightType = null;

  // Store the course type for FAI sector determination
  // The geojson.course contains the flight type from igc-xc-score
  if (geojson.course) {
    const courseLower = geojson.course.toLowerCase();
    if (courseLower.includes('fai')) {
      currentFlightType = 'fai';
    } else if (courseLower.includes('triangle') || courseLower.includes('flat')) {
      currentFlightType = 'tri';
    } else {
      currentFlightType = 'od'; // open distance
    }
  }

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
      // Extract turnpoints for FAI sectors (tp1, tp2, tp3)
      const id = feature.properties?.id || '';
      if (id.startsWith('tp') || id === 'in' || id === 'out') {
        // Store turnpoints for FAI sector calculation
        if (id.startsWith('tp')) {
          const coords = feature.geometry.coordinates;
          faiSectors.push({ x: coords[0], y: coords[1] });
        }
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

  // Draw FAI sectors if we have a triangle with 3 turnpoints
  if (faiSectors.length === 3 && (currentFlightType === 'tri' || currentFlightType === 'fai')) {
    drawFAISectors();
  }
}

// --- FAI Sectors ---

/**
 * Draw FAI sectors on the map.
 * FAI sectors show the valid zones where a turnpoint must be placed
 * for the triangle to satisfy FAI rules (each side ≥ 28% of total).
 * 
 * Colors:
 * - Green: sector opposite to TP1 (between TP2 and TP3)
 * - Blue: sector opposite to TP2 (between TP1 and TP3)
 * - Red: sector opposite to TP3 (between TP1 and TP2)
 */
function drawFAISectors() {
  // Clear existing FAI sector paths
  if (faiSectorPaths.length > 0) {
    faiSectorPaths.forEach(path => scoreGroup.removeLayer(path));
    faiSectorPaths = [];
  }

  // Only draw for triangles with exactly 3 turnpoints
  if (faiSectors.length !== 3 || (currentFlightType !== 'tri' && currentFlightType !== 'fai')) {
    return;
  }

  // Convert geo coordinates to container points for geometric calculations
  const pixels = faiSectors.map(pt => map.latLngToContainerPoint(L.latLng(pt.y, pt.x)));

  // Check for degenerate triangles (points too close together)
  if ((pixels[0].x === pixels[1].x && pixels[0].y === pixels[1].y) ||
    (pixels[1].x === pixels[2].x && pixels[1].y === pixels[2].y) ||
    (pixels[0].x === pixels[2].x && pixels[0].y === pixels[2].y)) {
    return;
  }

  // Style for FAI sector shapes
  const sectorStyle = {
    weight: 1.5,
    opacity: 0.8,
    fillOpacity: 0.25
  };

  // Draw three sectors, each for one pair of turnpoints
  // Green sector: shows where TP3 should be when TP1-TP2 is the base
  faiSectorPaths.push(
    L.polygon(faiSector([pixels[0], pixels[1], pixels[2]]), { ...sectorStyle, color: 'green', fillColor: 'green' })
  );

  // Blue sector: shows where TP1 should be when TP2-TP3 is the base
  faiSectorPaths.push(
    L.polygon(faiSector([pixels[1], pixels[2], pixels[0]]), { ...sectorStyle, color: 'blue', fillColor: 'blue' })
  );

  // Red sector: shows where TP2 should be when TP3-TP1 is the base
  faiSectorPaths.push(
    L.polygon(faiSector([pixels[2], pixels[0], pixels[1]]), { ...sectorStyle, color: 'red', fillColor: 'red' })
  );

  // Add sectors to score group
  faiSectorPaths.forEach(path => scoreGroup.addLayer(path));
}

/**
 * Calculate the FAI sector shape for a given triangle edge.
 * The FAI rule requires each side to be at least 28% of the total triangle perimeter.
 * This function calculates the valid zone where the third point can be placed.
 * 
 * @param {Array} pixels - Array of 3 pixel points [{x, y}, ...], 
 *                         where pixels[0]-pixels[1] is the base edge
 * @returns {Array} Array of LatLng points forming the sector shape
 */
function faiSector(pixels) {
  const flip = isClockwise(pixels) ? 1 : -1;

  // Vector from point 0 to point 1 (the base of the triangle for this sector)
  const delta = { x: pixels[1].x - pixels[0].x, y: pixels[1].y - pixels[0].y };
  const theta = flip * Math.atan2(delta.y, delta.x);
  const cos_theta = Math.cos(theta);
  const sin_theta = Math.sin(theta);

  // Length of the base edge
  const c = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

  const result = [];

  // The FAI rule: each side must be ≥ 28% of total perimeter
  // We calculate the valid zone by varying the percentage from 28% to 44%
  // (44% because if one side is 44%, another can still be 28%, leaving 28% for the third)

  // First arc: varying 'a' side percentage
  for (let ap = 28; ap < 44; ++ap) {
    const a = c * ap / 28.0;
    const b = c * (72.0 - ap) / 28.0;
    const x = (b * b + c * c - a * a) / (2 * c);
    const y = Math.sqrt(Math.max(0, b * b - x * x));
    result.push({
      x: pixels[0].x + x * cos_theta - y * sin_theta,
      y: pixels[0].y + flip * (x * sin_theta + y * cos_theta)
    });
  }

  // Second arc: varying 'c' side percentage (outer boundary)
  for (let cp = 28; cp < 44; ++cp) {
    const a = c * (72.0 - cp) / cp;
    const b = c * 28.0 / cp;
    const x = (b * b + c * c - a * a) / (2 * c);
    const y = Math.sqrt(Math.max(0, b * b - x * x));
    result.push({
      x: pixels[0].x + x * cos_theta - y * sin_theta,
      y: pixels[0].y + flip * (x * sin_theta + y * cos_theta)
    });
  }

  // Third arc: closing the sector (varying back)
  for (let cp = 44; cp >= 28; --cp) {
    const a = c * 28.0 / cp;
    const b = c * (72.0 - cp) / cp;
    const x = (b * b + c * c - a * a) / (2 * c);
    const y = Math.sqrt(Math.max(0, b * b - x * x));
    result.push({
      x: pixels[0].x + x * cos_theta - y * sin_theta,
      y: pixels[0].y + flip * (x * sin_theta + y * cos_theta)
    });
  }

  // Clamp to map bounds and convert back to LatLng
  const bounds = map.getBounds();
  const maxsize = map.latLngToContainerPoint(L.latLng(bounds.getSouth(), bounds.getEast()));

  return result.map(function (pixel) {
    pixel.x = Math.min(maxsize.x, Math.max(0, pixel.x));
    pixel.y = Math.min(maxsize.y, Math.max(0, pixel.y));
    return map.containerPointToLatLng(L.point(pixel.x, pixel.y));
  });
}

/**
 * Determine if a triangle (defined by 3 pixel points) is clockwise oriented.
 * Uses the cross product of two edges to determine orientation.
 * 
 * @param {Array} pixels - Array of 3 pixel points [{x, y}, ...]
 * @returns {boolean} True if clockwise, false if counter-clockwise
 */
function isClockwise(pixels) {
  return ((pixels[1].y - pixels[0].y) * (pixels[2].x - pixels[0].x) -
    (pixels[2].y - pixels[0].y) * (pixels[1].x - pixels[0].x)) < 0;
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
      // Clear existing route (but keep existing markers if user has some)
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

      // Load markers/waypoints if present
      let markersLoaded = 0;
      if (result.waypoints && result.waypoints.length > 0) {
        result.waypoints.forEach(wp => {
          addMarker(wp.lat, wp.lng, wp.name, false);  // false = don't show individual messages
          markersLoaded++;
        });
      }

      // Center on route
      if (polyline) {
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }

      // Build message
      let message = `${$gettext('Route loaded')}: ${result.route.length} ${$gettext('points')} (${getFormatLabel(result.format)})`;
      if (markersLoaded > 0) {
        message += ` + ${markersLoaded} ${$gettext('markers')}`;
      }
      showMessage(message, 'success');
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
      decoder.parse();  // parse() modifies decoder state, doesn't return anything

      if (decoder.fixes && decoder.fixes.length > 0) {
        await displayTrack(decoder.fixes, decoder.info);
        showMessage(`${$gettext('Track loaded')}: ${decoder.info.pilot || 'Unknown pilot'} - ${decoder.info.date}`, 'success');
      } else {
        showMessage($gettext('No valid track data found'), 'warning');
      }
    } else if (fileName.endsWith('.gpx')) {
      // Parse GPX track
      await displayGpxTrack(content);
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

async function displayTrack(fixes, info) {
  // Clear existing track and thermal layers
  trackGroup.clearLayers();
  thermalGroup.clearLayers();

  // Create track polyline
  const trackPoints = fixes.map(fix => [fix.latitude, fix.longitude]);
  const trackLine = L.polyline(trackPoints, {
    color: '#e91e63',  // Pink/magenta for track
    weight: 2,
    opacity: 0.85
  });

  trackLine.addTo(trackGroup);

  // Analyze track for thermals
  try {
    const anaResult = await IgcAnalyze(fixes);
    if (anaResult.success && anaResult.anaTrack) {
      displayThermals(fixes, anaResult.anaTrack.thermals);
      console.log(`[XcnavView] Track analyzed: ${anaResult.anaTrack.thermals.length} thermals detected`);
    }
  } catch (error) {
    console.warn('[XcnavView] Could not analyze track for thermals:', error);
  }

  // Show track layer
  if (!map.hasLayer(trackGroup)) {
    trackGroup.addTo(map);
  }

  // Fit bounds if no route is displayed
  if (routePoints.value.length === 0) {
    map.fitBounds(trackLine.getBounds(), { padding: [50, 50] });
  }
}

/**
 * Display thermal segments from track analysis
 * @param {Array} fixes - Array of track fixes
 * @param {Array} thermals - Array of thermal segments from analyzer
 */
function displayThermals(fixes, thermals) {
  if (!thermals || thermals.length === 0) return;

  // Style for thermal markers (circle markers at thermal top)
  const thermalMarkerOptions = {
    radius: 8,
    fillColor: '#ff9800',
    color: '#000',
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
  };

  // Style for thermal track segments
  const thermalLineStyle = {
    color: '#ffeb3b',  // Yellow for thermal segments
    weight: 4,
    opacity: 0.9
  };

  for (const thermal of thermals) {
    // Create polyline for thermal segment
    const thermalPoints = [];
    for (let k = thermal.idxStart; k <= thermal.idxEnd && k < fixes.length; k++) {
      thermalPoints.push([fixes[k].latitude, fixes[k].longitude]);
    }

    if (thermalPoints.length > 1) {
      const thermalLine = L.polyline(thermalPoints, thermalLineStyle);
      thermalGroup.addLayer(thermalLine);
    }

    // Create circle marker at thermal top (end of thermal segment)
    if (thermal.idxEnd < fixes.length) {
      const topFix = fixes[thermal.idxEnd];
      const altGain = thermal.deltaAlt || 0;
      const avgClimb = thermal.climbAverage ? thermal.climbAverage.toFixed(1) : '?';

      const thermalMarker = L.circleMarker(
        [topFix.latitude, topFix.longitude],
        thermalMarkerOptions
      );

      // Popup with thermal info
      thermalMarker.bindPopup(`
        <div style="text-align: center;">
          <strong>${$gettext('Thermal')}</strong><br/>
          <span style="color: #4caf50;">▲ ${altGain}m</span><br/>
          <span>${$gettext('Climb')}: ${avgClimb} m/s</span>
        </div>
      `);

      thermalGroup.addLayer(thermalMarker);
    }
  }

  // Show thermal layer
  if (thermals.length > 0 && !map.hasLayer(thermalGroup)) {
    thermalGroup.addTo(map);
  }
}

async function displayGpxTrack(content) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');
    const tracks = xmlDoc.getElementsByTagName('trk');

    trackGroup.clearLayers();
    thermalGroup.clearLayers();

    // Collect all fixes for thermal analysis
    const allFixes = [];

    for (let t = 0; t < tracks.length; t++) {
      const trkSegs = tracks[t].getElementsByTagName('trkseg');
      for (let s = 0; s < trkSegs.length; s++) {
        const trkPts = trkSegs[s].getElementsByTagName('trkpt');
        const trackPoints = [];

        for (let i = 0; i < trkPts.length; i++) {
          const pt = trkPts[i];
          const lat = parseFloat(pt.getAttribute('lat'));
          const lon = parseFloat(pt.getAttribute('lon'));
          const eleEl = pt.querySelector('ele');
          const timeEl = pt.querySelector('time');

          const ele = eleEl ? parseFloat(eleEl.textContent) : 0;
          const timestamp = timeEl ? new Date(timeEl.textContent).getTime() : Date.now() + i * 1000;

          trackPoints.push([lat, lon]);

          // Create IGC-like fix for thermal analysis
          allFixes.push({
            latitude: lat,
            longitude: lon,
            gpsAltitude: ele,
            pressureAltitude: ele,
            timestamp: timestamp,
            valid: true
          });
        }

        if (trackPoints.length > 0) {
          const trackLine = L.polyline(trackPoints, {
            color: '#e91e63',  // Pink/magenta for track
            weight: 2,
            opacity: 0.85
          });
          trackLine.addTo(trackGroup);
        }
      }
    }

    // Analyze track for thermals if we have enough points
    if (allFixes.length > 10) {
      try {
        const anaResult = await IgcAnalyze(allFixes);
        if (anaResult.success && anaResult.anaTrack) {
          displayThermals(allFixes, anaResult.anaTrack.thermals);
          console.log(`[XcnavView] GPX track analyzed: ${anaResult.anaTrack.thermals.length} thermals detected`);
        }
      } catch (error) {
        console.warn('[XcnavView] Could not analyze GPX track for thermals:', error);
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
  // Update map center before opening the dialog
  if (map) {
    const center = map.getCenter();
    mapCenter.value = { lat: center.lat, lng: center.lng };
  }
  airspaceDialogOpen.value = true;
}

/**
 * Handle display of airspaces from AirspaceRouteDialog
 * @param {Array} geojsonArray Array of GeoJSON features for airspaces
 */
function onDisplayAirspaces(geojsonArray) {
  if (!geojsonArray || geojsonArray.length === 0) {
    showMessage($gettext('No airspaces to display'), 'warning');
    return;
  }

  // Clear existing airspaces
  airspaceGroup.clearLayers();

  // Style function for airspaces
  function styleAirspace(feature) {
    const color = feature.properties.Color || '#808080';
    return {
      color: color,
      weight: 2,
      opacity: 0.8,
      fillColor: color,
      fillOpacity: 0.2
    };
  }

  // Popup for each airspace
  function onEachAirspace(feature, layer) {
    if (feature.properties) {
      let popupContent = `<b>Class: ${feature.properties.Class}</b><br/>`;
      popupContent += `${feature.properties.Name}<br/>`;
      popupContent += `<i class="mdi mdi-arrow-down"></i> Floor: ${feature.properties.FloorLabel} (${feature.properties.Floor}m)<br/>`;
      popupContent += `<i class="mdi mdi-arrow-up"></i> Ceiling: ${feature.properties.CeilingLabel} (${feature.properties.Ceiling}m)`;
      layer.bindPopup(popupContent);
    }
  }

  // Add each airspace to the layer group
  for (const aipGeojson of geojsonArray) {
    const airspaceLayer = L.geoJSON(aipGeojson, {
      style: styleAirspace,
      onEachFeature: onEachAirspace
    });
    airspaceGroup.addLayer(airspaceLayer);
  }

  // Make sure airspace layer is visible on map
  if (!map.hasLayer(airspaceGroup)) {
    airspaceGroup.addTo(map);
  }

  showMessage(`${geojsonArray.length} ${$gettext('airspaces displayed')}`, 'success');
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

  // Reset includeMarkers if format doesn't support it
  const shouldIncludeMarkers = formatSupportsMarkers.value && includeMarkers.value;

  // Extract marker data from Leaflet marker objects
  const markerData = [];
  if (shouldIncludeMarkers) {
    markers.value.forEach((marker, index) => {
      if (marker && marker.getLatLng) {
        const latlng = marker.getLatLng();
        markerData.push({
          lat: latlng.lat,
          lng: latlng.lng,
          name: marker.options?.title || `Marker${index + 1}`
        });
      }
    });
  }

  const result = exportRoute({
    route: routePoints.value,
    markers: markerData,
    format: selectedExportFormat.value,
    name: currentFileName.value ? currentFileName.value.replace(/\.[^/.]+$/, '') : 'LogflyRoute',
    includeMarkers: shouldIncludeMarkers
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
  pointer-events: none;
}

/* Vertex DivIcon container - remove default Leaflet icon styling */
:deep(.vertex-div-icon) {
  background: none !important;
  border: none !important;
}

/* Vertex point styling */
:deep(.vertex-point) {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

:deep(.vertex-point:hover) {
  transform: scale(1.2);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4) !important;
}

/* Midpoint DivIcon container */
:deep(.midpoint-div-icon) {
  background: none !important;
  border: none !important;
}

/* Midpoint point styling */
:deep(.midpoint-point) {
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}

:deep(.midpoint-point:hover) {
  transform: scale(1.3);
  opacity: 1 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4) !important;
}

/* Vertex tooltip with multi-line support */
:deep(.vertex-tooltip) {
  white-space: pre-line;
  text-align: center;
  font-size: 12px;
  line-height: 1.4;
}

/* Arrow heads on polyline */
:deep(.leaflet-interactive) {
  cursor: default;
}

/* Prevent default icon styling issues */
:deep(.leaflet-marker-icon.vertex-div-icon),
:deep(.leaflet-marker-icon.midpoint-div-icon) {
  margin: 0 !important;
}
</style>