<template>
    <div class="monthly-chart-container">
        <!-- Section 2.1: Month selection bar -->
        <div class="month-selection-bar">
            <div class="selection-title">
                {{ selectionTitle }}
            </div>
            <div class="checkboxes-row">
                <v-checkbox v-model="selectedMonths[0]" :label="$gettext('Jan')" density="compact" hide-details />
                <v-checkbox v-model="selectedMonths[1]" :label="$gettext('Feb')" density="compact" hide-details />
                <v-checkbox v-model="selectedMonths[2]" :label="$gettext('Mar')" density="compact" hide-details />
                <v-checkbox v-model="selectedMonths[3]" :label="$gettext('Apr')" density="compact" hide-details />
                <v-checkbox v-model="selectedMonths[4]" :label="$gettext('May')" density="compact" hide-details />
                <v-checkbox v-model="selectedMonths[5]" :label="$gettext('Jun')" density="compact" hide-details />
                <v-checkbox v-model="selectedMonths[6]" :label="$gettext('Jul')" density="compact" hide-details />
                <v-checkbox v-model="selectedMonths[7]" :label="$gettext('Aug')" density="compact" hide-details />
                <v-checkbox v-model="selectedMonths[8]" :label="$gettext('Sep')" density="compact" hide-details />
                <v-checkbox v-model="selectedMonths[9]" :label="$gettext('Oct')" density="compact" hide-details />
                <v-checkbox v-model="selectedMonths[10]" :label="$gettext('Nov')" density="compact" hide-details />
                <v-checkbox v-model="selectedMonths[11]" :label="$gettext('Dec')" density="compact" hide-details />
                <v-checkbox v-model="selectAll" :label="$gettext('All')" density="compact" hide-details
                    @update:model-value="onSelectAll" />
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
import { ref, onMounted, watch, nextTick, computed } from 'vue';
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

// Selected months (array of 12 booleans)
const selectedMonths = ref([false, false, false, false, false, false, false, false, false, false, false, false]);
const selectAll = ref(false);

// Raw data from database
const yearsSerie = ref([]);
const yearsMonthesSerie = ref([]); // Array of arrays: [year][month] = hours

// Month labels
const monthLabels = computed(() => [
    $gettext('Jan'), $gettext('Feb'), $gettext('Mar'), $gettext('Apr'),
    $gettext('May'), $gettext('Jun'), $gettext('Jul'), $gettext('Aug'),
    $gettext('Sep'), $gettext('Oct'), $gettext('Nov'), $gettext('Dec')
]);

// Selection title
const selectionTitle = computed(() => {
    return $gettext('Monthly comparison') + ' - ' + $gettext('You can select one or more months or the whole year');
});

// Color palette for years (cycling through if more years than colors)
const yearColors = [
    '#6FE3E1', '#333333', '#4CAF50', '#FF9800', '#2196F3', '#E91E63',
    '#CDDC39', '#9C27B0', '#00BCD4', '#795548', '#607D8B', '#FF5722',
    '#3F51B5', '#8BC34A', '#FFC107', '#673AB7', '#009688', '#F44336'
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
 * Handle "All" checkbox
 */
function onSelectAll(checked) {
    for (let i = 0; i < 12; i++) {
        selectedMonths.value[i] = checked;
    }
}

/**
 * Load monthly data from database
 */
async function loadData() {
    if (!databaseStore.hasOpenDatabase) return;

    const startYear = props.yearBegin;
    const endYear = props.yearEnd;

    yearsSerie.value = [];
    yearsMonthesSerie.value = [];

    // Query: get hours per year and month
    const reqSQL = `SELECT strftime('%Y', V_date) AS year, strftime('%m', V_date) AS month, COALESCE(SUM(V_Duree), 0) AS dur FROM Vol WHERE strftime('%Y-%m', V_date) >= '${startYear}-01' AND strftime('%Y-%m', V_date) <= '${endYear}-12' GROUP BY strftime('%Y', V_date), strftime('%m', V_date) ORDER BY year, month`;

    const result = databaseStore.query(reqSQL);

    if (result.success && result.data?.[0]) {
        let currentYear = null;
        let currentMonthSerie = Array(12).fill(0);

        for (const row of result.data[0].values) {
            const year = row[0];
            const month = parseInt(row[1]);
            const hours = Math.round((row[2] || 0) / 3600 * 10) / 10; // Convert to decimal hours with 1 decimal

            if (year !== currentYear) {
                if (currentYear !== null) {
                    // Save previous year
                    yearsMonthesSerie.value.push([...currentMonthSerie]);
                }
                // New year
                currentYear = year;
                yearsSerie.value.push(year);
                currentMonthSerie = Array(12).fill(0);
            }

            // Add value to month (month is 1-indexed)
            if (month >= 1 && month <= 12) {
                currentMonthSerie[month - 1] = hours;
            }
        }

        // Don't forget the last year
        if (currentYear !== null) {
            yearsMonthesSerie.value.push([...currentMonthSerie]);
        }
    }
}

/**
 * Filter months based on selection and display chart
 */
function displayChart() {
    if (!chartCanvas.value) return;

    // Filter selected months
    const filteredMonthLabels = [];
    for (let i = 0; i < 12; i++) {
        if (selectedMonths.value[i]) {
            filteredMonthLabels.push(monthLabels.value[i]);
        }
    }

    if (filteredMonthLabels.length === 0) {
        // No months selected
        return;
    }

    // Build datasets for each year
    const datasets = [];
    for (let i = 0; i < yearsSerie.value.length; i++) {
        const year = yearsSerie.value[i];
        const yearData = yearsMonthesSerie.value[i];

        // Filter data for selected months
        const filteredData = [];
        for (let j = 0; j < 12; j++) {
            if (selectedMonths.value[j]) {
                filteredData.push(yearData[j]);
            }
        }

        datasets.push({
            label: year,
            data: filteredData,
            backgroundColor: yearColors[i % yearColors.length],
            borderWidth: 0,
            barPercentage: 0.8,
            categoryPercentage: 0.9
        });
    }

    // Destroy existing chart
    if (chartInstance) {
        chartInstance.destroy();
    }

    const ctx = chartCanvas.value.getContext('2d');

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: filteredMonthLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `${context.dataset.label}: ${context.raw}h`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: $gettext('Flight hours')
                    }
                },
                x: {
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
.monthly-chart-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    gap: 16px;
}

.month-selection-bar {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 16px;
    flex-shrink: 0;
}

.selection-title {
    text-align: center;
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 12px;
    color: #333;
}

.checkboxes-row {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
}

.checkboxes-row .v-checkbox {
    flex: 0 0 auto;
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
    padding: 8px 0;
    flex-shrink: 0;
}

.chart-title h2 {
    margin: 0;
    color: #333;
    font-weight: 500;
}
</style>
