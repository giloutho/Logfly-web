<template>
  <v-card flat class="fullmap-card">
    <v-app-bar color="white" flat class="toolbar-app-bar">
      <v-spacer></v-spacer>
        <v-btn class="toolbar-btn">{{ $gettext('Infos') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Pathway') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Airspaces') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Scoring') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Measure') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Cutting') }}</v-btn>

      <v-spacer></v-spacer>

      <v-btn icon @click="close">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-app-bar>

    <v-card-text class="fullmap-card-text">
      <div class="map-wrapper">
        <div id="map" class="map-container"></div>
        <div id="graph-info" class="graph-info"></div>
        <div class="altitude-graph">
          <div id="chart" class="chart-container"></div>
        </div>
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
.fullmap-card {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.fullmap-card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  height: 100%;
}

.toolbar-app-bar {
  padding: 0 0.5rem;
  border-bottom: 2px solid #e0e0e0 !important;
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
  /* Vuetify 3 utilise 'text-transform: uppercase' par défaut, on le retire */
  text-transform: none; 

.map-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  position: relative;
}
.map-container {
  width: 100%;
  height: 500px;
  flex: 1;
  min-height: 400px;
  position: relative;
  z-index: 0;
  background: #e0e0e0;
}
.altitude-graph {
  width: 100%;
  height: 150px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
}
.chart-container {
  width: 100%;
  height: 100%;
  padding: 5px;
}
.graph-info {
  width: 100%;
  min-height: 28px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  border-top: 1px solid #e0e0e0;
  font-size: 1.05em;
  padding: 6px 12px;
  color: #333;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  }  
}
</style>
