<template>
    <div class="yearly-chart-container">
        <div class="chart-wrapper">
            <canvas ref="chartCanvas"></canvas>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import { useGettext } from "vue3-gettext";
import { useDatabaseStore } from '@/stores/database';
import Chart from 'chart.js/auto';

const databaseStore = useDatabaseStore();
const { $gettext } = useGettext();

const props = defineProps({
    yearBegin: {
        type: String,
        required: true
    },
    yearEnd: {
        type: String,
        required: true
    }
});

const chartCanvas = ref(null);
let chartInstance = null;

// Chart data
const yearLabels = ref([]);
const hoursData = ref([]);
const flightsData = ref([]);

onMounted(async () => {
    await loadData();
    await nextTick();
    renderChart();
});

// Watch for year changes
watch([() => props.yearBegin, () => props.yearEnd], async () => {
    await loadData();
    renderChart();
});

/**
 * Load yearly data from database
 */
async function loadData() {
    if (!databaseStore.hasOpenDatabase) return;

    const startYear = props.yearBegin;
    const endYear = props.yearEnd;

    yearLabels.value = [];
    hoursData.value = [];
    flightsData.value = [];

    // Get yearly hours
    const hoursSQL = `SELECT strftime('%Y', V_date) AS Year, COALESCE(SUM(V_Duree), 0) AS Dur FROM Vol WHERE strftime('%Y-%m', V_date) >= '${startYear}-01' AND strftime('%Y-%m', V_date) <= '${endYear}-12' GROUP BY strftime('%Y', V_date) ORDER BY Year`;
    const hoursResult = databaseStore.query(hoursSQL);

    if (hoursResult.success && hoursResult.data?.[0]) {
        for (const row of hoursResult.data[0].values) {
            yearLabels.value.push(row[0]);
            const hours = Math.round((row[1] || 0) / 3600); // Convert seconds to hours
            hoursData.value.push(hours);
        }
    }

    // Get yearly flights
    const flightsSQL = `SELECT strftime('%Y', V_date) AS Year, COUNT(V_ID) AS Flights FROM Vol WHERE strftime('%Y-%m', V_date) >= '${startYear}-01' AND strftime('%Y-%m', V_date) <= '${endYear}-12' GROUP BY strftime('%Y', V_date) ORDER BY Year`;
    const flightsResult = databaseStore.query(flightsSQL);

    if (flightsResult.success && flightsResult.data?.[0]) {
        for (const row of flightsResult.data[0].values) {
            flightsData.value.push(row[1] || 0);
        }
    }
}

/**
 * Render the chart with bars (hours) and line (flights)
 */
function renderChart() {
    if (!chartCanvas.value) return;

    const ctx = chartCanvas.value.getContext('2d');

    // Destroy existing chart
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Calculate max value for unified Y axis
    const maxHours = Math.max(...hoursData.value, 0);
    const maxFlights = Math.max(...flightsData.value, 0);
    const maxY = Math.max(maxHours, maxFlights);

    // Generate gradient colors for bars based on value
    const barColors = hoursData.value.map(value => {
        const ratio = maxHours > 0 ? value / maxHours : 0;
        // Gradient from light cyan to dark blue
        const r = Math.round(111 - (ratio * 50));
        const g = Math.round(227 - (ratio * 140));
        const b = Math.round(225 + (ratio * 4));
        return `rgba(${r}, ${g}, ${b}, 0.8)`;
    });

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: yearLabels.value,
            datasets: [
                {
                    label: $gettext('Flight hours'),
                    type: 'bar',
                    data: hoursData.value,
                    backgroundColor: barColors,
                    borderWidth: 0,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: $gettext('Flights'),
                    type: 'line',
                    data: flightsData.value,
                    borderColor: '#e555d3',
                    backgroundColor: '#e555d3',
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#e555d3',
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y1',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            if (context.dataset.type === 'line') {
                                return `${context.dataset.label}: ${context.raw} ${$gettext('flights')}`;
                            }
                            return `${context.dataset.label}: ${context.raw} h`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    max: maxY + 10,
                    title: {
                        display: true,
                        text: $gettext('Flight hours'),
                        color: '#6FE3E1'
                    },
                    ticks: {
                        color: '#6FE3E1'
                    },
                    grid: {
                        drawOnChartArea: true
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    max: maxY + 10,
                    title: {
                        display: true,
                        text: $gettext('Number of flights'),
                        color: '#e555d3'
                    },
                    ticks: {
                        color: '#e555d3'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}
</script>

<style scoped>
.yearly-chart-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

.chart-wrapper {
    flex: 1;
    min-height: 0;
    position: relative;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-wrapper canvas {
    width: 100% !important;
    height: 100% !important;
}

.chart-title {
    text-align: center;
    padding: 16px 0;
}

.chart-title h2 {
    margin: 0;
    color: #333;
    font-weight: 500;
}
</style>
