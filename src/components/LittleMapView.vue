<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { baseMaps, osm } from '@/js/leaflet/tiles.js';

const props = defineProps({
  geoJson: {
    type: Object,
    default: null
  }
});

const mapContainer = ref(null);
let map = null;
let geoJsonLayer = null;

onMounted(() => {
  // Initialiser la carte Leaflet
  map = L.map(mapContainer.value).setView([45.0, 6.0], 10);

  // Ajouter le fond par défaut
  osm.addTo(map);

  // Ajouter le contrôleur de couches
  L.control.layers(baseMaps, null, { collapsed: false }).addTo(map);

  // Afficher le GeoJSON si disponible
  if (props.geoJson) {
    displayGeoJson(props.geoJson);
  }
});

watch(() => props.geoJson, (newGeoJson) => {
  if (newGeoJson && map) {
    displayGeoJson(newGeoJson);
  }
});

function displayGeoJson(geoJson) {
  // Supprimer la couche précédente si elle existe
  if (geoJsonLayer) {
    map.removeLayer(geoJsonLayer);
  }

  // Ajouter la nouvelle couche GeoJSON
  geoJsonLayer = L.geoJSON(geoJson, {
    style: {
      color: '#3388ff',
      weight: 3,
      opacity: 0.8
    }
  }).addTo(map);

  // Adapter la vue pour afficher toute la trace
  map.fitBounds(geoJsonLayer.getBounds());
}

onBeforeUnmount(() => {
  if (map) {
    map.remove();
  }
});
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  border-radius: 10px;
}
</style>
