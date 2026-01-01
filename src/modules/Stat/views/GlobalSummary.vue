<template>
  <OpenLogbook :show="true" />
  <v-card v-if="databaseStore.hasOpenDatabase" flat class="global-summary-card">
    <!-- Section 1: Header with menu -->
    <div class="header-menu">
      <v-select v-model="selYearBegin" :items="yearListAsc" density="compact" variant="outlined" hide-details
        class="year-select" @update:model-value="onYearChange" />
      <v-select v-model="selYearEnd" :items="yearListDesc" density="compact" variant="outlined" hide-details
        class="year-select" @update:model-value="onYearChange" />
      <v-btn :variant="currentChart === 'yearly' ? 'flat' : 'text'"
        :color="currentChart === 'yearly' ? 'primary' : 'default'" @click="setChart('yearly')">
        {{ $gettext('Yearly chart') }}
      </v-btn>
      <v-btn :variant="currentChart === 'monthly' ? 'flat' : 'text'"
        :color="currentChart === 'monthly' ? 'primary' : 'default'" @click="setChart('monthly')">
        {{ $gettext('Monthly chart') }}
      </v-btn>
      <v-btn :variant="currentChart === 'gliders' ? 'flat' : 'text'"
        :color="currentChart === 'gliders' ? 'primary' : 'default'" @click="setChart('gliders')">
        {{ $gettext('Gliders chart') }}
      </v-btn>
      <v-btn :variant="currentChart === 'sites' ? 'flat' : 'text'"
        :color="currentChart === 'sites' ? 'primary' : 'default'" @click="setChart('sites')">
        {{ $gettext('Sites chart') }}
      </v-btn>
    </div>

    <!-- Section 2: Chart area -->
    <div v-if="currentChart" class="chart-section">
      <YearlyChart v-if="currentChart === 'yearly'" :year-begin="selYearBegin" :year-end="selYearEnd" />
      <MonthlyChart v-else-if="currentChart === 'monthly'" :year-begin="selYearBegin" :year-end="selYearEnd" />
      <div v-else-if="currentChart === 'gliders'" class="coming-soon">
        <v-icon size="64" color="grey">mdi-parachute</v-icon>
        <p>Gliders chart - Coming soon</p>
      </div>
      <div v-else-if="currentChart === 'sites'" class="coming-soon">
        <v-icon size="64" color="grey">mdi-map-marker</v-icon>
        <p>Sites chart - Coming soon</p>
      </div>
    </div>

    <!-- Section 3: Info cards footer -->
    <div v-if="currentChart" class="info-cards-section">
      <!-- Card 1: Period -->
      <v-card class="info-card period-card" elevation="3">
        <div class="info-card-content">
          <v-icon class="info-icon" size="40">mdi-calendar-range</v-icon>
          <div class="info-texts">
            <div class="info-line-1">{{ selYearBegin }} - {{ selYearEnd }}</div>
            <div class="info-line-2">{{ periodInfo.years }} {{ $gettext('YEARS') }} {{ periodInfo.months }} {{
              $gettext('MONTHES') }}</div>
          </div>
        </div>
      </v-card>
      <!-- Card 2: Hours & Flights -->
      <v-card class="info-card totals-card" elevation="3">
        <div class="info-card-content">
          <v-icon class="info-icon" size="40">mdi-airplane</v-icon>
          <div class="info-texts">
            <div class="info-line-1">{{ periodInfo.hoursFormatted }}</div>
            <div class="info-line-2">{{ periodInfo.flights }} {{ $gettext('Flights') }}</div>
          </div>
        </div>
      </v-card>
      <!-- Card 3: Averages -->
      <v-card class="info-card averages-card" elevation="3">
        <div class="info-card-content">
          <v-icon class="info-icon" size="40">mdi-chart-line</v-icon>
          <div class="info-texts">
            <div class="info-line-1">{{ periodInfo.avgHoursFormatted }} / {{ $gettext('year') }}</div>
            <div class="info-line-2">{{ periodInfo.avgFlights }} {{ $gettext('Flights') }} / {{ $gettext('year') }}
            </div>
          </div>
        </div>
      </v-card>
      <!-- Card 4: Gliders & Sites -->
      <v-card class="info-card equipment-card" elevation="3">
        <div class="info-card-content">
          <v-icon class="info-icon" size="40">mdi-database</v-icon>
          <div class="info-texts">
            <div class="info-line-1">{{ periodInfo.gliders }} {{ $gettext('Gliders') }}</div>
            <div class="info-line-2">{{ periodInfo.sites }} {{ $gettext('Sites') }}</div>
          </div>
        </div>
      </v-card>
    </div>

    <!-- Empty state when no chart selected -->
    <div v-if="!currentChart" class="empty-state">
      <v-icon size="80" color="grey-lighten-1">mdi-chart-box-outline</v-icon>
      <p class="empty-text">{{ $gettext('Select a chart type to display statistics') }}</p>
    </div>
  </v-card>

  <!-- No database message -->
  <v-card v-else flat class="global-summary-card d-flex align-center justify-center">
    <v-card-text class="text-center">
      <v-icon size="64" color="grey">mdi-database-off</v-icon>
      <h3 class="mt-4">{{ $gettext('No logbook opened') }}</h3>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useGettext } from "vue3-gettext";
import OpenLogbook from '@/components/OpenLogbook.vue';
import YearlyChart from '@/components/charts/YearlyChart.vue';
import MonthlyChart from '@/components/charts/MonthlyChart.vue';
import { useDatabaseStore } from '@/stores/database';

const databaseStore = useDatabaseStore();
const { $gettext } = useGettext();

// State
const selYearBegin = ref(null);
const selYearEnd = ref(null);
const yearListAsc = ref([]);
const yearListDesc = ref([]);
const currentChart = ref(null);

// Period info computed from database
const periodInfo = ref({
  years: 0,
  months: 0,
  flights: 0,
  hoursSeconds: 0,
  hoursFormatted: '0h00',
  avgHoursFormatted: '0h00',
  avgFlights: 0,
  gliders: 0,
  sites: 0
});

onMounted(async () => {
  if (databaseStore.hasOpenDatabase) {
    await loadYears();
    await loadPeriodInfo();
  }
});

// Watch for database changes
watch(() => databaseStore.hasOpenDatabase, async (hasDb) => {
  if (hasDb) {
    await loadYears();
    await loadPeriodInfo();
  }
});

/**
 * Load all available years from database
 */
async function loadYears() {
  // Ascending order for begin year
  const reqASC = `SELECT strftime('%Y', V_date) AS V_Year FROM Vol GROUP BY strftime('%Y', V_date) ORDER BY strftime('%Y', V_date) ASC`;
  const resultASC = databaseStore.query(reqASC);
  if (resultASC.success && resultASC.data && resultASC.data[0]) {
    yearListAsc.value = resultASC.data[0].values.map(row => row[0]);
    if (yearListAsc.value.length > 0) {
      selYearBegin.value = yearListAsc.value[0]; // Oldest year
    }
  }

  // Descending order for end year
  const reqDESC = `SELECT strftime('%Y', V_date) AS V_Year FROM Vol GROUP BY strftime('%Y', V_date) ORDER BY strftime('%Y', V_date) DESC`;
  const resultDESC = databaseStore.query(reqDESC);
  if (resultDESC.success && resultDESC.data && resultDESC.data[0]) {
    yearListDesc.value = resultDESC.data[0].values.map(row => row[0]);
    if (yearListDesc.value.length > 0) {
      selYearEnd.value = yearListDesc.value[0]; // Most recent year
    }
  }
}

/**
 * Load period information based on selected years
 */
async function loadPeriodInfo() {
  if (!selYearBegin.value || !selYearEnd.value) return;

  const startYear = selYearBegin.value;
  const endYear = selYearEnd.value;

  // Calculate years and months
  const yearsCount = parseInt(endYear) - parseInt(startYear);
  const monthsCount = (yearsCount * 12) + 1; // +1 for inclusive

  // Get total flights
  const flightsSQL = `SELECT COUNT(V_ID) AS Nb FROM Vol WHERE strftime('%Y-%m', V_date) >= '${startYear}-01' AND strftime('%Y-%m', V_date) <= '${endYear}-12'`;
  const flightsResult = databaseStore.query(flightsSQL);
  const totalFlights = flightsResult.success && flightsResult.data?.[0]?.values?.[0]?.[0] || 0;

  // Get total hours
  const hoursSQL = `SELECT COALESCE(SUM(V_Duree), 0) AS Dur FROM Vol WHERE strftime('%Y-%m', V_date) >= '${startYear}-01' AND strftime('%Y-%m', V_date) <= '${endYear}-12'`;
  const hoursResult = databaseStore.query(hoursSQL);
  const totalSeconds = hoursResult.success && hoursResult.data?.[0]?.values?.[0]?.[0] || 0;

  // Get distinct gliders
  const glidersSQL = `SELECT COUNT(DISTINCT UPPER(V_Engin)) AS Total FROM Vol WHERE strftime('%Y-%m', V_date) >= '${startYear}-01' AND strftime('%Y-%m', V_date) <= '${endYear}-12' AND V_Engin IS NOT NULL AND V_Engin != ''`;
  const glidersResult = databaseStore.query(glidersSQL);
  const totalGliders = glidersResult.success && glidersResult.data?.[0]?.values?.[0]?.[0] || 0;

  // Get distinct sites
  const sitesSQL = `SELECT COUNT(DISTINCT UPPER(V_Site)) AS Total FROM Vol WHERE strftime('%Y-%m', V_date) >= '${startYear}-01' AND strftime('%Y-%m', V_date) <= '${endYear}-12'`;
  const sitesResult = databaseStore.query(sitesSQL);
  const totalSites = sitesResult.success && sitesResult.data?.[0]?.values?.[0]?.[0] || 0;

  // Calculate averages
  const periodYears = yearsCount > 0 ? yearsCount : 1;
  const avgSeconds = totalSeconds / periodYears;
  const avgFlights = Math.round(totalFlights / periodYears);

  periodInfo.value = {
    years: yearsCount,
    months: monthsCount % 12,
    flights: totalFlights,
    hoursSeconds: totalSeconds,
    hoursFormatted: formatDuration(totalSeconds),
    avgHoursFormatted: formatDuration(avgSeconds),
    avgFlights: avgFlights,
    gliders: totalGliders,
    sites: totalSites
  };
}

/**
 * Format duration from seconds to HHhMM format
 */
function formatDuration(seconds) {
  if (!seconds) return '0h00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

/**
 * Handle year selection change
 */
async function onYearChange() {
  await loadPeriodInfo();
}

/**
 * Set the current chart type
 */
function setChart(chart) {
  currentChart.value = chart;
}
</script>

<style scoped>
.global-summary-card {
  width: 100%;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  overflow: hidden;
}

/* Header menu */
.header-menu {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 24px;
  background: #f5f5f5;
  border-radius: 8px;
  flex-shrink: 0;
}

.year-select {
  min-width: 100px;
  max-width: 120px;
}

/* Chart section */
.chart-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.coming-soon {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

/* Info cards section */
.info-cards-section {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
}

.info-card {
  flex: 1;
  padding: 16px;
  color: white;
}

.period-card {
  background: linear-gradient(135deg, #2196F3 0%, #1565C0 100%);
}

.totals-card {
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
}

.averages-card {
  background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%);
}

.equipment-card {
  background: linear-gradient(135deg, #FF9800 0%, #EF6C00 100%);
}

.info-card-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.info-icon {
  opacity: 0.7;
}

.info-texts {
  display: flex;
  flex-direction: column;
}

.info-line-1 {
  font-size: 1.4rem;
  font-weight: bold;
}

.info-line-2 {
  font-size: 1rem;
  opacity: 0.9;
}

/* Empty state */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.empty-text {
  color: #999;
  font-size: 1.1rem;
}

/* Responsive */
@media (max-width: 1000px) {
  .header-menu {
    flex-wrap: wrap;
  }

  .info-cards-section {
    flex-wrap: wrap;
  }

  .info-card {
    flex: 1 1 45%;
    min-width: 200px;
  }
}
</style>