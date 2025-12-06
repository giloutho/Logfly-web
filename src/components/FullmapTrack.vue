<template>
  <v-card flat class="annual-card">
    <v-app-bar color="white" flat class="toolbar-app-bar">
      <v-spacer></v-spacer>
        <v-btn class="toolbar-btn">{{ $gettext('Year') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Month') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Charts') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Export') }}</v-btn>
      <v-spacer></v-spacer>

      <v-btn icon @click="close">
        <v-icon>mdi-close</v-icon>
      </v-btn>      
    </v-app-bar>

    <v-card-text class="annual-card-text">
      <div class="map-container">
        <div id="map" class="leaflet-map"></div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useGettext } from "vue3-gettext";
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

const props = defineProps({
  analysisTrack: {
    type: Object,
    required: true,
  },
  decodedTrack: {
    type: Object,
    required: true,
  },  
});

const emit = defineEmits(['close']);
const { $gettext } = useGettext();

const { analysisTrack, decodedTrack } = props;

let map = null
let chart = null

console.log('analysisTrack', analysisTrack?.bestGain, 'm' )
console.log('decodedTrack GeoJSON', decodedTrack?.GeoJSON?.features[0]?.geometry?.coordinates.length, 'points' )

onMounted(() => {
  console.log('onMounted called')
  console.log('decodedTrack.GeoJSON exists:', !!decodedTrack.GeoJSON)
  
  if (decodedTrack.GeoJSON) {
    setTimeout(() => {
      map = L.map('map', {
        center: [decodedTrack.GeoJSON.features[0].geometry.coordinates[0][1], decodedTrack.GeoJSON.features[0].geometry.coordinates[0][0]],
        zoom: 13
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)
      const geoLayer = L.geoJSON(decodedTrack.GeoJSON).addTo(map)
      const bounds = geoLayer.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds)
      console.log('Map initialized')
    }, 100)
  }
})

function close() {
  emit('close');
}
</script>

<style scoped>
.annual-card {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
}

.annual-card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 64px;
  padding-left: 0 !important;
  padding-right: 0 !important;
  padding-bottom: 0 !important;
  margin: 0 !important;
  height: 100%;
}

.toolbar-app-bar {
  padding: 0 0.5rem;
  border-bottom: 2px solid #e0e0e0 !important;
  flex-shrink: 0;
  height: 64px;
}

.toolbar-btn {
  font-size: 0.85rem;
  min-width: 80px;
  padding: 0 10px;
  margin-right: 10px;
  background: #f5f5f5;
  color: #333;
  border-radius: 4px;
  box-shadow: none;
  text-transform: none;
}

.map-container {
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 400px;
  position: relative;
  margin: 0;
  padding: 0;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
