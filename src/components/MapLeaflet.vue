<template>
    <div id="map" class="map-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { baseMaps } from '@/js/leaflet/tiles.js'
import { createPopThermal, createPopGlide, thermalIcon, glideIcon, startIcon, endIcon } from '@/js/leaflet/map-utils.js'

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

// Map and Layer state
let map = null
let geoLayer = null
let hoverMarker = null
let resizeObserver = null
let layerControl = null
let airspaceLayer = null
let thermalLayer = null
let glideLayer = null
let startMarker = null
let endMarker = null

// Shared Canvas Renderer with padding to prevent clipping
const mainCanvas = L.canvas({ padding: 0.5 })

// Visual Options
const thermOptions = {
    color: '#ff6600',
    weight: 4,
    opacity: 1
}

const glideOptions = {
    color: '#848484',
    weight: 3,
    opacity: 1,
    dashArray: '10,5'
}

onMounted(() => {
    // Prefer Canvas for all vector layers globally
    map = L.map('map', {
        zoomControl: false,
        preferCanvas: true
    }).setView([46, 2], 6)

    L.control.zoom({
        position: 'topright'
    }).addTo(map)

    // Create fresh instances of tiles
    const localBaseMaps = {}
    for (const [key, layer] of Object.entries(baseMaps)) {
        localBaseMaps[key] = L.tileLayer(layer._url, layer.options)
    }

    // Add default layer (OpenStreetMap)
    if (localBaseMaps['OpenStreetMap']) {
        localBaseMaps['OpenStreetMap'].addTo(map)
    }

    layerControl = L.control.layers(localBaseMaps, null, { collapsed: false }).addTo(map)

    // Handle Resize
    resizeObserver = new ResizeObserver(() => {
        if (map) {
            map.invalidateSize()
        }
    })
    const mapElement = document.getElementById('map')
    if (mapElement) {
        resizeObserver.observe(mapElement)
    }

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
    if (startMarker) {
        map.removeLayer(startMarker)
        startMarker = null
    }
    if (endMarker) {
        map.removeLayer(endMarker)
        endMarker = null
    }

    geoLayer = L.geoJSON(geoJson, {
        renderer: mainCanvas,
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

    // Add Start/End markers
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
}

function setHoverPoint(lat, lon) {
    if (!map) return

    if (!hoverMarker) {
        hoverMarker = L.circleMarker([lat, lon], {
            renderer: mainCanvas,
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.5,
            radius: 5
        }).addTo(map)
    } else {
        hoverMarker.setLatLng([lat, lon])
    }
}

function displayAirspaceLayer(geojson) {
    if (airspaceLayer) {
        map.removeLayer(airspaceLayer)
        if (layerControl) {
            layerControl.removeLayer(airspaceLayer)
        }
    }

    if (!geojson || geojson.length === 0) return

    airspaceLayer = L.geoJSON(geojson, {
        renderer: mainCanvas,
        style: (feature) => {
            return {
                color: feature.properties.Color || '#808080',
                weight: 2,
                opacity: 0.6,
                fillOpacity: 0.1
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

    if (layerControl) {
        layerControl.addOverlay(airspaceLayer, 'OpenAIP')
    }
}

function displayThermals(geoThermals) {
    if (thermalLayer) {
        map.removeLayer(thermalLayer)
        if (layerControl) {
            layerControl.removeLayer(thermalLayer)
        }
    }

    if (!geoThermals) return

    thermalLayer = L.geoJSON(geoThermals, {
        renderer: mainCanvas,
        style: (feature) => {
            return {
                ...thermOptions,
                interactive: feature.geometry.type !== 'LineString'
            }
        },
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: thermalIcon }),
        onEachFeature: (feature, layer) => {
            if (feature.geometry.type === 'Point') {
                createPopThermal(feature, layer)
            }
        }
    })

    if (layerControl) {
        layerControl.addOverlay(thermalLayer, 'Thermiques')
    }
}

function displayGlides(geoGlides) {
    if (glideLayer) {
        map.removeLayer(glideLayer)
        if (layerControl) {
            layerControl.removeLayer(glideLayer)
        }
    }

    if (!geoGlides) return

    glideLayer = L.geoJSON(geoGlides, {
        renderer: mainCanvas,
        style: (feature) => {
            return {
                ...glideOptions,
                interactive: feature.geometry.type !== 'LineString'
            }
        },
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: glideIcon }),
        onEachFeature: (feature, layer) => {
            if (feature.geometry.type === 'Point') {
                createPopGlide(feature, layer)
            }
        }
    })

    if (layerControl) {
        layerControl.addOverlay(glideLayer, 'Transitions')
    }
}

function setAnalysisLayersVisibility(visible) {
    if (!map) return

    if (visible) {
        if (thermalLayer && !map.hasLayer(thermalLayer)) thermalLayer.addTo(map)
        if (glideLayer && !map.hasLayer(glideLayer)) glideLayer.addTo(map)
    } else {
        if (thermalLayer && map.hasLayer(thermalLayer)) map.removeLayer(thermalLayer)
        if (glideLayer && map.hasLayer(glideLayer)) map.removeLayer(glideLayer)
    }
}

function displaySegment(coords) {
    // conversion logic for strings/flat arrays
    if (typeof coords === 'string') {
        coords = coords.split(',').map(Number);
    }

    if (Array.isArray(coords) && coords.length > 0 && typeof coords[0] === 'number') {
        const points = [];
        for (let i = 0; i < coords.length; i += 2) {
            points.push([coords[i], coords[i + 1]]);
        }
        coords = points;
    }

    if (!coords || !Array.isArray(coords) || coords.length === 0 || !Array.isArray(coords[0])) {
        return
    }

    const latlngs = coords.map(c => [c[0], c[1]])
    if (map) {
        map.fitBounds(latlngs, { padding: [50, 50] })
    }
}

function displayTakeOff() {
    if (startMarker && map) {
        map.flyTo(startMarker.getLatLng(), 16)
    }
}

function displayLanding() {
    if (endMarker && map) {
        map.flyTo(endMarker.getLatLng(), 16)
    }
}

defineExpose({
    setHoverPoint,
    displayAirspaceLayer,
    displayThermals,
    displayGlides,
    setAnalysisLayersVisibility,
    displaySegment,
    displayTakeOff,
    displayLanding,
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
