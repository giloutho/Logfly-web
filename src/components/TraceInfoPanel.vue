<template>
    <v-card class="trace-info-panel" elevation="0">
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
    </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    decodedData: Object,
    anaResult: Object
})

const displayFields = computed(() => {
    if (!props.decodedData || !props.decodedData.fixes) return []

    const track = props.decodedData
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
    const durationFormatted = durationDate.toISOString().substr(11, 8)

    const avgTransSpeed = ana.avgTransSpeed ? (Math.round(ana.avgTransSpeed * 100) / 100).toFixed(0) : '0'
    const avgThermalClimb = ana.avgThermalClimb ? (Math.round(ana.avgThermalClimb * 100) / 100).toFixed(2) : '0.00'

    // Extraction Time
    const h = Math.floor((ana.extractTime || 0) / 3600)
    const m = Math.floor(((ana.extractTime || 0) % 3600) / 60)
    const s = Math.floor(((ana.extractTime || 0) % 3600) % 60)
    const hDisplay = h > 0 ? h + "h" : ""
    const mDisplay = m > 0 ? m + "mn" : ""
    const sDisplay = s > 0 ? s + "s" : ""
    const hExtractTime = hDisplay + mDisplay + sDisplay

    const fSite = info.site || ''

    // Fields definition matching reference layout (2 columns)
    const r1 = [
        { id: 'date', label: 'Date', value: info.date },
        { id: 'site', label: 'Site', value: fSite }
    ]
    const r2 = [
        { id: 'pilot', label: 'Pilote', value: info.pilot },
        { id: 'glider', label: 'Voile', value: info.gliderType }
    ]
    const r3 = [
        { id: 'tkofftime', label: 'Décollage', value: hTkoff },
        { id: 'tkoffalt', label: 'Alti GPS', value: formatAlt(fixes[0].gpsAltitude) }
    ]
    const r4 = [
        { id: 'landtime', label: 'Atterrissage', value: hLand },
        { id: 'landalt', label: 'Alti GPS', value: formatAlt(fixes[fixes.length - 1].gpsAltitude) }
    ]
    const r5 = [
        { id: 'duration', label: 'Durée', value: durationFormatted },
        { id: 'size', label: 'Longueur', value: (stat.distance || 0).toFixed(2) + ' km' }
    ]
    const r6 = [
        { id: 'maxalt', label: 'Alt max GPS', value: formatAlt(stat.maxalt?.gps) },
        { id: 'minalt', label: 'Alti Mini GPS', value: formatAlt(stat.minialt?.gps) }
    ]
    const r7 = [
        { id: 'maxclimb', label: 'Vario max', value: (stat.maxclimb || 0) + ' m/s' },
        { id: 'minvario', label: 'Vario mini', value: (stat.maxsink || 0) + ' m/s' }
    ]
    const r8 = [
        { id: 'maxgain', label: 'Gain max', value: formatAlt(ana.bestGain) },
        { id: 'maxspeed', label: 'Vitesse max', value: (stat.maxspeed || 0) + ' km/h' }
    ]
    const r9 = [
        { id: 'bestglide', label: 'Meilleure transition', value: ((ana.bestGlide || 0) / 1000).toFixed(2) + ' km' },
        { id: 'empty1', label: '', value: '' }
    ]
    const r10 = [
        { id: 'avgtrans', label: 'Vit moyenne transition', value: avgTransSpeed + ' km/h' },
        { id: 'empty2', label: '', value: '' }
    ]
    const r11 = [
        { id: 'avgthermal', label: 'Taux moyen montée', value: avgThermalClimb + ' m/s' },
        { id: 'empty3', label: '', value: '' }
    ]
    const r12 = [
        { id: 'extracttime', label: "Délai d'extraction", value: hExtractTime },
        { id: 'empty4', label: '', value: '' }
    ]
    const r13 = [
        { id: 'efficiency', label: 'Efficacité moyenne', value: Math.ceil(ana.avgThermalEffi || 0) + ' %' },
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
    const percVarious = Math.max(0, 100 - (percThermals + percGlides + percDives))

    const segments = []

    segments.push({
        value: percThermals,
        color: '#ffb300',
        label: 'Thermique',
        width: percThermals,
        radius: '8px 0 0 8px',
        showValue: percThermals > 8
    })

    segments.push({
        value: percGlides,
        color: '#1976d2',
        label: 'Transition',
        width: percGlides,
        radius: '0',
        showValue: percGlides > 8
    })

    if (percDives > 0) {
        segments.push({
            value: percDives,
            color: '#c62828',
            label: 'Dive',
            width: percDives,
            radius: '0',
            showValue: percDives > 8
        })
    }

    segments.push({
        value: percVarious,
        color: '#43a047',
        label: 'Divers',
        width: percVarious,
        radius: '0 8px 8px 0',
        showValue: percVarious > 8
    })

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
.trace-info-panel {
    font-family: 'Roboto', sans-serif;
    height: 100%;
    overflow-y: auto;
}

.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 24px;
    row-gap: 6px;
}

.info-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    line-height: 1.3;
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
    padding: 0 6px;
    border-radius: 4px;
    font-weight: bold;
}

.mini-bar-container {
    margin-top: 12px;
}

.mini-bar {
    display: flex;
    width: 100%;
    height: 28px;
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
    font-size: 0.85rem;
    overflow: hidden;
    white-space: nowrap;
}

.mini-bar-legend {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 500;
}
</style>
