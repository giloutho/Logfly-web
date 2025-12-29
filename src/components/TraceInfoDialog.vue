<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="800">
        <v-card class="trace-info-card">
            <v-card-text class="pa-4">
                <div class="info-grid">
                    <template v-for="(field, index) in displayFields" :key="field.id">
                        <div class="info-item" :class="{ 'efficiency-highlight': field.id === 'efficiency' }">
                            <span class="info-label">{{ field.label }} {{ field.label ? ':' : '' }}</span>
                            <span class="info-value">{{ field.value }}</span>
                        </div>
                    </template>
                </div>

                <div class="mini-bar-container mt-4">
                    <div class="mini-bar">
                        <div v-for="(segment, index) in barSegments" :key="index" :style="{
                            width: segment.width + '%',
                            backgroundColor: segment.color,
                            borderRadius: segment.radius
                        }" class="mini-bar-segment" :title="segment.label">
                            <span v-if="segment.showValue" class="segment-value">{{ segment.value }}%</span>
                        </div>
                    </div>
                    <div class="mini-bar-legend">
                        <span v-for="(segment, index) in barSegments" :key="'legend-' + index"
                            :style="{ color: segment.color }">
                            {{ segment.label }}
                        </span>
                    </div>
                </div>

            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" text @click="$emit('update:modelValue', false)">{{ $gettext('Close') }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useGettext } from "vue3-gettext";

const { $gettext } = useGettext();

const props = defineProps({
    modelValue: Boolean,
    decodedData: Object,
    anaResult: Object,
    trackData: Object // Legacy/alternative source if needed
})

defineEmits(['update:modelValue'])

const displayFields = computed(() => {
    if (!props.decodedData || !props.decodedData.fixes) return []

    const track = props.decodedData // Access flat structure if passed directly or via .data
    // Note: props.decodedData usually has { fixes, info, stat } properties directly 
    // based on FullMapView: :decodedData="flightData?.decodedIgc"

    const info = track.info || {}
    const fixes = track.fixes || []
    const stat = track.stat || {}
    const ana = props.anaResult || {}

    if (fixes.length === 0) return []

    const offsetUtcMin = info.offsetUTC || 0
    const dateTkoff = new Date(fixes[0].timestamp + (offsetUtcMin * 60 * 1000))
    const hTkoff = String(dateTkoff.getUTCHours()).padStart(2, '0') + ':' + String(dateTkoff.getUTCMinutes()).padStart(2, '0')

    const dateLand = new Date(fixes[fixes.length - 1].timestamp + (offsetUtcMin * 60 * 1000))
    const hLand = String(dateLand.getUTCHours()).padStart(2, '0') + ':' + String(dateLand.getUTCMinutes()).padStart(2, '0')

    const durationDate = new Date(stat.duration * 1000)
    const durationFormatted = durationDate.toISOString().substr(11, 8) // HH:MM:SS

    const avgTransSpeed = ana.avgTransSpeed ? (Math.round(ana.avgTransSpeed * 100) / 100).toFixed(0) : '0'
    const avgThermalClimb = ana.avgThermalClimb ? (Math.round(ana.avgThermalClimb * 100) / 100).toFixed(2) : '0.00'

    // Extraction Time
    const h = Math.floor((ana.extractTime || 0) / 3600)
    const m = Math.floor(((ana.extractTime || 0) % 3600) / 60)
    const s = Math.floor(((ana.extractTime || 0) % 3600) % 60)
    const hDisplay = h > 0 ? h + (h == 1 ? "h" : "h") : ""
    const mDisplay = m > 0 ? m + (m == 1 ? "mn" : "mn") : ""
    const sDisplay = s > 0 ? s + (s == 1 ? "s" : "s") : ""
    const hExtractTime = hDisplay + mDisplay + sDisplay

    // Site - placeholder or from input
    // In logfly-web we might check ana.site or info.site
    const fSite = info.site || 'PLANFAIT FRANCE' // Placeholder as in reference, can be updated later

    // Fields definition matching reference order for two columns
    // The grid CSS will handle the layout (2 columns) naturally if we just list them in order?
    // The reference code pairs them explicitly. Grid is easier.
    // Order:
    // Left: Date, Pilote, Decollage, Atter, Duree, Alt max, Vario max, Gain max, Meilleure trans, Vit moy trans, Taux moy montee, Delai ext, Eff moy
    // Right: Site, Voile, Alti GPS (start), Alti GPS (end), Longueur, Alt Mini, Vario mini, Vitesse max, (empty), (empty), (empty), (empty) ...

    // To match the screenshot exactly, we need to respect the pairing.
    // Row 1
    const r1 = [
        { id: 'date', label: $gettext('Date'), value: info.date },
        { id: 'site', label: $gettext('Site'), value: fSite }
    ]
    const r2 = [
        { id: 'pilot', label: $gettext('Pilot'), value: info.pilot },
        { id: 'glider', label: $gettext('Glider'), value: info.gliderType }
    ]
    const r3 = [
        { id: 'tkofftime', label: $gettext('Take off'), value: hTkoff },
        { id: 'tkoffalt', label: $gettext('GPS alt'), value: formatAlt(fixes[0].gpsAltitude) }
    ]
    const r4 = [
        { id: 'landtime', label: $gettext('Landing'), value: hLand },
        { id: 'landalt', label: $gettext('GPS alt'), value: formatAlt(fixes[fixes.length - 1].gpsAltitude) }
    ]
    const r5 = [
        { id: 'duration', label: $gettext('Duration'), value: durationFormatted },
        { id: 'size', label: $gettext('Size'), value: (stat.distance || 0).toFixed(2) + ' km' }
    ]
    const r6 = [
        { id: 'maxalt', label: $gettext('Max GPS alt'), value: formatAlt(stat.maxalt?.gps) },
        { id: 'minalt', label: $gettext('Min GPS alt'), value: formatAlt(stat.minialt?.gps) }
    ]
    const r7 = [
        { id: 'maxclimb', label: $gettext('Max climb'), value: (stat.maxclimb || 0) + ' m/s' },
        { id: 'minvario', label: $gettext('Max sink'), value: (stat.maxsink || 0) + ' m/s' }
    ]
    const r8 = [
        { id: 'maxgain', label: $gettext('Max gain'), value: formatAlt(ana.bestGain) },
        { id: 'maxspeed', label: $gettext('Max speed'), value: (stat.maxspeed || 0) + ' km/h' }
    ]
    const r9 = [
        { id: 'bestglide', label: $gettext('Best glide'), value: ((ana.bestGlide || 0) / 1000).toFixed(2) + ' km' },
        { id: 'empty1', label: '', value: '' }
    ]
    const r10 = [
        { id: 'avgtrans', label: $gettext('Avg glide speed'), value: avgTransSpeed + ' km/h' },
        { id: 'empty2', label: '', value: '' }
    ]
    const r11 = [
        { id: 'avgthermal', label: $gettext('Average climb'), value: avgThermalClimb + ' m/s' },
        { id: 'empty3', label: '', value: '' }
    ]
    const r12 = [
        { id: 'extracttime', label: $gettext('Extraction time'), value: hExtractTime },
        { id: 'empty4', label: '', value: '' }
    ]
    const r13 = [
        { id: 'efficiency', label: $gettext('Avg th efficiency'), value: Math.ceil(ana.avgThermalEffi || 0) + ' %' },
        { id: 'empty5', label: '', value: '' }
    ]

    return [...r1, ...r2, ...r3, ...r4, ...r5, ...r6, ...r7, ...r8, ...r9, ...r10, ...r11, ...r12, ...r13]
})

const barSegments = computed(() => {
    if (!props.anaResult) return []
    const ana = props.anaResult

    const percThermals = Math.round(ana.percThermals * 100) || 0
    const percGlides = Math.round(ana.percGlides * 100) || 0
    const percDives = Math.round(ana.percDives * 100) || 0
    // Ensure total is 100? or calculate remainder
    const percVarious = Math.max(0, 100 - (percThermals + percGlides + percDives))

    const segments = []

    // Thermal
    segments.push({
        value: percThermals,
        color: '#ffb300', // Amber
        label: $gettext('Thermals'),
        width: percThermals,
        radius: '8px 0 0 8px',
        showValue: percThermals > 8
    })

    // Glide
    segments.push({
        value: percGlides,
        color: '#1976d2', // Blue
        label: $gettext('Glides'),
        width: percGlides,
        radius: '0',
        showValue: percGlides > 8
    })

    // Dive (optional)
    if (percDives > 0) {
        segments.push({
            value: percDives,
            color: '#c62828', // Red
            label: $gettext('Dives'),
            width: percDives,
            radius: '0',
            showValue: percDives > 8
        })
    }

    // Various
    segments.push({
        value: percVarious,
        color: '#43a047', // Green
        label: $gettext('Various'),
        width: percVarious,
        radius: '0 8px 8px 0',
        showValue: percVarious > 8
    })

    // Adjust radii based on what's present (simplification)
    if (segments.length === 1) segments[0].radius = '8px'
    else if (segments.length > 1) {
        segments[0].radius = '8px 0 0 8px'
        segments[segments.length - 1].radius = '0 8px 8px 0'
        for (let i = 1; i < segments.length - 1; i++) segments[i].radius = '0'
    }

    return segments
})

function formatAlt(val) {
    if (val === undefined || val === null) return 'N/A'
    return val + ' m'
}

</script>

<style scoped>
.trace-info-card {
    font-family: 'Roboto', sans-serif;
    /* Try to match typical system font */
}

.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 24px;
    row-gap: 8px;
}

.info-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.95rem;
    line-height: 1.4;
}

.info-label {
    font-weight: bold;
    color: #333;
}

.info-value {
    font-weight: normal;
    text-align: right;
    color: #444;
}

.efficiency-highlight .info-value {
    background-color: #ffe0b2;
    /* Pale orange highlight */
    padding: 0 6px;
    border-radius: 4px;
    font-weight: bold;
}

/* Mini Bar Styles */
.mini-bar-container {
    margin-top: 16px;
}

.mini-bar {
    display: flex;
    width: 100%;
    height: 32px;
    background-color: #eee;
    border-radius: 8px;
    margin-bottom: 4px;
}

.mini-bar-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 0.9rem;
    overflow: hidden;
    white-space: nowrap;
}

.mini-bar-legend {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    font-weight: 500;
}
</style>
