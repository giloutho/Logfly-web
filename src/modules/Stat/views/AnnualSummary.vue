<template>
  <div class="map-container">
    <div id="map" class="leaflet-map"></div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const latitude = 45.863;
const longitude = 6.1725;

onMounted(() => {
  const map = L.map('map', {
    center: [latitude, longitude],
    zoom: 13
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
});
</script>

<style scoped>
.map-container {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 0;
  width: 100vw;
  height: calc(100vh - 64px);
  z-index: 1;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>