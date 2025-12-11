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
  },
  scoreJson: {
    type: Object,
    default: null
  }
});

const mapContainer = ref(null);
let map = null;
let geoJsonLayer = null;
let scoreLayer = null;

onMounted(() => {
  // Initialiser la carte Leaflet
  map = L.map(mapContainer.value).setView([45.0, 6.0], 10);

  // Ajouter le fond par défaut
  osm.addTo(map);

  // Ajouter le contrôleur de couches
  L.control.layers(baseMaps, null, { collapsed: false }).addTo(map);

  // Forcer un rafraîchissement après un court délai
  setTimeout(() => {
    map.invalidateSize();
  }, 100);

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
  console.log('displayGeoJson appelé');
  
    // Supprimer la couche précédente de la trace si elle existe
    if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
    }
    // Supprimer la couche précédente du scoring si elle existe
    if (scoreLayer) {
        map.removeLayer(scoreLayer);
        scoreLayer = null;
    };

  // Ajouter la nouvelle couche GeoJSON (trace du vol)
  geoJsonLayer = L.geoJSON(geoJson, {
    style: {
      color: '#3388ff',
      weight: 3,
      opacity: 0.8
    }
  }).addTo(map);


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

    console.log('ScoreLayer ajouté avec succès');
    console.log('ScoreLayer bounds:', scoreLayer.getBounds());
    console.log('ScoreLayer getLayers():', scoreLayer.getLayers().length, 'layers');
    
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
        console.log('GeoBounds ajoutés');
      }
    }
    
    if (scoreLayer) {
      const scoreBounds = scoreLayer.getBounds();
      console.log('ScoreBounds:', scoreBounds, 'isValid:', scoreBounds.isValid());
      if (scoreBounds.isValid()) {
        bounds.extend(scoreBounds);
        hasBounds = true;
        console.log('ScoreBounds ajoutés');
      }
    }
    
    console.log('Final bounds:', bounds, 'hasBounds:', hasBounds, 'isValid:', bounds.isValid());
    
    if (hasBounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
      console.log('fitBounds appliqué');
    }
  } catch (error) {
    console.error('Erreur lors de fitBounds:', error);
  }
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
