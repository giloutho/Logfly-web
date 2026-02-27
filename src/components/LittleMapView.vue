<template>
  <div class="little-map-wrapper" :class="{ 'no-radius': noBorderRadius }">
    <div ref="mapContainer" class="map-container"></div>

    <!-- Custom bottom-right control: zoom + map actions (replaces native Leaflet zoom) -->
    <div v-if="!hideOverlay" class="map-overlay-bottomright">
      <div v-if="flightInfo"
        class="flight-info bg-white rounded-pill px-4 py-2 mr-3 elevation-2 text-body-2 d-flex align-center">
        <span class="font-weight-bold text-grey-darken-3">{{ flightInfo.date }}</span>
        <span class="mx-2 text-grey-lighten-1">|</span>
        <span class="font-weight-bold text-primary">{{ flightInfo.duration }}</span>
      </div>
      <div class="map-buttons">
        <v-tooltip :text="$gettext('Zoom in')" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon="mdi-plus" size="36" color="white" class="map-btn" @click="zoomIn"></v-btn>
          </template>
        </v-tooltip>
        <v-tooltip :text="$gettext('Zoom out')" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon="mdi-minus" size="36" color="white" class="map-btn" @click="zoomOut"></v-btn>
          </template>
        </v-tooltip>
        <v-tooltip :text="$gettext('Full map')" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon="mdi-fullscreen" size="36" color="white" class="map-btn"
              @click="$emit('open-full-map')"></v-btn>
          </template>
        </v-tooltip>
        <v-tooltip :text="$gettext('3D View')" location="top">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon="mdi-video-3d" size="36" color="white" class="map-btn"
              @click="$emit('open-cesium')"></v-btn>
          </template>
        </v-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { useGettext } from "vue3-gettext";

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createBaseMaps, getDefaultLayerName } from '@/js/leaflet/tiles.js';
import { startIcon, endIcon } from '@/js/leaflet/map-utils.js';

// Import site type icons
import windsockIconUrl from '@/assets/windsock22.png';
import arriveeIconUrl from '@/assets/arrivee22.png';
import flagYellowIconUrl from '@/assets/flag-yellow-22.png';

// Create Leaflet icons for site types
const takeoffIcon = L.icon({
  iconUrl: windsockIconUrl,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -22]
});

const landingIcon = L.icon({
  iconUrl: arriveeIconUrl,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -22]
});

const undefinedIcon = L.icon({
  iconUrl: flagYellowIconUrl,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -22]
});

const { $gettext } = useGettext();

const props = defineProps({
  geoJson: {
    type: Object,
    default: null
  },
  scoreJson: {
    type: Object,
    default: null
  },
  hideOverlay: {
    type: Boolean,
    default: false
  },
  hideAnalyze: {
    type: Boolean,
    default: false
  },
  zoomLevel: {
    type: Number,
    default: 12
  },
  noBorderRadius: {
    type: Boolean,
    default: false
  },
  paddingLeft: {
    type: Number,
    default: 0
  },
  flightInfo: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['open-full-map', 'open-cesium', 'open-analyze']);

const mapContainer = ref(null);
let map = null;
let geoJsonLayer = null;
let scoreLayer = null;
let startMarker = null;
let endMarker = null;
let resizeObserver = null;

onMounted(() => {
  // Initialiser la carte Leaflet — zoom control to top-right to avoid drawer overlap
  map = L.map(mapContainer.value, { zoomControl: false }).setView([45.0, 6.0], 10);
  // Native zoom control removed — replaced by custom [+][-][⛶][3D] button group

  // Create fresh tile layer instances for this map (avoid conflicts with other maps)
  const mapBaseLayers = createBaseMaps();

  // Use the OSM layer from baseMaps so it appears selected in the layer control
  mapBaseLayers[getDefaultLayerName()].addTo(map);

  // Ajouter le contrôleur de couches
  L.control.layers(mapBaseLayers, null, { collapsed: false }).addTo(map);

  // Forcer un rafraîchissement après un court délai
  setTimeout(() => {
    map.invalidateSize();
  }, 100);

  // Second invalidateSize for mobile: the container may still be resizing
  // after a CSS layout switch (e.g. v-if toggling ExternalLayout into view)
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 500);

  // ResizeObserver: recalculate map size whenever the container dimensions change
  if (window.ResizeObserver && mapContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      if (map) map.invalidateSize();
    });
    resizeObserver.observe(mapContainer.value);
  }

  // Afficher le GeoJSON si disponible (trace du vol)
  if (props.geoJson) {
    displayGeoJson(props.geoJson);
  }

  // Afficher le scoring si disponible
  if (props.scoreJson) {
    displayScoreJson(props.scoreJson);
  }
});

// Watch pour la trace du vol
watch(() => props.geoJson, (newGeoJson) => {
  if (newGeoJson && map) {
    displayGeoJson(newGeoJson);
  }
});

// Watch pour le résultat du scoring
watch(() => props.scoreJson, (newScoreJson) => {
  if (newScoreJson && map) {
    displayScoreJson(newScoreJson);
  }
});

function displayGeoJson(geoJson) {

  // Supprimer la couche précédente de la trace si elle existe
  if (geoJsonLayer) {
    map.removeLayer(geoJsonLayer);
  }
  // Supprimer la couche précédente du scoring si elle existe
  if (scoreLayer) {
    map.removeLayer(scoreLayer);
    scoreLayer = null;
  }
  // Supprimer les marqueurs précédents
  if (startMarker) {
    map.removeLayer(startMarker);
    startMarker = null;
  }
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }

  // Ajouter la nouvelle couche GeoJSON (trace du vol)
  geoJsonLayer = L.geoJSON(geoJson, {
    style: {
      color: '#3388ff',
      weight: 3,
      opacity: 0.8
    }
  }).addTo(map);

  // Ajouter les marqueurs de début et fin
  if (geoJson.features && geoJson.features.length > 0) {
    const trackFeature = geoJson.features.find(f => f.geometry.type === 'LineString')
    if (trackFeature) {
      const coords = trackFeature.geometry.coordinates
      if (coords.length > 0) {
        const startPoint = coords[0]
        const endPoint = coords[coords.length - 1]
        startMarker = L.marker([startPoint[1], startPoint[0]], { icon: startIcon }).addTo(map)
        endMarker = L.marker([endPoint[1], endPoint[0]], { icon: endIcon }).addTo(map)
      }
    }
  }


  // Adapter la vue pour afficher toute la trace et le scoring
  fitBoundsToAllLayers();

  // Forcer un rafraîchissement
  setTimeout(() => {
    map.invalidateSize();
  }, 50);
}

function displayScoreJson(scoreJson) {

  // Supprimer la couche précédente du scoring si elle existe
  if (scoreLayer) {
    map.removeLayer(scoreLayer);
  }

  try {
    // Ajouter la nouvelle couche GeoJSON (résultat du scoring)
    scoreLayer = L.geoJSON(scoreJson, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: '#ff0000',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });
      },
      style: (feature) => {
        if (feature.geometry.type === 'LineString') {
          return {
            color: '#ff0000',
            weight: 3,
            opacity: 0.8
          };
        }
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.popupContent) {
          layer.bindPopup(feature.properties.popupContent);
        }
      }
    }).addTo(map);

    // Adapter la vue pour afficher toute la trace et le scoring
    fitBoundsToAllLayers();
  } catch (error) {
    console.error('Erreur lors de l\'affichage du scoring:', error);
  }
}

function fitBoundsToAllLayers() {
  try {
    const bounds = L.latLngBounds([]);
    let hasBounds = false;

    if (geoJsonLayer) {
      const geoBounds = geoJsonLayer.getBounds();
      if (geoBounds.isValid()) {
        bounds.extend(geoBounds);
        hasBounds = true;
      }
    }

    if (scoreLayer) {
      const scoreBounds = scoreLayer.getBounds();
      if (scoreBounds.isValid()) {
        bounds.extend(scoreBounds);
        hasBounds = true;
      }
    }

    if (hasBounds && bounds.isValid()) {
      // paddingLeft accounts for the left drawer width so the track isn't hidden under it
      map.fitBounds(bounds, {
        paddingTopLeft: [props.paddingLeft + 20, 20],
        paddingBottomRight: [20, 20]
      });
    }
  } catch (error) {
    console.error('Erreur lors de fitBounds:', error);
  }
}

/**
 * Display only a takeoff marker for flights without GPS track
 * @param {number} lat - Latitude of takeoff
 * @param {number} lon - Longitude of takeoff
 * @param {string} site - Site name
 * @param {number} alt - Altitude
 * @param {string} siteType - Site type ('D' for takeoff, 'A' for landing, other for undefined)
 */
function displayTakeoffOnly(lat, lon, site, alt, siteType = 'D') {
  // Clear existing layers
  if (geoJsonLayer) {
    map.removeLayer(geoJsonLayer);
    geoJsonLayer = null;
  }
  if (scoreLayer) {
    map.removeLayer(scoreLayer);
    scoreLayer = null;
  }
  if (startMarker) {
    map.removeLayer(startMarker);
  }
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }

  // Select icon based on site type
  let markerIcon;
  if (siteType === 'D') {
    markerIcon = takeoffIcon;
  } else if (siteType === 'A') {
    markerIcon = landingIcon;
  } else {
    markerIcon = undefinedIcon;
  }

  // Create the takeoff marker with popup
  const popupContent = `${site || 'Unknown'}<br>${alt || 0}m`;
  startMarker = L.marker([lat, lon], { icon: markerIcon })
    .bindPopup(popupContent)
    .addTo(map);

  // Center map on takeoff with custom zoom level
  map.setView([lat, lon], props.zoomLevel);

  // Open popup
  startMarker.openPopup();
}

function zoomIn() {
  if (map) map.zoomIn();
}

function zoomOut() {
  if (map) map.zoomOut();
}

defineExpose({
  displayTakeoffOnly
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (map) {
    map.remove();
  }
});
</script>

<style scoped>
.little-map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-overlay-bottomright {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 1000;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.map-buttons {
  pointer-events: auto;
  /* Enable clicks on buttons */
  background: rgba(255, 255, 255, 0.9);
  padding: 4px;
  border-radius: 20px;
  display: flex;
  gap: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.map-btn {
  background-color: #1976D2 !important;
  /* Vuetify primary blue - or custom */
  color: white !important;
}

.little-map-wrapper.no-radius {
  border-radius: 0;
}
</style>
