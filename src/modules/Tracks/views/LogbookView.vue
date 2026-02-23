<template>
  <v-layout class="logbook-layout">
    <v-snackbar v-model="snackbar" :timeout="5000" color="success" location="top">
      {{ snackbarMessage }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>

    <OpenLogbook :show="true" />

    <template v-if="databaseStore.hasOpenDatabase">
      <!-- Left Drawer: Flight List -->
      <v-navigation-drawer v-model="drawer" :permanent="$vuetify.display.mdAndUp" width="400"
        class="flight-list-drawer">
        <!-- Fixed Header: Search & Filters -->
        <div class="pa-2 drawer-header">
          <!-- Search & Filter Block -->
          <v-card variant="outlined" class="search-trigger mb-2 d-flex align-center" height="40"
            @click="showSearchDialog = true" style="border-color: rgba(0,0,0,0.38); cursor: pointer;">
            <v-icon color="grey" class="ml-2">mdi-magnify</v-icon>
            <span class="ml-2 text-body-2 text-grey-darken-1">{{ $gettext('Search...') }}</span>
            <v-spacer></v-spacer>
            <v-btn size="small" variant="text" icon="mdi-tune" @click.stop="showSearchDialog = true"
              :title="$gettext('Advanced Search')"></v-btn>
          </v-card>

          <v-select v-model="selectedTagFilter" :items="tagOptions" :label="$gettext('Filter by tag')" density="compact"
            variant="outlined" hide-details class="tag-filter" item-title="title" item-value="value">
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :title="item.title">
                <template v-slot:prepend v-if="item.value">
                  <v-icon :color="item.raw.color" class="mr-2">mdi-circle</v-icon>
                </template>
              </v-list-item>
            </template>
            <template v-slot:selection="{ item }">
              <div class="d-flex align-center">
                <v-icon v-if="item.value && item.raw.color" :color="item.raw.color" size="small"
                  class="mr-2">mdi-circle</v-icon>
                {{ item.title }}
              </div>
            </template>
          </v-select>

          <div v-if="isFiltered" class="d-flex align-center justify-space-between mt-2">
            <v-chip color="info" size="small">
              {{ filteredFlights.length }} {{ $gettext('flights') }}
            </v-chip>
            <v-btn color="warning" variant="text" size="small" prepend-icon="mdi-filter-off" @click="unfilterFlights">
              {{ $gettext('Unfilter') }}
            </v-btn>
          </div>
        </div>

        <!-- Selection Header -->
        <div v-if="selectedItems.length > 0" class="d-flex align-center justify-space-between px-4 py-2 bg-primary">
          <span class="text-body-2 font-weight-bold">
            {{ selectedItems.length }} {{ $gettext('flights selected') }}
          </span>
          <div>
            <v-btn v-if="selectedItems.length > 1" size="small" variant="text" color="white"
              prepend-icon="mdi-call-merge" @click="mergeFlights" class="mr-2">
              {{ $gettext('Merge') }}
            </v-btn>
            <v-btn size="small" variant="text" icon="mdi-close" color="white" @click="clearSelection"></v-btn>
          </div>
        </div>

        <v-divider></v-divider>

        <!-- Virtual Scroll Flight List: fills remaining drawer height -->
        <v-virtual-scroll :items="filteredFlights" class="flight-virtual-scroll" item-height="68">
          <template v-slot:default="{ item }">
            <v-list-item :value="item.V_ID" :active="activeFlightId === item.V_ID" @click="onFlightSelect(item)"
              class="flight-item px-1">
              <!-- Indicators: photo, tag color -->
              <template v-slot:prepend>
                <div class="d-flex align-center mr-2">
                  <v-checkbox-btn v-model="selectedItems" :value="item.V_ID" @click.stop color="primary"
                    class="mr-1"></v-checkbox-btn>
                  <div class="flight-indicators">
                    <!-- Camera icon: click to VIEW photo (only if photo exists) -->
                    <v-icon v-if="item.Photo === 'Yes'" size="x-small" color="primary" style="cursor:pointer"
                      @click.stop="openPhotoViewer(item)">mdi-camera</v-icon>
                    <v-icon v-if="item.V_Tag && tagsMap[item.V_Tag]" :color="tagsMap[item.V_Tag].color"
                      size="x-small">mdi-circle</v-icon>
                    <v-icon v-if="!item.Photo && !(item.V_Tag && tagsMap[item.V_Tag])" size="x-small"
                      color="transparent">mdi-circle</v-icon>
                  </div>
                </div>
              </template>

              <!-- Line 1: Date + Duration (bold, compact) -->
              <v-list-item-title class="flight-primary">
                <span class="flight-date">{{ item.Day }}</span>
                <span class="flight-sep mx-1 text-grey">·</span>
                <span class="flight-duration">{{ item.Duree }}</span>
                <!-- Comment icon: click to OPEN comment dialog -->
                <v-icon v-if="item.V_Commentaire" color="amber-darken-2" size="x-small" class="ml-1"
                  style="cursor:pointer" @click.stop="commentFlight(item)">mdi-comment-text</v-icon>
              </v-list-item-title>

              <!-- Line 2: Site + Glider -->
              <v-list-item-subtitle class="flight-secondary">
                <span>{{ item.V_Site }}</span>
                <span class="mx-1 text-grey">|</span>
                <span>{{ item.V_Engin }}</span>
              </v-list-item-subtitle>

              <!-- Context menu -->
              <template v-slot:append>
                <v-menu location="bottom end">
                  <template v-slot:activator="{ props }">
                    <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" @click.stop></v-btn>
                  </template>
                  <v-list density="compact" min-width="200">
                    <v-list-item prepend-icon="mdi-chart-line" :title="$gettext('Analyze')"
                      @click="analyzeFlight(item)"></v-list-item>
                    <v-list-item prepend-icon="mdi-trophy-outline" :title="$gettext('Scoring')"
                      @click="scoreFlight(item)"></v-list-item>
                    <v-divider></v-divider>
                    <v-list-item prepend-icon="mdi-tag-outline" :title="$gettext('Tag')"
                      @click="tagFlight(item)"></v-list-item>
                    <v-list-item prepend-icon="mdi-camera" :title="$gettext('Photo')"
                      @click="openPhotoDialog(item)"></v-list-item>
                    <v-list-item prepend-icon="mdi-comment-text-outline" :title="$gettext('Comment')"
                      @click="commentFlight(item)"></v-list-item>
                    <v-divider></v-divider>
                    <v-list-item prepend-icon="mdi-paragliding" :title="$gettext('Change glider')"
                      @click="changeGlider(item)"></v-list-item>
                    <v-list-item prepend-icon="mdi-map-marker-outline" :title="$gettext('Change site')"
                      @click="changeSite(item)"></v-list-item>
                    <v-list-item prepend-icon="mdi-export" :title="$gettext('Export IGC')"
                      @click="exportIgc(item)"></v-list-item>
                    <v-list-item prepend-icon="mdi-routes" :title="$gettext('Export GPX')"
                      @click="exportGpx(item)"></v-list-item>
                    <v-divider></v-divider>
                    <v-list-item prepend-icon="mdi-delete" :title="$gettext('Delete')" base-color="error"
                      @click="confirmDelete(item)"></v-list-item>
                  </v-list>
                </v-menu>
              </template>
            </v-list-item>
            <v-divider></v-divider>
          </template>
        </v-virtual-scroll>
      </v-navigation-drawer>

      <!-- Main Content: Map -->
      <v-main class="map-main">
        <!-- Mobile Menu Button -->
        <v-btn v-if="$vuetify.display.smAndDown" icon="mdi-menu" position="absolute" class="mobile-menu-btn"
          style="top: 10px; left: 10px; z-index: 1000" elevation="2" @click="drawer = !drawer">
        </v-btn>

        <!-- Map Container -->
        <!-- 'hide-map-controls' hides Leaflet zoom+layers when drawer is open on mobile
             (controls reappear once the user selects a flight and the drawer closes) -->
        <div class="map-wrapper" :class="{ 'hide-map-controls': mobile && drawer }">
          <LittleMapView v-if="decodedTrack && decodedTrack.GeoJSON" ref="littleMapRef" :geoJson="decodedTrack.GeoJSON"
            :scoreJson="scoreJson" :paddingLeft="$vuetify.display.mdAndUp ? 400 : 0" @open-full-map="onOpenFullMap"
            @open-cesium="onOpenCesium" @open-analyze="onOpenAnalyze" />
          <LittleMapView v-else-if="noIgcFlight" ref="littleMapRef" :hideOverlay="true" />
          <div v-else class="no-track-placeholder d-flex align-center justify-center flex-column bg-grey-lighten-4">
            <v-icon size="64" color="grey">mdi-map-marker-off</v-icon>
            <p class="text-h6 text-grey mt-4">{{ $gettext('Select a flight to view track') }}</p>
            <p class="text-caption text-grey">Base de données : {{ databaseStore.dbName }}</p>
          </div>
        </div>
      </v-main>
    </template>
    <div v-else class="d-flex align-center justify-center" style="flex:1">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <!-- Dialogs -->
    <v-dialog v-model="showPhotoViewer" max-width="800">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ photoTitle }}</span>
          <v-btn icon="mdi-close" variant="text" @click="showPhotoViewer = false"></v-btn>
        </v-card-title>
        <v-card-text class="d-flex justify-center bg-grey-lighten-4 pa-4">
          <img v-if="photoUrl" :src="photoUrl" style="max-width: 100%; max-height: 80vh; object-fit: contain;" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showFullMap" fullscreen persistent transition="dialog-bottom-transition">
      <FullMapView v-if="dataFlight" :flightData="dataFlight" @close="onFullMapClose" />
    </v-dialog>

    <CesiumReplayView v-model="showCesiumView" :flightData="dataFlight" @close="showCesiumView = false" />

    <TraceInfoDialog v-model="showTraceInfoDialog" :decodedData="dataFlight?.decodedIgc"
      :anaResult="dataFlight?.anaTrack" />

    <NoTrackDialog v-model="showNoTrackDialog" :mode="noTrackDialogMode" :flightData="noTrackFlightData"
      @saved="onNoTrackFlightSaved" />

    <SearchFlightsDialog v-model="showSearchDialog" @search="onAdvancedSearch" />

    <!-- Comment Dialog -->
    <CommentDialog v-model="showCommentDialog" :currentComment="commentDialogData.comment"
      :flightDate="commentDialogData.day" :flightSite="commentDialogData.site" @save="onCommentDialogSave" />

    <!-- Change Glider Dialog -->
    <GliderDialog v-model="showGliderDialog" :gliderList="gliderList" :currentGlider="gliderDialogData.currentGlider"
      @save="onGliderDialogSave" />

    <!-- Change Site Dialog -->
    <ChangeSiteDialog v-model="showChangeSiteDialog" :siteList="siteList"
      :currentSite="changeSiteDialogData.currentSite" @save="onChangeSiteDialogSave" />

    <!-- ScoreDialog -->
    <ScoreDialog v-if="showScoreDialog" v-model="showScoreDialog" :fixes="dataFlight?.decodedIgc?.fixes || []"
      :date="dataFlight?.decodedIgc?.info?.date || ''" :flightDate="scoreDialogFlightDay"
      :flightSite="scoreDialogFlightSite" :scoringFn="scoreFlightFn" @score-result="onScoreResult" />

    <!-- LogbookPhoto Dialog -->
    <LogbookPhoto v-model="showPhotoDialog" :hasPhoto="photoDialogData.hasPhoto"
      :currentPhotoUrl="photoDialogData.currentPhotoUrl" @save="onPhotoDialogSave" @delete="onPhotoDialogDelete" />

    <!-- Tag Dialog -->
    <TagDialog v-model="showTagDialog" :tags="Object.values(tagsMap)" :currentTag="tagDialogData.currentTag"
      @save="onTagDialogSave" />

  </v-layout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useGettext } from "vue3-gettext";
import { useDisplay } from 'vuetify';
import OpenLogbook from '@/components/OpenLogbook.vue';
import LittleMapView from '@/components/LittleMapView.vue';
import FullMapView from '@/components/FullMapView.vue';
import CesiumReplayView from '@/components/CesiumReplayView.vue';
import TraceInfoDialog from '@/components/TraceInfoDialog.vue';
import NoTrackDialog from '@/components/NoTrackDialog.vue';
import SearchFlightsDialog from '@/components/SearchFlightsDialog.vue';
import CommentDialog from '@/components/CommentDialog.vue';
import GliderDialog from '@/components/GliderDialog.vue';
import ChangeSiteDialog from '@/components/ChangeSiteDialog.vue';
import ScoreDialog from '@/components/ScoreDialog.vue';
import TagDialog from '@/components/TagDialog.vue';
import LogbookPhoto from '@/components/LogbookPhoto.vue';
import { igcScoring } from '@/js/igc/igc-scoring';
import { igcToGpx } from '@/js/igc/igc-to-gpx.js';
import { useDatabaseStore } from '@/stores/database';
import { igcDecoding } from '@/js/igc/igc-decoder.js';
import { IgcAnalyze } from '@/js/igc/igc-analyzer.js';
import { mergeIgcTracks } from '@/js/igc/igc-merging.js';

// Déclarer les événements que ce composant peut émettre
const emit = defineEmits(['db-updated']);

const databaseStore = useDatabaseStore();
const { $gettext } = useGettext();
const { mobile } = useDisplay();

const drawer = ref(true); // Left drawer (Flight List)

const flights = ref([]);
const selectedItems = ref([]); // Now used for multiple checkboxes
const activeFlightId = ref(null); // Used for the currently displayed flight track
const searchQuery = ref('');

// Warn user if leaving with unsaved changes
function handleBeforeUnload(e) {
  if (databaseStore.isDirty) {
    e.preventDefault();
    e.returnValue = ''; // Standard for showing confirmation dialog
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  if (window.innerWidth < 960) {
    drawer.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

// Removed pagination refs (page, itemsPerPage) as we use virtual scroll
const itemsPerPage = ref(10000); // Hack to keep existing filtering logic happy if needed, but virtual scroll handles it

const filteredCount = ref(0);
const decodedTrack = ref(null)
const analysisTrack = ref(null);
const dataFlight = ref(null);
const scoreJson = ref(null);
const noIgcFlight = ref(null); // { lat, lon, site, alt } for flights without GPS track
const littleMapRef = ref(null);
const snackbar = ref(false);
const snackbarMessage = ref('');
const showPhotoViewer = ref(false);
const showFullMap = ref(false);
const photoUrl = ref(null);
const photoTitle = ref('');
const tagsMap = ref({});
const selectedTagFilter = ref(null);
const showCesiumView = ref(false);
const showTraceInfoDialog = ref(false);
const showNoTrackDialog = ref(false);
const noTrackDialogMode = ref('edit'); // 'edit' or 'duplicate'
const noTrackFlightData = ref(null);
const noTrackFlightDetails = ref(null);
const showSearchDialog = ref(false);
const isFiltered = ref(false);

// New dialog states
const showCommentDialog = ref(false);
const commentDialogData = ref({ comment: '', day: '', site: '', flightId: null });

const showGliderDialog = ref(false);
const gliderDialogData = ref({ currentGlider: '', flightId: null });
const gliderList = ref([]);

const showChangeSiteDialog = ref(false);
const changeSiteDialogData = ref({ currentSite: '', flightId: null });
const siteList = ref([]);

const showScoreDialog = ref(false);
const scoreDialogFlightDay = ref('');
const scoreDialogFlightSite = ref('');

const showTagDialog = ref(false);
const tagDialogData = ref({ currentTag: null, flightId: null });

const showPhotoDialog = ref(false);
const photoDialogData = ref({ hasPhoto: false, currentPhotoUrl: null, flightId: null });

const tagOptions = computed(() => {
  const opts = Object.values(tagsMap.value).map(t => ({
    title: t.label,
    value: t.id,
    color: t.color
  }));
  return [{ title: $gettext('All flights'), value: null }, ...opts];
});

// Filter flights based on Tag AND simple Search Query
const processedFlights = computed(() => {
  let result = flights.value;

  // Tag Filter
  if (selectedTagFilter.value) {
    result = result.filter(f => f.V_Tag === selectedTagFilter.value);
  }

  // Simple Search Text Filter (checks site, comment, glider)
  if (searchQuery.value && searchQuery.value.trim() !== '') {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(f =>
      (f.V_Site && f.V_Site.toLowerCase().includes(q)) ||
      (f.V_Engin && f.V_Engin.toLowerCase().includes(q)) ||
      (f.V_Commentaire && f.V_Commentaire.toLowerCase().includes(q))
    );
  }

  return result;
});

const filteredFlights = computed(() => {
  return processedFlights.value;
});

const filteredTotalTime = computed(() => { // Keep this for stats
  // ... existing logic ...
  const totalSeconds = processedFlights.value.reduce((sum, flight) => {
    return sum + (parseInt(flight.V_Duree) || 0);
  }, 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h${minutes.toString().padStart(2, '0')}mn`;
});


function loadTags() {
  const res = databaseStore.query("SELECT Tag_ID, Tag_Label, Tag_Color FROM Tag");
  if (res.success && res.data && res.data[0]) {
    const map = {};
    res.data[0].values.forEach(r => {
      map[r[0]] = { id: r[0], label: r[1], color: r[2] };
    });
    tagsMap.value = map;
  }
}

function loadGliderList() {
  const res = databaseStore.query("SELECT DISTINCT V_Engin FROM Vol WHERE V_Engin IS NOT NULL AND V_Engin != '' ORDER BY V_Engin");
  if (res.success && res.data && res.data[0]) {
    gliderList.value = res.data[0].values.map(r => r[0]);
  }
}

function loadSiteList() {
  const res = databaseStore.query("SELECT S_Nom, S_Localite FROM Site ORDER BY S_Nom");
  if (res.success && res.data && res.data[0]) {
    siteList.value = res.data[0].values.map(r => ({ S_Nom: r[0], S_Localite: r[1] }));
  }
}

function loadFlights(keepSelection = false) {
  if (!databaseStore.hasOpenDatabase) return;
  loadTags();
  loadGliderList();
  loadSiteList();

  let reqSQL = "SELECT V_ID, strftime('%d-%m-%Y',V_date) AS Day, strftime('%H:%M',V_date) AS Hour, replace(V_sDuree,'mn','') AS Duree, V_Site, V_Engin, V_Commentaire, V_Duree, V_Tag, ";
  reqSQL += "CASE WHEN (V_Photos IS NOT NULL AND V_Photos !='') THEN 'Yes' END Photo ";
  reqSQL += "FROM Vol ORDER BY V_Date DESC";

  const result = databaseStore.query(reqSQL);

  if (result.success && result.data && result.data[0]) {
    const columns = result.data[0].columns;
    const values = result.data[0].values;
    flights.value = values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    if (keepSelection && activeFlightId.value) {
      const exists = flights.value.some(f => f.V_ID === activeFlightId.value);
      if (exists) {
        readIgcFromDb(activeFlightId.value);
      } else {
        activeFlightId.value = null;
        // Auto-select first flight if previous selection lost
        if (flights.value.length > 0) {
          onFlightSelect(flights.value[0]);
        }
      }
    } else if (!keepSelection) {
      // Auto-select first flight on initial load
      if (flights.value.length > 0 && !activeFlightId.value) {
        onFlightSelect(flights.value[0]);
      }
    }

  } else {
    console.error('Erreur lors du chargement des vols:', result.message);
  }
}

/**
 * Handle advanced search from SearchFlightsDialog
 */
function onAdvancedSearch(whereClause) {
  if (!databaseStore.hasOpenDatabase) return;

  let reqSQL = "SELECT V_ID, strftime('%d-%m-%Y',V_date) AS Day, strftime('%H:%M',V_date) AS Hour, replace(V_sDuree,'mn','') AS Duree, V_Site, V_Engin, V_Commentaire, V_Duree, V_Tag, ";
  reqSQL += "CASE WHEN (V_Photos IS NOT NULL AND V_Photos !='') THEN 'Yes' END Photo ";
  reqSQL += "FROM Vol WHERE " + whereClause + " ORDER BY V_Date DESC";

  const result = databaseStore.query(reqSQL);

  if (result.success && result.data && result.data[0] && result.data[0].values.length > 0) {
    const columns = result.data[0].columns;
    const values = result.data[0].values;

    flights.value = values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    isFiltered.value = true;
    snackbarMessage.value = `${flights.value.length} ${$gettext('flights found')}`;
    snackbar.value = true;
  } else {
    snackbarMessage.value = $gettext('No flights match the search criteria');
    snackbar.value = true;
  }
}

function unfilterFlights() {
  isFiltered.value = false;
  searchQuery.value = '';
  selectedTagFilter.value = null;
  loadFlights();
}

// Called when clicking a flight in the list
function onFlightSelect(item) {
  activeFlightId.value = item.V_ID;
  readIgcFromDb(item.V_ID);

  // On mobile, close List drawer to show the map
  if (mobile.value) {
    drawer.value = false;
  }
}

function clearSelection() {
  selectedItems.value = [];
}

async function mergeFlights() {
  if (selectedItems.value.length < 2) {
    snackbarMessage.value = $gettext('Select at least 2 flights to merge');
    snackbar.value = true;
    return;
  }

  // 1. Fetch data for all selected flights
  const ids = selectedItems.value.join(',');
  const reqSQL = `SELECT V_ID, V_Date, strftime('%Y-%m-%d', V_Date) as DayStr, V_Site, V_Engin, V_Duree, V_IGC, V_Photos FROM Vol WHERE V_ID IN (${ids}) ORDER BY V_Date ASC`;
  const result = databaseStore.query(reqSQL);

  if (!result.success || !result.data || !result.data[0]) {
    snackbarMessage.value = $gettext('Error reading flights from database');
    snackbar.value = true;
    return;
  }

  const columns = result.data[0].columns;
  const values = result.data[0].values;
  const flightsToMerge = values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => obj[col] = row[idx]);
    return obj;
  });

  if (flightsToMerge.length !== selectedItems.value.length) {
    snackbarMessage.value = $gettext('Could not retrieve all selected flights');
    snackbar.value = true;
    return;
  }

  // 2. Validate same day
  const referenceDay = flightsToMerge[0].DayStr;
  for (let i = 1; i < flightsToMerge.length; i++) {
    if (flightsToMerge[i].DayStr !== referenceDay) {
      snackbarMessage.value = $gettext('Flights must be on the same day to merge');
      snackbar.value = true;
      return;
    }
  }

  // 3. Validate IGC presence
  const igcTracks = [];
  for (let i = 0; i < flightsToMerge.length; i++) {
    const igc = flightsToMerge[i].V_IGC;
    if (!igc || igc.trim() === '') {
      snackbarMessage.value = $gettext('All selected flights must have a valid IGC track');
      snackbar.value = true;
      return;
    }
    igcTracks.push(igc);
  }

  // 4. Calculate total time
  let totalDuree = 0;
  for (let i = 0; i < flightsToMerge.length; i++) {
    const duree = parseInt(flightsToMerge[i].V_Duree) || 0;
    totalDuree += duree;
  }

  const h = Math.floor(totalDuree / 3600);
  const mn = Math.floor((totalDuree - (h * 3600)) / 60);
  const formattedDuree = `${h}h${mn.toString().padStart(2, '0')}mn`;
  const mergeComment = `${flightsToMerge.length} ${$gettext('merged flights')}`;

  // 5. Merge IGC tracks
  const mergedIgc = mergeIgcTracks(igcTracks);

  // 6. DB Updates (using the first flight as the base `idRest`)
  const idRest = flightsToMerge[0].V_ID;
  const photoBase = flightsToMerge[0].V_Photos || null;
  const idsToDelete = flightsToMerge.map(f => f.V_ID).filter(id => id !== idRest);

  try {
    // Delete the other flights
    if (idsToDelete.length > 0) {
      const delReq = `DELETE FROM Vol WHERE V_ID IN (${idsToDelete.join(',')})`;
      const delResult = databaseStore.update(delReq);
      if (!delResult.success) throw new Error('Failed to delete redundant flights');
    }

    // Update the base flight
    // Note: To avoid quoting issues with IGC multiline strings, parameterize if possible.
    // If we use string concatenation, we must double-quote single quotes (sqlite escape).
    const safeIgc = mergedIgc.replace(/'/g, "''");
    const safeComment = mergeComment.replace(/'/g, "''");

    let updReq = `UPDATE Vol SET V_Duree = '${totalDuree}', V_sDuree = '${formattedDuree}', V_Commentaire = '${safeComment}', V_IGC = '${safeIgc}'`;
    if (photoBase) {
      const safePhoto = photoBase.replace(/'/g, "''");
      updReq += `, V_Photos = '${safePhoto}'`;
    }
    updReq += ` WHERE V_ID = ${idRest}`;

    const updResult = databaseStore.update(updReq);
    if (!updResult.success) throw new Error('Failed to update the merged flight');

    // Success
    snackbarMessage.value = $gettext('Flights merged successfully');
    snackbar.value = true;

    // Clear selection and reload
    selectedItems.value = [];
    activeFlightId.value = idRest;
    loadFlights(true);
    emit('db-updated');

  } catch (error) {
    console.error('Merge Error:', error);
    snackbarMessage.value = $gettext('An error occurred while merging flights');
    snackbar.value = true;
  }
}


// --- Action Menu Handlers ---
function analyzeFlight(item) {
  // Need to load flight data first if not loaded
  if (!dataFlight.value || dataFlight.value.dbId !== item.V_ID) {
    readIgcFromDb(item.V_ID).then(() => {
      onOpenAnalyze();
    });
  } else {
    onOpenAnalyze();
  }
}

function scoreFlight(item) {
  scoreDialogFlightDay.value = item.Day;
  scoreDialogFlightSite.value = item.V_Site;
  if (!dataFlight.value || dataFlight.value.dbId !== item.V_ID) {
    selectedItems.value = [item.V_ID];
    readIgcFromDb(item.V_ID).then(() => {
      showScoreDialog.value = true;
    });
  } else {
    showScoreDialog.value = true;
  }
}

function scoreFlightFn(args) {
  return igcScoring(args);
}

function onScoreResult({ league, result }) {
  scoreJson.value = result;
}

function openFullMap(item) {
  if (!dataFlight.value || dataFlight.value.dbId !== item.V_ID) {
    readIgcFromDb(item.V_ID).then(() => {
      onOpenFullMap();
    });
  } else {
    onOpenFullMap();
  }
}

function open3DView(item) {
  if (!dataFlight.value || dataFlight.value.dbId !== item.V_ID) {
    readIgcFromDb(item.V_ID).then(() => {
      onOpenCesium();
    });
  } else {
    onOpenCesium();
  }
}

function tagFlight(item) {
  selectedItems.value = [item.V_ID];
  tagDialogData.value = { currentTag: item.V_Tag, flightId: item.V_ID };
  showTagDialog.value = true;
}

function onTagDialogSave(tag) {
  const flightId = tagDialogData.value.flightId;
  onTagUpdate({ id: flightId, tag });
}

// Opens LogbookPhoto dialog (from context menu "Photo" option) - add/manage/remove
async function openPhotoDialog(item) {
  selectedItems.value = [item.V_ID];
  let currentPhotoUrl = null;
  if (item.Photo === 'Yes') {
    const reqSQL = `SELECT V_Photos FROM Vol WHERE V_ID = ${item.V_ID}`;
    const result = databaseStore.query(reqSQL);
    if (result.success && result.data && result.data[0]) {
      const photoData = result.data[0].values[0][0];
      if (photoData) currentPhotoUrl = 'data:image/jpeg;base64,' + photoData;
    }
  }
  photoDialogData.value = { hasPhoto: item.Photo === 'Yes', currentPhotoUrl, flightId: item.V_ID };
  showPhotoDialog.value = true;
}

function onPhotoDialogSave(photoBase64) {
  const flightId = photoDialogData.value.flightId;
  if (!flightId) return;
  databaseStore.update(`UPDATE Vol SET V_Photos = '${photoBase64}' WHERE V_ID = ${flightId}`);
  const idx = flights.value.findIndex(f => f.V_ID === flightId);
  if (idx !== -1) flights.value[idx].Photo = 'Yes';
  snackbarMessage.value = $gettext('Photo saved');
  snackbar.value = true;
  emit('db-updated');
}

function onPhotoDialogDelete() {
  const flightId = photoDialogData.value.flightId;
  if (!flightId) return;
  databaseStore.update(`UPDATE Vol SET V_Photos = NULL WHERE V_ID = ${flightId}`);
  const idx = flights.value.findIndex(f => f.V_ID === flightId);
  if (idx !== -1) flights.value[idx].Photo = null;
  snackbarMessage.value = $gettext('Photo deleted');
  snackbar.value = true;
  emit('db-updated');
}

function commentFlight(item) {
  selectedItems.value = [item.V_ID];
  commentDialogData.value = {
    comment: item.V_Commentaire || '',
    day: item.Day,
    site: item.V_Site,
    flightId: item.V_ID
  };
  showCommentDialog.value = true;
}

function onCommentDialogSave(comment) {
  const flightId = commentDialogData.value.flightId;
  onCommentUpdate({ id: flightId, comment });
}

function changeGlider(item) {
  selectedItems.value = [item.V_ID];
  gliderDialogData.value = { currentGlider: item.V_Engin || '', flightId: item.V_ID };
  showGliderDialog.value = true;
}

function onGliderDialogSave(glider) {
  const flightId = gliderDialogData.value.flightId;
  onGliderUpdate({ id: flightId, glider });
}

function changeSite(item) {
  selectedItems.value = [item.V_ID];
  changeSiteDialogData.value = { currentSite: item.V_Site || '', flightId: item.V_ID };
  showChangeSiteDialog.value = true;
}

function onChangeSiteDialogSave(site) {
  const flightId = changeSiteDialogData.value.flightId;
  onSiteUpdate({ id: flightId, site });
}

async function exportIgc(item) {
  // Load IGC data for this flight
  const reqSQL = `SELECT V_IGC, strftime('%d-%m-%Y',V_date) AS Day, V_Site FROM Vol WHERE V_ID = ${item.V_ID}`;
  const result = databaseStore.query(reqSQL);
  if (result.success && result.data && result.data[0] && result.data[0].values[0]) {
    const igcData = result.data[0].values[0][0];
    const day = result.data[0].values[0][1];
    const site = result.data[0].values[0][2];
    if (!igcData) {
      snackbarMessage.value = $gettext('No IGC data for this flight');
      snackbar.value = true;
      return;
    }
    const blob = new Blob([igcData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${day}-${site}.igc`.replace(/[^a-zA-Z0-9._-]/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

async function exportGpx(item) {
  // Load flight and convert IGC to GPX
  const reqSQL = `SELECT V_IGC, strftime('%d-%m-%Y',V_date) AS Day, V_Site FROM Vol WHERE V_ID = ${item.V_ID}`;
  const result = databaseStore.query(reqSQL);
  if (result.success && result.data && result.data[0] && result.data[0].values[0]) {
    const igcData = result.data[0].values[0][0];
    const day = result.data[0].values[0][1];
    const site = result.data[0].values[0][2];
    if (!igcData) {
      snackbarMessage.value = $gettext('No IGC data for this flight');
      snackbar.value = true;
      return;
    }
    const decoded = await igcDecoding(igcData);
    if (!decoded.success || !decoded.data.fixes) {
      snackbarMessage.value = $gettext('Could not decode IGC data');
      snackbar.value = true;
      return;
    }
    const gpxContent = igcToGpx(decoded.data);
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${day}-${site}.gpx`.replace(/[^a-zA-Z0-9._-]/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

function confirmDelete(item) {
  if (confirm($gettext('Are you sure you want to delete this flight?'))) {
    onFlightDelete(item.V_ID);
  }
}

// Renamed internal function to avoid conflict
async function openPhotoViewer(item) {
  if (!databaseStore.hasOpenDatabase) return;

  const reqSQL = `SELECT V_Photos FROM Vol WHERE V_ID = ${item.V_ID}`;
  const result = databaseStore.query(reqSQL);

  if (result.success && result.data && result.data[0]) {
    const photoData = result.data[0].values[0][0];
    if (photoData) {
      photoUrl.value = 'data:image/jpeg;base64,' + photoData;
      photoTitle.value = `${item.Day} ${item.V_Site}`;
      showPhotoViewer.value = true;
    }
  }
}

// Watchers and other functions (same as before, just mapped correctly)

watch(() => databaseStore.hasOpenDatabase, (isOpen) => {
  if (isOpen) {
    loadFlights();
  }
}, { immediate: true });


// Existing update functions (onCommentUpdate, etc.) kept as is
function onCommentUpdate({ id, comment }) {
  const flightId = id || null;
  if (!flightId) return;
  const req = `UPDATE Vol SET V_Commentaire = "${comment}" WHERE V_ID = ${flightId}`;
  const result = databaseStore.update(req);
  if (!result.success) {
    snackbarMessage.value = 'Erreur lors de la mise à jour du commentaire';
    snackbar.value = true;
    return;
  }
  const idx = flights.value.findIndex(f => f.V_ID === flightId);
  if (idx !== -1) {
    flights.value[idx].V_Commentaire = comment;
  }
  if (dataFlight.value) {
    dataFlight.value.comment = comment;
  }
  snackbarMessage.value = comment ? 'Commentaire enregistré' : 'Commentaire supprimé';
  snackbar.value = true;
  emit('db-updated');
}

function onGliderUpdate({ id, glider }) {
  const flightId = id || dataFlight.value?.decodedIgc?.info?.id || selectedItems.value[0];
  if (!flightId) return;
  const req = `UPDATE Vol SET V_Engin = '${glider}' WHERE V_ID = ${flightId}`;
  const result = databaseStore.update(req);
  if (!result.success) {
    snackbarMessage.value = 'Erreur lors de la mise à jour de la voile';
    snackbar.value = true;
    return;
  }
  const idx = flights.value.findIndex(f => f.V_ID === flightId);
  if (idx !== -1) {
    flights.value[idx].V_Engin = glider;
  }
  if (dataFlight.value) {
    dataFlight.value.glider = glider;
  }
  snackbarMessage.value = 'Voile modifiée';
  snackbar.value = true;
  emit('db-updated');
}

function onSiteUpdate({ id, site }) {
  const flightId = id || dataFlight.value?.decodedIgc?.info?.id || selectedItems.value[0];
  if (!flightId) return;
  const req = `UPDATE Vol SET V_Site = '${site}' WHERE V_ID = ${flightId}`;
  const result = databaseStore.update(req);
  if (!result.success) {
    snackbarMessage.value = 'Erreur lors de la mise à jour du site';
    snackbar.value = true;
    return;
  }
  const idx = flights.value.findIndex(f => f.V_ID === flightId);
  if (idx !== -1) {
    flights.value[idx].V_Site = site;
  }
  if (dataFlight.value) {
    dataFlight.value.site = site;
  }
  snackbarMessage.value = 'Site modifié';
  snackbar.value = true;
  emit('db-updated');
}

function onFlightDelete(flightId) {
  if (!flightId) return;
  const req = `DELETE FROM Vol WHERE V_ID = ${flightId}`;
  const result = databaseStore.update(req);
  if (!result.success) {
    snackbarMessage.value = 'Erreur lors de la suppression du vol';
    snackbar.value = true;
    return;
  }
  const index = flights.value.findIndex(f => f.V_ID === flightId);
  if (index !== -1) {
    flights.value.splice(index, 1);
    if (flights.value.length > 0) {
      // Stay on list, do not auto select next one to avoid jumping context
      selectedItems.value = [];
      dataFlight.value = null;
      decodedTrack.value = null;
    } else {
      selectedItems.value = [];
      dataFlight.value = null;
      decodedTrack.value = null;
    }
  }
  snackbarMessage.value = 'Vol supprimé';
  snackbar.value = true;
  emit('db-updated');
}


function onTagUpdate({ id, tag }) {
  const flightId = id || dataFlight.value?.dbId;
  if (!flightId) return;

  const tagVal = tag === null ? 'NULL' : tag;
  const req = `UPDATE Vol SET V_Tag = ${tagVal} WHERE V_ID = ${flightId}`;
  const result = databaseStore.update(req);

  if (!result.success) {
    console.error('Error updating tag', result.message);
    return;
  }

  const idx = flights.value.findIndex(f => f.V_ID === flightId);
  if (idx !== -1) {
    flights.value[idx].V_Tag = tag;
  }
  if (dataFlight.value && dataFlight.value.dbId === flightId) {
    dataFlight.value.tag = tag;
  }
  emit('db-updated');
}


function onOpenFullMap() {
  if (!dataFlight.value) return;
  showFullMap.value = true;
}

function onFullMapClose() {
  showFullMap.value = false;
  loadFlights(true);
}

function onOpenCesium() {
  if (!dataFlight.value || !dataFlight.value.decodedIgc?.fixes) {
    console.error('No flight data available for 3D view');
    return;
  }
  showCesiumView.value = true;
}

function onOpenAnalyze() {
  if (!dataFlight.value || !dataFlight.value.decodedIgc?.fixes) {
    console.error('No flight data available for analysis');
    return;
  }
  showTraceInfoDialog.value = true;
}

// Logic to load IGC from DB
async function readIgcFromDb(flightId) {
  if (!databaseStore.hasOpenDatabase) return;
  const reqSQL = `SELECT V_IGC, strftime('%d-%m-%Y',V_date) AS Day, V_Site, V_Engin, V_Commentaire, V_sDuree, CASE WHEN (V_Photos IS NOT NULL AND V_Photos !='') THEN 1 ELSE 0 END as HasPhoto, V_Tag FROM Vol WHERE V_ID = ${flightId}`;
  const result = databaseStore.query(reqSQL);

  if (result.success && result.data && result.data[0]) {
    const strIgc = result.data[0].values[0][0];

    // Detect empty or null V_IGC -> flight without GPS track
    if (!strIgc || strIgc.trim() === '') {
      await mapWithoutIgc(flightId);
      return;
    }

    const decodedIgc = await igcDecoding(strIgc)
    if (decodedIgc.success && decodedIgc.data.fixes && decodedIgc.data.fixes.length > 0) {
      noIgcFlight.value = null; // Reset no-IGC state
      noTrackFlightDetails.value = null; // Reset no-track flight details
      decodedTrack.value = decodedIgc.data
      const analyzeIgc = await IgcAnalyze(decodedIgc.data.fixes);
      if (!analyzeIgc.success) {
        console.log(analyzeIgc.message)
      } else {
        dataFlight.value = {
          dbId: flightId,
          day: result.data[0].values[0][1],
          site: result.data[0].values[0][2],
          glider: result.data[0].values[0][3],
          comment: result.data[0].values[0][4],
          duration: result.data[0].values[0][5],
          hasPhoto: result.data[0].values[0][6] === 1,
          tag: result.data[0].values[0][7],
          anaTrack: analyzeIgc.anaTrack,
          decodedIgc: decodedTrack.value,
          rawIgc: strIgc
        }
      }
    }
  } else {
    console.error('Erreur lors du chargement des vols:', result.message);
  }
}

async function mapWithoutIgc(flightId) {
  const req = `SELECT V_ID, V_IGC, V_LatDeco, V_LongDeco, V_AltDeco, V_Site, V_Pays, V_Engin, V_Commentaire, strftime('%d-%m-%Y', V_Date) AS Day, strftime('%H:%M', V_Date) AS Time, V_sDuree, CASE WHEN (V_Photos IS NOT NULL AND V_Photos != '') THEN 1 ELSE 0 END as HasPhoto, V_Tag FROM Vol WHERE V_ID = ${flightId}`;
  const result = databaseStore.query(req);

  if (result.success && result.data && result.data[0] && result.data[0].values[0]) {
    const row = result.data[0].values[0];
    const lat = row[2];
    const lon = row[3];
    const alt = row[4];
    const site = row[5];

    decodedTrack.value = null;
    dataFlight.value = null;
    scoreJson.value = null;

    noIgcFlight.value = { lat, lon, site, alt, flightId };

    noTrackFlightDetails.value = {
      dbId: row[0],
      day: row[9],
      time: row[10],
      site: row[5],
      pays: row[6],
      glider: row[7],
      comment: row[8],
      duration: row[11],
      hasPhoto: row[12] === 1,
      tag: row[13],
      rawIgc: null,
      decodedIgc: null
    };

    await nextTick();
    if (littleMapRef.value && littleMapRef.value.displayTakeoffOnly) {
      littleMapRef.value.displayTakeoffOnly(lat, lon, site, alt);
    }
  }
}

async function openNoTrackEdit(flightId) {
  await loadNoTrackFlightData(flightId);
  if (noTrackFlightData.value) {
    noTrackDialogMode.value = 'edit';
    showNoTrackDialog.value = true;
  }
}

async function openNoTrackDuplicate(flightId) {
  await loadNoTrackFlightData(flightId);
  if (noTrackFlightData.value) {
    noTrackDialogMode.value = 'duplicate';
    showNoTrackDialog.value = true;
  }
}

async function loadNoTrackFlightData(flightId) {
  if (!databaseStore.hasOpenDatabase) return;
  const reqSQL = `SELECT V_ID, strftime('%Y-%m-%d', V_Date) AS DateFmt, strftime('%H:%M', V_Date) AS TimeFmt, V_sDuree, V_Duree, V_Site, V_Pays, V_Engin, V_Commentaire, V_LatDeco, V_LongDeco, V_AltDeco FROM Vol WHERE V_ID = ${flightId}`;

  const result = databaseStore.query(reqSQL);
  if (result.success && result.data && result.data[0] && result.data[0].values[0]) {
    const row = result.data[0].values[0];
    noTrackFlightData.value = {
      id: row[0],
      date: row[1],
      time: row[2],
      durationStr: row[3],
      duration: row[4],
      site: row[5],
      country: row[6],
      glider: row[7],
      comment: row[8],
      lat: row[9],
      lon: row[10],
      alt: row[11]
    };
  }
}

function onNoTrackFlightSaved() {
  showNoTrackDialog.value = false;
  loadFlights(true);
  emit('db-updated');
  snackbarMessage.value = 'Vol manuel enregistré';
  snackbar.value = true;
}

</script>

<style scoped>
.logbook-layout {
  height: 100%;
  overflow: hidden;
}

.map-main {
  /* v-main inside v-layout automatically adjusts for the drawer */
  height: 100%;
  padding: 0 !important;
}

.map-wrapper,
.no-track-placeholder {
  width: 100%;
  height: 100%;
}

/*
 * On mobile, hide Leaflet layer selector AND our custom Vue button overlay
 * when the drawer is open, so they don't bleed over the flight list.
 * Re-appear automatically when drawer closes (user selects a flight).
 * Attribution (.leaflet-bottom) is preserved (legally required by OSM).
 */
.hide-map-controls :deep(.leaflet-top),
.hide-map-controls :deep(.map-overlay-bottomright) {
  display: none;
}

.flight-list-drawer {
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

/*
 * Vuetify 3's v-navigation-drawer wraps its slotted content inside
 * .v-navigation-drawer__content, which has overflow-y:auto by default.
 * We turn that container into a flex column so the header stays fixed
 * and only the virtual-scroll list scrolls.
 * :deep() pierces the scoped boundary without affecting other components.
 */
.flight-list-drawer :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* stop the outer container from scrolling */
  height: 100%;
}

.flight-virtual-scroll {
  flex: 1 1 0;
  /* grow to fill remaining height */
  min-height: 0;
  /* required so flex child can shrink below content size */
  overflow-y: auto;
  /* only the list scrolls */
}

.flight-item {
  cursor: pointer;
  transition: background-color 0.15s;
  min-height: 64px !important;
}

.flight-item:hover {
  background-color: #f0f4ff;
}

.flight-indicators {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 18px;
  gap: 2px;
}

.flight-primary {
  font-size: 0.82rem !important;
  font-weight: 700 !important;
  line-height: 1.4 !important;
  display: flex;
  align-items: center;
}

.flight-date {
  color: #1a1a1a;
}

.flight-duration {
  color: #1565C0;
  font-weight: 800;
}

.flight-secondary {
  font-size: 0.78rem !important;
  color: #555 !important;
  margin-top: 1px;
}
</style>