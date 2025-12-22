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
let verificationLayer = null
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

function displayVerification(checkResult, fixes) {
    if (!map) return

    // Clear previous verification layer
    if (verificationLayer) {
        map.removeLayer(verificationLayer)
        if (layerControl) {
            layerControl.removeLayer(verificationLayer)
        }
        verificationLayer = null
    }

    const verificationGroup = L.layerGroup()

    // 1. Display airspaces in red
    if (checkResult.airGeoJson && checkResult.airGeoJson.length > 0) {
        const airspaceLayer = L.geoJSON(checkResult.airGeoJson, {
            renderer: mainCanvas,
            style: {
                color: '#ff0000',
                weight: 2,
                opacity: 0.8,
                fillColor: '#ff0000',
                fillOpacity: 0.1,
                interactive: true
            },
            onEachFeature: (feature, layer) => {
                // Simple popup
                let popupContent = `<b>${feature.properties.Name}</b><br>`
                popupContent += `Class: ${feature.properties.Class}<br>`
                popupContent += `Floor: ${feature.properties.FloorLabel}<br>`
                popupContent += `Ceiling: ${feature.properties.CeilingLabel}`
                if (feature.properties.AltLimit_Bottom_AGL) popupContent += ' (AGL)'
                layer.bindPopup(popupContent)
            }
        })
        verificationGroup.addLayer(airspaceLayer)
    }

    // 2. Highlight violating points
    if (checkResult.insidePoints && checkResult.insidePoints.length > 0 && fixes) {
        const points = checkResult.insidePoints.map(idx => {
            const fix = fixes[idx]
            return [fix.latitude, fix.longitude]
        })

        // Use circles for points (better performance than markers if many)
        const violationPoints = points.map(latlng => {
            return L.circleMarker(latlng, {
                radius: 4,
                fillColor: '#ff9900',
                color: '#fff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            })
        })

        // Or create a feature group
        L.featureGroup(violationPoints).addTo(verificationGroup)
    }

    verificationLayer = verificationGroup
    verificationLayer.addTo(map)

    if (layerControl) {
        layerControl.addOverlay(verificationLayer, 'Vérification')
        // Automatically check the layer
        map.addLayer(verificationLayer)
    }

    // 3. Add Summary Tooltip (Control)
    updateVerificationTooltip(checkResult)
}

let verificationTooltip = null

function updateVerificationTooltip(checkResult) {
    if (verificationTooltip) {
        map.removeControl(verificationTooltip)
        verificationTooltip = null
    }

    if (!checkResult || !checkResult.airGeoJson || checkResult.airGeoJson.length === 0) return

    const TooltipControl = L.Control.extend({
        onAdd: function (map) {
            const div = L.DomUtil.create('div', 'leaflet-bar verification-tooltip')
            div.style.backgroundColor = 'white'
            div.style.padding = '10px'
            div.style.borderRadius = '4px'
            div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)'
            div.style.maxWidth = '300px'

            // Close button
            const closeBtn = L.DomUtil.create('div', 'close-btn', div)
            closeBtn.innerHTML = '×'
            closeBtn.style.float = 'right'
            closeBtn.style.cursor = 'pointer'
            closeBtn.style.fontSize = '16px'
            closeBtn.style.fontWeight = 'bold'
            closeBtn.onclick = () => { map.removeControl(this) }

            const header = L.DomUtil.create('h4', 'text-warning', div)
            header.innerHTML = 'Espaces aériens concernés'
            header.style.margin = '0 0 8px 0'
            header.style.fontSize = '14px'
            header.style.color = '#fb8c00'
            header.style.backgroundColor = '#fff3e0'
            header.style.padding = '4px'

            const list = L.DomUtil.create('div', '', div)
            checkResult.airGeoJson.forEach(f => {
                const item = L.DomUtil.create('div', '', list)
                item.innerHTML = f.properties.Name
                item.style.fontSize = '12px'
                item.style.marginBottom = '2px'
            })

            const summary = L.DomUtil.create('div', '', div)
            if (checkResult.insidePoints.length > 0) {
                summary.innerHTML = `<span style="background-color: #ef5350; color: white; padding: 2px 4px; border-radius: 2px;">violation(s) : ${checkResult.insidePoints.length} points</span>`
            } else {
                summary.innerHTML = `<span style="color: green;">Aucune violation détectée</span>`
            }
            summary.style.marginTop = '10px'
            summary.style.fontSize = '12px'
            summary.style.fontWeight = 'bold'

            const hint = L.DomUtil.create('div', 'text-grey', div)
            hint.innerHTML = '<i>Cliquer sur un espace pour afficher la description</i>'
            hint.style.fontSize = '10px'
            hint.style.marginTop = '8px'
            hint.style.color = '#666'

            return div
        }
    })

    // We use a custom class/CSS for centering if possible, or standard position.
    // To center, we can use topright and CSS translation, or a custom control placeholder.
    // Simpler: use 'topright' but apply a class that we style.
    verificationTooltip = new TooltipControl({ position: 'topright' })
    verificationTooltip.addTo(map)

    // Hack to center it: move the container?
    // Leaflet controls are in corners.
    // Provide a style block in <style> to handle .verification-tooltip positioning if we want consistent centering?
    // For now, topright is acceptable functionality.
    // If user insists on center, we can use L.popup at center?
    // Let's stick to topright as implemented.
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
    displayVerification,
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

.verification-tooltip {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    margin: 0 !important;
    z-index: 1000 !important;
    border: none !important;
}

.verification-tooltip .close-btn {
    position: absolute;
    right: 5px;
    top: 2px;
}
</style>
