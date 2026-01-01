<template>
    <div class="gliders-chart-container">
        <!-- Section 2.1: Filter selection bar -->
        <div class="filter-selection-bar">
            <div class="selection-title">{{ selectionTitle }}</div>
            <div class="radio-row">
                <v-radio-group v-model="selectedFilter" inline hide-details>
                    <v-radio :label="$gettext('Top 5')" value="5" />
                    <v-radio :label="$gettext('Top 10')" value="10" />
                    <v-radio :label="$gettext('Top 20')" value="20" />
                    <v-radio :label="$gettext('All')" value="all" />
                </v-radio-group>
                <v-btn color="primary" variant="flat" size="small" @click="displayChart">
                    {{ $gettext('Display') }}
                </v-btn>
            </div>
        </div>

        <!-- Section 2.2: Chart -->
        <div class="chart-wrapper">
            <canvas ref="chartCanvas"></canvas>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
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

// Selected filter (default Top 5)
const selectedFilter = ref('5');

// Data from database
const glidersData = ref([]); // Array of { name, hours, flights }

// Selection title
const selectionTitle = computed(() => {
    return $gettext('You can select the number of gliders to be displayed in the graph');
});

// Color palette for bars
const barColors = [
    '#6FE3E1', '#333333', '#4CAF50', '#FF9800', '#2196F3', '#E91E63',
    '#CDDC39', '#9C27B0', '#00BCD4', '#795548', '#607D8B', '#FF5722',
    '#3F51B5', '#8BC34A', '#FFC107', '#673AB7', '#009688', '#F44336',
    '#9E9E9E', '#FF6F00'
];

onMounted(async () => {
    await loadData();
});

// Watch for year changes
watch([() => props.yearBegin, () => props.yearEnd], async () => {
    await loadData();
    if (chartInstance) {
        displayChart();
    }
});

/**
 * Load gliders data from database
 */
async function loadData() {
    if (!databaseStore.hasOpenDatabase) return;

    const startYear = props.yearBegin;
    const endYear = props.yearEnd;

    glidersData.value = [];

    // Query: get hours and flights per glider, ordered by hours DESC
    const reqSQL = `SELECT V_Engin, COUNT(V_ID) AS nb, COALESCE(SUM(V_Duree), 0) AS dur FROM Vol WHERE strftime('%Y-%m', V_date) >= '${startYear}-01' AND strftime('%Y-%m', V_date) <= '${endYear}-12' GROUP BY UPPER(V_Engin) ORDER BY SUM(V_Duree) DESC`;

    const result = databaseStore.query(reqSQL);

    if (result.success && result.data?.[0]) {
        for (const row of result.data[0].values) {
            const name = row[0] || 'Unknown';
            const flights = row[1] || 0;
            const hours = Math.round((row[2] || 0) / 3600 * 10) / 10; // Decimal hours

            glidersData.value.push({ name, hours, flights });
        }
    }
}

/**
 * Display chart with filtered data
 */
function displayChart() {
    if (!chartCanvas.value) return;

    // Filter data based on selection
    let filteredData = [...glidersData.value];
    if (selectedFilter.value !== 'all') {
        const limit = parseInt(selectedFilter.value);
        filteredData = filteredData.slice(0, limit);
    }

    if (filteredData.length === 0) return;

    // Prepare chart data
    const labels = filteredData.map(d => d.name);
    const hoursData = filteredData.map(d => d.hours);
    const flightsData = filteredData.map(d => d.flights);
    const colors = filteredData.map((_, i) => barColors[i % barColors.length]);

    // Destroy existing chart
    if (chartInstance) {
        chartInstance.destroy();
    }

    const ctx = chartCanvas.value.getContext('2d');

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: hoursData,
                backgroundColor: colors,
                borderWidth: 0,
                barPercentage: 0.7,
                categoryPercentage: 0.8
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bars
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const index = context.dataIndex;
                            const hours = hoursData[index];
                            const flights = flightsData[index];
                            return `${$gettext('Flight hours')}: ${hours}h - ${flights} ${$gettext('Flights')}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: $gettext('Flight hours')
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}
</script>

<style scoped>
.gliders-chart-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    gap: 16px;
}

.filter-selection-bar {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 16px;
    flex-shrink: 0;
}

.selection-title {
    text-align: center;
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 8px;
    color: #333;
}

.radio-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
}

.radio-row :deep(.v-label) {
    font-size: 0.85rem;
}

.radio-row :deep(.v-selection-control) {
    min-height: 32px;
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
</style>
