<template>
  <OpenLogbook :show="true" />
  <v-card v-if="databaseStore.hasOpenDatabase && refYear" flat class="annual-card">
    <!-- Line 1: Summary cards -->
    <div class="summary-cards">
      <v-card class="summary-card flights-card" elevation="4">
        <img src="@/assets/cloudglider.png" class="card-icon" alt="flights" />

        <div class="card-title">
          <span>{{ $gettext('Flights') }}</span>
          <span class="card-year">{{ refYear }}</span>
        </div>
        <div class="card-content-row">
          <div class="card-value">{{ summary.flights }}</div>

        </div>
      </v-card>
      <v-card class="summary-card hours-card" elevation="4">
        <img src="@/assets/clock3.png" class="card-icon" alt="hours" />
        <div class="card-title">
          <span>{{ $gettext('Hours') }}</span>
          <span class="card-year">{{ refYear }}</span>
        </div>
        <div class="card-value">{{ formatHoursDecimal(summary.hours) }}</div>
      </v-card>
      <v-card class="summary-card gliders-card" elevation="4">
        <img src="@/assets/glider.png" class="card-icon" alt="gliders" />
        <div class="card-title">
          <span>{{ $gettext('Gliders') }}</span>
          <span class="card-year">{{ refYear }}</span>
        </div>
        <div class="card-value">{{ summary.gliders }}</div>
      </v-card>
      <v-card class="summary-card sites-card" elevation="4">
        <img src="@/assets/windsock.png" class="card-icon" alt="sites" />
        <div class="card-title">
          <span>{{ $gettext('Sites') }}</span>
          <span class="card-year">{{ refYear }}</span>
        </div>
        <div class="card-value">{{ summary.sites }}</div>
      </v-card>
    </div>

    <!-- Line 2: Main content -->
    <div class="main-content">
      <!-- Left panel: Monthly table -->
      <div class="left-panel">
        <v-card class="panel-card" elevation="2">
          <div class="panel-header">
            <span class="panel-label">{{ $gettext('Reference') }}</span>
            <v-select v-model="refYear" :items="yearList" density="compact" variant="outlined" hide-details
              class="year-select" @update:model-value="onRefYearChange" />
          </div>
          <v-table density="compact" class="monthly-table">
            <thead>
              <tr>
                <th>{{ $gettext('Months') }}</th>
                <th class="text-center">{{ $gettext('Flights') }}</th>
                <th>{{ $gettext('Duration') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(month, index) in monthlyData" :key="index">
                <td>{{ monthLabels[index] }}</td>
                <td class="text-center">{{ month.flights || '' }}</td>
                <td>{{ month.flights ? formatDuration(month.hours) : '' }}</td>
              </tr>
            </tbody>
          </v-table>
          <div class="panel-footer">
            <span class="footer-left">{{ $gettext('Flights') }}: {{ totalFlights }}</span>
            <span class="footer-right">{{ formatDuration(totalHours) }}</span>
          </div>
        </v-card>
      </div>

      <!-- Center panel: Chart -->
      <div class="center-panel">
        <v-card class="panel-card" elevation="2">
          <div class="chart-container">
            <canvas ref="chartCanvas"></canvas>
          </div>
          <div class="chart-footer">
            <v-btn :color="chartMode === 'flights' ? 'success' : 'grey'" variant="flat" size="small"
              @click="setChartMode('flights')">
              {{ $gettext('Flights') }}
            </v-btn>
            <v-btn :color="chartMode === 'hours' ? 'error' : 'grey'" variant="flat" size="small"
              @click="setChartMode('hours')">
              {{ $gettext('Hours') }}
            </v-btn>
            <v-select v-model="prevYear" :items="yearList" density="compact" variant="outlined" hide-details
              class="compare-select" :label="$gettext('Compare')" @update:model-value="onPrevYearChange" />
          </div>
        </v-card>
      </div>

      <!-- Right panel: Gliders/Sites table -->
      <div class="right-panel">
        <v-card class="panel-card" elevation="2">
          <div class="panel-header right-header">
            <v-btn :color="rightMode === 'gliders' ? 'warning' : 'grey'" size="small" variant="flat"
              @click="setRightMode('gliders')">
              {{ $gettext('Gliders') }}
            </v-btn>
            <span class="right-year">{{ refYear }}</span>
            <v-btn :color="rightMode === 'sites' ? 'info' : 'grey'" size="small" variant="flat"
              @click="setRightMode('sites')">
              {{ $gettext('Sites') }}
            </v-btn>
          </div>
          <div class="right-table-container">
            <v-table density="compact" class="right-table">
              <thead>
                <tr>
                  <th>{{ rightMode === 'gliders' ? $gettext('Glider') : $gettext('Site') }}</th>
                  <th class="text-center">{{ $gettext('Fl.') }}</th>
                  <th>{{ $gettext('Duration') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in rightTableData" :key="index">
                  <td>
                    <div>{{ item.name }}</div>
                    <div v-if="rightMode === 'gliders' && item.totalHours" class="total-hours">
                      {{ formatDuration(item.totalHours) }}
                    </div>
                  </td>
                  <td class="text-center">{{ item.flights }}</td>
                  <td>{{ formatDuration(item.hours) }}</td>
                </tr>
              </tbody>
            </v-table>
          </div>
          <div class="panel-footer">
            <span class="footer-left">{{ rightMode === 'gliders' ? $gettext('Gliders') : $gettext('Sites') }}:
              {{ rightTotalCount }}</span>
            <span class="footer-right">{{ formatDuration(rightTotalHours) }}</span>
          </div>
        </v-card>
      </div>
    </div>
  </v-card>

  <!-- No database message -->
  <v-card v-else-if="!databaseStore.hasOpenDatabase" flat class="annual-card d-flex align-center justify-center">
    <v-card-text class="text-center">
      <v-icon size="64" color="grey">mdi-database-off</v-icon>
      <h3 class="mt-4">{{ $gettext('No logbook opened') }}</h3>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useGettext } from "vue3-gettext";
import OpenLogbook from '@/components/OpenLogbook.vue';
import { useDatabaseStore } from '@/stores/database';
import Chart from 'chart.js/auto';

const databaseStore = useDatabaseStore();
const { $gettext } = useGettext();

// State
const refYear = ref(null);
const prevYear = ref(null);
const yearList = ref([]);
const monthlyData = ref([]);
const chartMode = ref('hours'); // 'flights' or 'hours'
const rightMode = ref('gliders'); // 'gliders' or 'sites'
const chartCanvas = ref(null);
let chartInstance = null;

// Summary data
const summary = ref({
  flights: 0,
  hours: 0,
  gliders: 0,
  sites: 0
});

// Chart data
const chartData = ref({
  refFlights: [],
  refHours: [],
  prevFlights: [],
  prevHours: []
});

// Right panel data
const rightTableData = ref([]);
const rightTotalCount = ref(0);
const rightTotalHours = ref(0);

// Month labels
const monthLabels = computed(() => [
  $gettext('Jan'), $gettext('Feb'), $gettext('Mar'), $gettext('Apr'),
  $gettext('May'), $gettext('Jun'), $gettext('Jul'), $gettext('Aug'),
  $gettext('Sep'), $gettext('Oct'), $gettext('Nov'), $gettext('Dec')
]);

// Computed totals
const totalFlights = computed(() => monthlyData.value.reduce((sum, m) => sum + (m.flights || 0), 0));
const totalHours = computed(() => monthlyData.value.reduce((sum, m) => sum + (m.hours || 0), 0));

onMounted(async () => {
  if (databaseStore.hasOpenDatabase) {
    await loadYears();
    if (refYear.value) {
      await loadAllData();
    }
  }
});

// Watch for database changes
watch(() => databaseStore.hasOpenDatabase, async (hasDb) => {
  if (hasDb) {
    await loadYears();
    if (refYear.value) {
      await loadAllData();
    }
  }
});

/**
 * Load all available years from database
 */
async function loadYears() {
  const reqSQL = `SELECT strftime('%Y', V_date) AS V_Year FROM Vol GROUP BY strftime('%Y', V_date) ORDER BY strftime('%Y', V_date) DESC`;
  const result = databaseStore.query(reqSQL);

  if (result.success && result.data && result.data[0]) {
    yearList.value = result.data[0].values.map(row => row[0]);
    if (yearList.value.length > 0) {
      refYear.value = yearList.value[0];
      // Set previous year (n-1) if available
      const refYearInt = parseInt(refYear.value);
      const prevYearStr = (refYearInt - 1).toString();
      prevYear.value = yearList.value.includes(prevYearStr) ? prevYearStr : yearList.value[1] || yearList.value[0];
    }
  }
}

/**
 * Load all data for current selection
 */
async function loadAllData() {
  await loadMonthlyData();
  await loadSummary();
  await loadRightPanelData();
  await nextTick();
  updateChart();
}

/**
 * Load monthly flights and hours for reference and comparison year
 */
async function loadMonthlyData() {
  monthlyData.value = [];
  chartData.value = {
    refFlights: [],
    refHours: [],
    prevFlights: [],
    prevHours: []
  };

  for (let i = 1; i <= 12; i++) {
    const monthStr = String(i).padStart(2, '0');

    // Reference year
    const refSQL = `SELECT COUNT(V_ID) AS Nb, COALESCE(SUM(V_Duree), 0) AS Dur FROM Vol WHERE strftime('%Y %m', V_date) = '${refYear.value} ${monthStr}'`;
    const refResult = databaseStore.query(refSQL);
    const refFlights = refResult.success && refResult.data?.[0]?.values?.[0]?.[0] || 0;
    const refHours = refResult.success && refResult.data?.[0]?.values?.[0]?.[1] || 0;

    // Previous year
    const prevSQL = `SELECT COUNT(V_ID) AS Nb, COALESCE(SUM(V_Duree), 0) AS Dur FROM Vol WHERE strftime('%Y %m', V_date) = '${prevYear.value} ${monthStr}'`;
    const prevResult = databaseStore.query(prevSQL);
    const prevFlights = prevResult.success && prevResult.data?.[0]?.values?.[0]?.[0] || 0;
    const prevHours = prevResult.success && prevResult.data?.[0]?.values?.[0]?.[1] || 0;

    monthlyData.value.push({
      flights: refFlights,
      hours: refHours
    });

    chartData.value.refFlights.push(refFlights);
    chartData.value.refHours.push(refHours / 3600); // Convert to hours
    chartData.value.prevFlights.push(prevFlights);
    chartData.value.prevHours.push(prevHours / 3600); // Convert to hours
  }
}

/**
 * Load summary data (total flights, hours, gliders, sites)
 */
async function loadSummary() {
  // Total flights and hours for reference year
  const flightsSQL = `SELECT COUNT(V_ID) AS Nb, COALESCE(SUM(V_Duree), 0) AS Dur FROM Vol WHERE strftime('%Y', V_date) = '${refYear.value}'`;
  const flightsResult = databaseStore.query(flightsSQL);
  if (flightsResult.success && flightsResult.data?.[0]?.values?.[0]) {
    summary.value.flights = flightsResult.data[0].values[0][0] || 0;
    summary.value.hours = flightsResult.data[0].values[0][1] || 0;
  }

  // Count distinct gliders
  const glidersSQL = `SELECT COUNT(DISTINCT V_Engin) AS Total FROM Vol WHERE strftime('%Y', V_date) = '${refYear.value}' AND V_Engin IS NOT NULL AND V_Engin != ''`;
  const glidersResult = databaseStore.query(glidersSQL);
  if (glidersResult.success && glidersResult.data?.[0]?.values?.[0]) {
    summary.value.gliders = glidersResult.data[0].values[0][0] || 0;
  }

  // Count distinct sites
  const sitesSQL = `SELECT COUNT(DISTINCT UPPER(V_Site)) AS Total FROM Vol WHERE strftime('%Y', V_date) = '${refYear.value}'`;
  const sitesResult = databaseStore.query(sitesSQL);
  if (sitesResult.success && sitesResult.data?.[0]?.values?.[0]) {
    summary.value.sites = sitesResult.data[0].values[0][0] || 0;
  }
}

/**
 * Load right panel data (gliders or sites)
 */
async function loadRightPanelData() {
  if (rightMode.value === 'gliders') {
    await loadGlidersData();
  } else {
    await loadSitesData();
  }
}

/**
 * Load gliders data for right panel
 */
async function loadGlidersData() {
  rightTableData.value = [];
  rightTotalHours.value = 0;

  const glidersSQL = `SELECT V_Engin, COUNT(V_ID) AS Nb, SUM(V_Duree) AS Dur FROM Vol WHERE strftime('%Y', V_date) = '${refYear.value}' GROUP BY V_Engin ORDER BY SUM(V_Duree) DESC`;
  const result = databaseStore.query(glidersSQL);

  if (result.success && result.data?.[0]) {
    for (const row of result.data[0].values) {
      const gliderName = row[0] || 'Unknown';
      const flights = row[1] || 0;
      const hours = row[2] || 0;

      // Get total hours for this glider (all time)
      const totalSQL = `SELECT SUM(V_Duree) AS Total FROM Vol WHERE V_Engin = '${gliderName.replace(/'/g, "''")}'`;
      const totalResult = databaseStore.query(totalSQL);
      const totalHours = totalResult.success && totalResult.data?.[0]?.values?.[0]?.[0] || 0;

      rightTableData.value.push({
        name: gliderName,
        flights,
        hours,
        totalHours
      });

      rightTotalHours.value += hours;
    }
  }

  rightTotalCount.value = summary.value.gliders;
}

/**
 * Load sites data for right panel
 */
async function loadSitesData() {
  rightTableData.value = [];
  rightTotalHours.value = 0;

  const sitesSQL = `SELECT V_Site, COUNT(V_ID) AS Nb, SUM(V_Duree) AS Dur FROM Vol WHERE strftime('%Y', V_date) = '${refYear.value}' GROUP BY UPPER(V_Site) ORDER BY COUNT(V_ID) DESC`;
  const result = databaseStore.query(sitesSQL);

  if (result.success && result.data?.[0]) {
    for (const row of result.data[0].values) {
      const siteName = row[0] || 'Unknown';
      const flights = row[1] || 0;
      const hours = row[2] || 0;

      rightTableData.value.push({
        name: siteName,
        flights,
        hours
      });

      rightTotalHours.value += hours;
    }
  }

  rightTotalCount.value = summary.value.sites;
}

/**
 * Format duration from seconds to HHhMMmn
 */
function formatDuration(seconds) {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h${String(minutes).padStart(2, '0')}mn`;
}

/**
 * Format hours as decimal (e.g., 62.50)
 */
function formatHoursDecimal(seconds) {
  if (!seconds) return '0.00';
  const hours = seconds / 3600;
  return hours.toFixed(2);
}

/**
 * Update chart with current data
 */
function updateChart() {
  if (!chartCanvas.value) return;

  const ctx = chartCanvas.value.getContext('2d');

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy();
  }

  const isHoursMode = chartMode.value === 'hours';
  const refData = isHoursMode ? chartData.value.refHours : chartData.value.refFlights;
  const prevData = isHoursMode ? chartData.value.prevHours : chartData.value.prevFlights;

  const refTotal = refData.reduce((a, b) => a + b, 0);
  const prevTotal = prevData.reduce((a, b) => a + b, 0);

  const refLabel = isHoursMode
    ? `${refYear.value} [${refTotal.toFixed(1)}h]`
    : `${refYear.value} [${refTotal}]`;
  const prevLabel = isHoursMode
    ? `${prevYear.value} [${prevTotal.toFixed(1)}h]`
    : `${prevYear.value} [${prevTotal}]`;

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthLabels.value,
      datasets: [
        {
          label: refLabel,
          data: refData,
          backgroundColor: isHoursMode ? 'rgba(217, 83, 79, 0.8)' : 'rgba(79, 196, 79, 0.8)',
          borderWidth: 0,
          barPercentage: 0.8,
          categoryPercentage: 0.7
        },
        {
          label: prevLabel,
          data: prevData,
          backgroundColor: isHoursMode ? 'rgba(79, 213, 217, 0.8)' : 'rgba(196, 79, 196, 0.8)',
          borderWidth: 0,
          barPercentage: 0.8,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: isHoursMode ? $gettext('Flight time comparison') : $gettext('Flight comparison'),
          font: { size: 24 }
        },
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              if (isHoursMode) {
                const hours = Math.floor(context.raw);
                const minutes = Math.round((context.raw - hours) * 60);
                return `${context.dataset.label}: ${hours}h${String(minutes).padStart(2, '0')}`;
              }
              return `${context.dataset.label}: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: isHoursMode ? $gettext('Hours') : $gettext('Flights')
          }
        }
      }
    }
  });
}

/**
 * Handle reference year change
 * Also updates prevYear to n-1 if it exists
 */
async function onRefYearChange() {
  // Auto-update prevYear to n-1 if exists
  const refYearInt = parseInt(refYear.value);
  const prevYearStr = (refYearInt - 1).toString();
  if (yearList.value.includes(prevYearStr)) {
    prevYear.value = prevYearStr;
  } else if (yearList.value.length > 1) {
    // Fallback to next available year
    const currentIdx = yearList.value.indexOf(refYear.value);
    if (currentIdx < yearList.value.length - 1) {
      prevYear.value = yearList.value[currentIdx + 1];
    }
  }
  await loadAllData();
}

/**
 * Handle previous year change
 */
async function onPrevYearChange() {
  await loadMonthlyData();
  updateChart();
}

/**
 * Set chart mode (flights or hours)
 */
function setChartMode(mode) {
  chartMode.value = mode;
  updateChart();
}

/**
 * Set right panel mode (gliders or sites)
 */
async function setRightMode(mode) {
  rightMode.value = mode;
  await loadRightPanelData();
}
</script>

<style scoped>
.annual-card {
  width: 100%;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  overflow: hidden;
}

/* Summary cards row */
.summary-cards {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
}

.summary-card {
  flex: 1;
  padding: 16px;
  position: relative;
  overflow: hidden;
  min-height: 100px;
}

.flights-card {
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
  color: white;
}

.hours-card {
  background: linear-gradient(135deg, #f44336 0%, #c62828 100%);
  color: white;
}

.gliders-card {
  background: linear-gradient(135deg, #FF9800 0%, #EF6C00 100%);
  color: white;
}

.sites-card {
  background: linear-gradient(135deg, #2196F3 0%, #1565C0 100%);
  color: white;
}

.card-corner {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.9rem;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
}

.card-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.3;
  width: 128px;
  height: 128px;
}

.card-title {
  font-size: 0.9rem;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 4px;
}

.card-value {
  font-size: 2.2rem;
  font-weight: bold;
}

.card-content-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.card-year {
  font-size: 1.75rem;
  font-weight: bold;
  opacity: 0.7;
  margin-left: 20px;
}

/* Main content row */
.main-content {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.left-panel {
  flex: 0 0 25%;
  display: flex;
  flex-direction: column;
}

.center-panel {
  flex: 0 0 50%;
  display: flex;
  flex-direction: column;
}

.right-panel {
  flex: 0 0 25%;
  display: flex;
  flex-direction: column;
}

.panel-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.panel-label {
  font-weight: 600;
  white-space: nowrap;
}

.year-select {
  max-width: 120px;
}

.monthly-table {
  flex: 1;
  overflow-y: auto;
}

.monthly-table th,
.monthly-table td {
  font-size: 0.85rem;
  padding: 4px 8px !important;
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  font-weight: 900;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.footer-left {
  color: #333;
}

.footer-right {
  color: #666;
}

/* Chart */
.chart-container {
  flex: 1;
  padding: 16px;
  min-height: 0;
}

.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}

.chart-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.compare-select {
  max-width: 120px;
}

/* Right panel */
.right-header {
  justify-content: space-between;
}

.right-year {
  font-weight: bold;
  font-size: 1.1rem;
}

.right-table-container {
  flex: 1;
  overflow-y: auto;
}

.right-table th,
.right-table td {
  font-size: 0.8rem;
  padding: 4px 6px !important;
}

.total-hours {
  font-size: 0.75rem;
  font-weight: bold;
  color: #666;
}

/* Responsive */
@media (max-width: 1200px) {
  .main-content {
    flex-direction: column;
  }

  .left-panel,
  .center-panel,
  .right-panel {
    flex: none;
    width: 100%;
  }
}
</style>
