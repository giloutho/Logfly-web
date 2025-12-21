<template>
    <div id="map" class="map-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { baseMaps, osm } from '@/js/leaflet/tiles.js'

const props = defineProps({
    geoJson: {
        type: Object,
        default: null
    },
    fixes: {
        type: Array,
        default: null
    }
})

const emit = defineEmits(['map-ready', 'hover-point'])

let map = null
let geoLayer = null
let hoverMarker = null
let resizeObserver = null
let layerControl = null

onMounted(() => {
    map = L.map('map', {
        zoomControl: false // Position zoom control later if needed or let default
    }).setView([46, 2], 6)

    L.control.zoom({
        position: 'topright'
    }).addTo(map)

    // Create fresh instances of layers to avoid singleton conflicts with LittleMapView
    const localBaseMaps = {}
    for (const [key, layer] of Object.entries(baseMaps)) {
        localBaseMaps[key] = L.tileLayer(layer._url, layer.options)
    }

    // Add default layer (OpenStreetMap)
    if (localBaseMaps['OpenStreetMap']) {
        localBaseMaps['OpenStreetMap'].addTo(map)
    }

    layerControl = L.control.layers(localBaseMaps, null, { collapsed: false }).addTo(map)

    // Utilisation d'un ResizeObserver pour gérer proprement le redimensionnement
    // notamment lors de l'ouverture dans une modale
    resizeObserver = new ResizeObserver(() => {
        if (map) {
            map.invalidateSize()
        }
    })
    resizeObserver.observe(document.getElementById('map'))

    if (props.geoJson) {
        displayGeoJson(props.geoJson)
    }

    emit('map-ready', map)
})

watch(() => props.geoJson, (val) => {
    if (val && map) {
        displayGeoJson(val)
    }
})

function displayGeoJson(geoJson) {
    if (geoLayer) {
        map.removeLayer(geoLayer)
    }

    geoLayer = L.geoJSON(geoJson, {
        style: {
            color: '#0033ff',
            weight: 3,
            opacity: 0.8
        }
    }).addTo(map)

    const bounds = geoLayer.getBounds()
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] })
    }
}

// Expose method to syncing hover from graph
function setHoverPoint(lat, lon) {
    if (!map) return

    if (!hoverMarker) {
        hoverMarker = L.circleMarker([lat, lon], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.5,
            radius: 5
        }).addTo(map)
    } else {
        hoverMarker.setLatLng([lat, lon])
    }
}


let airspaceLayer = null

function displayAirspaceLayer(geojson) {
    if (airspaceLayer) {
        map.removeLayer(airspaceLayer)
        if (layerControl) {
            layerControl.removeLayer(airspaceLayer)
        }
    }

    if (!geojson || geojson.length === 0) return

    // Use Canvas renderer for better performance and to avoid SVG clipping issues
    // with large polygons. Increase padding to ensure rendering at edges.
    const canvasRenderer = L.canvas({ padding: 0.5 });

    airspaceLayer = L.geoJSON(geojson, {
        renderer: canvasRenderer,
        style: (feature) => {
            return {
                color: feature.properties.Color || '#808080',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.4
            }
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties
            const content = `<b>${props.Name}</b><br>
                              Class: ${props.Class}<br>
                              Type: ${props.type}<br>
                              Floor: ${props.FloorLabel}<br>
                              Ceiling: ${props.CeilingLabel}`
            layer.bindPopup(content)
        }
    }).addTo(map)

    // Add to layer control if we had access to it, but 'L.control.layers' returns the control
    // We didn't store the control instance in a variable. Let's fix that.
    if (layerControl) {
        layerControl.addOverlay(airspaceLayer, 'OpenAIP')
    }
}

// ... existing setHoverPoint

defineExpose({
    setHoverPoint,
    displayAirspaceLayer,
    map
})

onBeforeUnmount(() => {
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
    if (map) {
        map.remove()
        map = null
    }
})
</script>

<style scoped>
.map-container {
    width: 100%;
    height: 100%;
    z-index: 1;
}
</style>
