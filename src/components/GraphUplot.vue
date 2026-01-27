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
    },
    cuttingMode: {
        type: Boolean,
        default: false
    },
    cutStart: {
        type: Number,
        default: null
    },
    cutEnd: {
        type: Number,
        default: null
    },
    currentIndex: {
        type: Number,
        default: null
    },
    offsetUTC: {
        type: Number,
        default: 0  // Offset in minutes from UTC (positive = east of UTC, negative = west)
    }
})

const emit = defineEmits(['cursor-changed', 'click-graph'])

const chartContainer = ref(null)
let uplotInstance = null
let resizeObserver = null
let chartTimestamps = [] // Stored at module level for draw hook access

onMounted(async () => {
    await nextTick()
    if (props.fixes && props.fixes.length > 0) {
        createChart()
    }

    // Use ResizeObserver for more robust width/height detection
    if (chartContainer.value) {
        resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width } = entry.contentRect
                if (width > 0) {
                    if (!uplotInstance) {
                        createChart()
                    } else {
                        resizeChart()
                    }
                }
            }
        })
        resizeObserver.observe(chartContainer.value)
    }
})

watch(() => [props.fixes, props.groundAltitudes, props.cuttingMode, props.cutStart, props.cutEnd], async () => {
    await nextTick()
    if (props.fixes && props.fixes.length > 0) {
        if (uplotInstance) {
            uplotInstance.destroy()
            uplotInstance = null
        }
        createChart()
    }
})

// Watch currentIndex for animation synchronization - only redraw without recreating
watch(() => props.currentIndex, () => {
    if (uplotInstance && props.currentIndex !== null) {
        uplotInstance.redraw()
    }
})

function createChart() {
    if (!chartContainer.value || chartContainer.value.offsetWidth === 0) return

    const fixes = props.fixes
    const timestamps = []
    const altitudes = []
    const speeds = []
    const varios = []
    const ground = []

    const startTime = fixes[0].timestamp / 1000

    for (let i = 0; i < fixes.length; i++) {
        timestamps.push((fixes[i].timestamp / 1000) - startTime)
        altitudes.push(fixes[i].gpsAltitude || 0)

        if (props.groundAltitudes && props.groundAltitudes[i] != null) {
            ground.push(props.groundAltitudes[i])
        } else {
            ground.push(null)
        }

        if (i > 0) {
            const dt = (fixes[i].timestamp - fixes[i - 1].timestamp) / 1000
            if (dt > 0) {
                const dz = (fixes[i].gpsAltitude || 0) - (fixes[i - 1].gpsAltitude || 0)
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

    // Store timestamps at module level for draw hook access during redraw
    chartTimestamps = timestamps

    const data = [timestamps, altitudes]
    // Add ground series data only if NOT in cutting mode for better clarity
    if (props.groundAltitudes && !props.cuttingMode) {
        data.push(ground)
    }

    const series = [
        { label: 'Temps (s)' },
        {
            label: 'Altitude (m)',
            stroke: props.cuttingMode ? '#ff0000' : '#1976d2',
            width: 2,
            fill: props.cuttingMode ? 'rgba(255, 0, 0, 0.1)' : 'rgba(25, 118, 210, 0.1)'
        }
    ]

    if (props.groundAltitudes && !props.cuttingMode) {
        series.push({
            label: 'Sol (m)',
            stroke: '#5d4037',
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
                    // Apply the flight's UTC offset to display local time at the flight location
                    // offsetUTC is in minutes, we need milliseconds for Date addition
                    const offsetMs = (props.offsetUTC || 0) * 60 * 1000;
                    return ticks.map(sec => {
                        // Create date with the flight's local time by adding offset to UTC timestamp
                        const utcTimestamp = fixes[0].timestamp + sec * 1000;
                        const localTimestamp = utcTimestamp + offsetMs;
                        const t = new Date(localTimestamp);
                        // Use getUTCHours/getUTCMinutes since we've already applied the offset
                        return t.getUTCHours().toString().padStart(2, '0') + ':' + t.getUTCMinutes().toString().padStart(2, '0');
                    });
                }
            },
            { size: 50, label: 'Altitude (m)' }
        ],
        cursor: {
            drag: { x: true, y: true, uni: 50 },
            dataIdx: (u, seriesIdx, dataIdx) => dataIdx
        },
        hooks: {
            draw: [
                u => {
                    const { ctx } = u
                    const { left, top, width, height } = u.bbox

                    ctx.save()
                    ctx.beginPath()
                    ctx.rect(left, top, width, height)
                    ctx.clip()

                    // Draw cutting mode overlays
                    if (props.cuttingMode) {
                        // Draw selection area
                        if (props.cutStart !== null && props.cutEnd !== null) {
                            const startX = u.valToPos(timestamps[props.cutStart], 'x', true)
                            const endX = u.valToPos(timestamps[props.cutEnd], 'x', true)

                            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
                            ctx.fillRect(Math.min(startX, endX), top, Math.abs(startX - endX), height)
                        }

                        // Draw vertical lines for cut points
                        if (props.cutStart !== null) {
                            const x = u.valToPos(timestamps[props.cutStart], 'x', true)
                            ctx.strokeStyle = 'red'
                            ctx.setLineDash([5, 5])
                            ctx.lineWidth = 2
                            ctx.beginPath()
                            ctx.moveTo(x, top)
                            ctx.lineTo(x, top + height)
                            ctx.stroke()
                        }

                        if (props.cutEnd !== null) {
                            const x = u.valToPos(timestamps[props.cutEnd], 'x', true)
                            ctx.strokeStyle = 'red'
                            ctx.setLineDash([5, 5])
                            ctx.lineWidth = 2
                            ctx.beginPath()
                            ctx.moveTo(x, top)
                            ctx.lineTo(x, top + height)
                            ctx.stroke()
                        }
                    }

                    // Draw animation progress fill (for CesiumReplayView synchronization)
                    // Colors the portion of the graph already traversed in orange
                    if (props.currentIndex !== null && props.currentIndex >= 0 && props.currentIndex < chartTimestamps.length) {
                        const startX = u.valToPos(chartTimestamps[0], 'x', true)
                        const currentX = u.valToPos(chartTimestamps[props.currentIndex], 'x', true)

                        // Draw filled rectangle from start to current position
                        ctx.fillStyle = 'rgba(255, 152, 0, 0.3)' // Semi-transparent orange
                        ctx.fillRect(startX, top, currentX - startX, height)

                        // Draw vertical line at current position
                        ctx.strokeStyle = '#ff9800' // Orange color
                        ctx.setLineDash([]) // Solid line
                        ctx.lineWidth = 2
                        ctx.beginPath()
                        ctx.moveTo(currentX, top)
                        ctx.lineTo(currentX, top + height)
                        ctx.stroke()

                        // Draw a small triangle at the top
                        ctx.fillStyle = '#ff9800'
                        ctx.beginPath()
                        ctx.moveTo(currentX, top)
                        ctx.lineTo(currentX - 6, top - 8)
                        ctx.lineTo(currentX + 6, top - 8)
                        ctx.closePath()
                        ctx.fill()
                    }

                    ctx.restore()
                }
            ]
        }
    }

    uplotInstance = new uPlot(opts, data, chartContainer.value)

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

    uplotInstance.root.addEventListener('click', e => {
        const idx = uplotInstance.cursor.idx
        if (idx != null && idx >= 0 && idx < fixes.length) {
            // Always emit click-graph for animation jumping or cutting mode
            emit('click-graph', idx)
        }
    })
}

function resizeChart() {
    if (uplotInstance && chartContainer.value && chartContainer.value.offsetWidth > 0) {
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
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
})
</script>

<style scoped>
.chart-container {
    width: 100%;
    height: 100%;
}
</style>
