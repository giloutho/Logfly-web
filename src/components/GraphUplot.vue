<template>
    <div ref="chartContainer" class="chart-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

const props = defineProps({
    fixes: {
        type: Array,
        required: true
    },
    groundAltitudes: {
        type: Array,
        default: null
    },
    height: {
        type: Number,
        default: 150
    }
})

const emit = defineEmits(['cursor-changed'])

const chartContainer = ref(null)
let uplotInstance = null

onMounted(() => {
    if (props.fixes && props.fixes.length > 0) {
        createChart()
    }
})

watch(() => props.fixes, (val) => {
    if (val && val.length > 0) {
        if (uplotInstance) {
            uplotInstance.destroy()
            uplotInstance = null
        }
        createChart()
    }
})

watch(() => props.groundAltitudes, (val) => {
    // Recreate chart if ground altitudes arrive later
    if (props.fixes && props.fixes.length > 0) {
        if (uplotInstance) {
            uplotInstance.destroy()
            uplotInstance = null
        }
        createChart()
    }
})

function createChart() {
    if (!chartContainer.value) return

    const fixes = props.fixes
    const timestamps = []
    const altitudes = []
    const speeds = []
    const varios = []
    // Add ground
    const ground = []

    const startTime = fixes[0].timestamp / 1000

    for (let i = 0; i < fixes.length; i++) {
        timestamps.push((fixes[i].timestamp / 1000) - startTime)
        altitudes.push(fixes[i].gpsAltitude || 0)

        if (props.groundAltitudes && props.groundAltitudes[i] != null) {
            ground.push(props.groundAltitudes[i])
        } else {
            // Fill with null or 0 if missing, strictly uplot prefers same length arrays
            ground.push(null)
        }

        if (i > 0) {
            const dt = (fixes[i].timestamp - fixes[i - 1].timestamp) / 1000
            if (dt > 0) {
                const dz = fixes[i].gpsAltitude - fixes[i - 1].gpsAltitude
                varios.push(dz / dt)
                const dx = Math.sqrt(
                    Math.pow(fixes[i].latitude - fixes[i - 1].latitude, 2) +
                    Math.pow(fixes[i].longitude - fixes[i - 1].longitude, 2)
                ) * 111000
                speeds.push((dx / dt) * 3.6)
            } else {
                varios.push(0)
                speeds.push(0)
            }
        } else {
            varios.push(0)
            speeds.push(0)
        }
    }

    const data = [timestamps, altitudes]
    // Add ground series data
    // Only add if we have some valid ground data? Or always add to keep structure consistent?
    // Let's add it if props.groundAltitudes is present
    if (props.groundAltitudes) {
        data.push(ground)
    }

    const series = [
        { label: 'Temps (s)' },
        {
            label: 'Altitude (m)',
            stroke: '#1976d2',
            width: 2,
            fill: 'rgba(25, 118, 210, 0.1)'
        }
    ]

    if (props.groundAltitudes) {
        series.push({
            label: 'Sol (m)',
            stroke: '#5d4037', // Brownish
            width: 1,
            fill: 'rgba(93, 64, 55, 0.3)',
            points: { show: false }
        })
    }

    const opts = {
        width: chartContainer.value.offsetWidth,
        height: props.height,
        scales: {
            x: { time: false },
        },
        series,
        axes: [
            {
                values: (u, ticks) => {
                    return ticks.map(sec => {
                        const t = new Date(fixes[0].timestamp + sec * 1000)
                        return t.getHours().toString().padStart(2, '0') + ':' + t.getMinutes().toString().padStart(2, '0')
                    })
                }
            },
            { size: 50, label: 'Altitude (m)' }
        ],
        cursor: {
            drag: { x: true, y: true, uni: 50 }
        }
    }

    uplotInstance = new uPlot(opts, data, chartContainer.value)

    // Add event listener for cursor move
    uplotInstance.root.addEventListener('mousemove', e => {
        if (!uplotInstance.cursor) return
        const idx = uplotInstance.cursor.idx
        if (idx != null && idx >= 0 && idx < fixes.length) {
            emit('cursor-changed', {
                index: idx,
                timestamp: fixes[idx].timestamp,
                altitude: altitudes[idx],
                vario: varios[idx],
                speed: speeds[idx],
                lat: fixes[idx].latitude,
                lon: fixes[idx].longitude
            })
        }
    })

    // Handle resize
    window.addEventListener('resize', resizeChart)
}

function resizeChart() {
    if (uplotInstance && chartContainer.value) {
        uplotInstance.setSize({
            width: chartContainer.value.offsetWidth,
            height: props.height
        })
    }
}

onBeforeUnmount(() => {
    if (uplotInstance) {
        uplotInstance.destroy()
        uplotInstance = null
    }
    window.removeEventListener('resize', resizeChart)
})
</script>

<style scoped>
.chart-container {
    width: 100%;
    height: 100%;
}
</style>
