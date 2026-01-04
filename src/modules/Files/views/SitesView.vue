<template>
  <v-snackbar v-model="snackbar" :timeout="5000" color="success" location="top">
    {{ snackbarMessage }}
    <template v-slot:actions>
      <v-btn variant="text" @click="snackbar = false">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </template>
  </v-snackbar>

  <OpenLogbook :show="true" />

  <div v-if="databaseStore.hasOpenDatabase" class="sites-layout">
    <!-- Left panel: Map -->
    <div class="left-panel">
      <LittleMapView ref="littleMapRef" :hideOverlay="true" :zoomLevel="14" />
    </div>

    <!-- Right panel: Filter, Search, Table, Details -->
    <div class="right-panel">
      <!-- Filter bar -->
      <div class="filter-block">
        <v-radio-group v-model="typeFilter" inline hide-details density="compact">
          <v-radio :label="$gettext('All')" value="all"></v-radio>
          <v-radio :label="$gettext('Take off')" value="D"></v-radio>
          <v-radio :label="$gettext('Landing')" value="A"></v-radio>
          <v-radio :label="$gettext('Not defined')" value="other"></v-radio>
        </v-radio-group>
      </div>

      <!-- Search bar -->
      <div class="top-block">
        <v-text-field v-model="search" :label="$gettext('Search')" prepend-inner-icon="mdi-magnify" single-line
          hide-details clearable density="compact" variant="outlined" class="search-field"></v-text-field>
      </div>

      <!-- Sites table -->
      <div class="table-block">
        <v-data-table v-model="selectedItems" :headers="headers" :items="filteredSites" :search="search"
          item-value="S_ID" density="compact" class="sites-table" v-model:page="page"
          v-model:items-per-page="itemsPerPage">
          <template v-slot:item="{ item, props }">
            <tr v-bind="props" :class="{
              'selected-row': selectedItems.includes(item.S_ID),
              'has-comment': item.S_Commentaire
            }" @click="selectedItems = [item.S_ID]; onSelectionChange(item)" style="cursor:pointer;">
              <td class="col-type">
                <img v-if="item.S_Type === 'D'" :src="windsockIcon" alt="Take off" class="type-icon" />
                <img v-else-if="item.S_Type === 'A'" :src="arriveeIcon" alt="Landing" class="type-icon" />
                <img v-else :src="flagYellowIcon" alt="Not defined" class="type-icon" />
              </td>
              <td class="col-nom">{{ item.S_Nom }}</td>
              <td class="col-localite">{{ item.S_Localite }}</td>
              <td class="col-cp">{{ item.S_CP }}</td>
              <td class="col-alt">{{ item.S_Alti }}</td>
              <td class="col-pays">{{ item.S_Pays }}</td>
            </tr>
          </template>
          <template v-slot:bottom>
            <div class="custom-pagination">
              <v-btn icon variant="text" size="small" @click="page = 1" :disabled="page <= 1">
                <v-icon>mdi-chevron-double-left</v-icon>
              </v-btn>
              <v-btn icon variant="text" size="small" @click="page = Math.max(1, page - 1)" :disabled="page <= 1">
                <v-icon>mdi-chevron-left</v-icon>
              </v-btn>
              <span class="mx-2 text-caption">Page {{ page }} / {{ pageCount }}</span>
              <v-btn icon variant="text" size="small" @click="page = Math.min(pageCount, page + 1)"
                :disabled="page >= pageCount">
                <v-icon>mdi-chevron-right</v-icon>
              </v-btn>
              <v-btn icon variant="text" size="small" @click="page = pageCount" :disabled="page >= pageCount">
                <v-icon>mdi-chevron-double-right</v-icon>
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </div>

      <!-- Site details panel -->
      <div class="bottom-block">
        <v-card v-if="selectedSite" class="details-card" translate="no">
          <v-card-title class="d-flex justify-space-between align-center">
            <v-chip color="primary" label class="mr-2">
              {{ selectedSite.S_Nom }} {{ formatDate(selectedSite.S_Maj) }}
            </v-chip>
            <div class="text-right flex-grow-1">
              {{ $gettext('Site details') }}
            </div>
          </v-card-title>

          <v-tabs v-model="tab" color="primary" class="bg-grey-lighten-4">
            <v-tab value="about">
              <v-icon class="mr-2">mdi-information-outline</v-icon>
              {{ $gettext('About') }}
            </v-tab>
            <v-tab value="comment">
              <v-icon class="mr-2">mdi-comment-text-outline</v-icon>
              {{ $gettext('Comment') }}
            </v-tab>
            <v-tab value="utilities">
              <v-icon class="mr-2">mdi-wrench-outline</v-icon>
              {{ $gettext('Utilities') }}
            </v-tab>
          </v-tabs>

          <v-window v-model="tab">
            <!-- ABOUT TAB -->
            <v-window-item value="about">
              <v-card-text>
                <div class="about-block">
                  <!-- Line 1: Name, Locality, Country -->
                  <div class="about-row info-row">
                    <span class="info-bold">{{ $gettext('Site') }}</span>
                    <span>{{ selectedSite.S_Nom }}</span>
                    <span class="info-bold">{{ $gettext('Locality') }}</span>
                    <span>{{ selectedSite.S_Localite }}</span>
                    <span class="info-bold">{{ $gettext('Country') }}</span>
                    <span>{{ selectedSite.S_Pays }}</span>
                  </div>
                  <!-- Line 2: Altitude, Orientation, Updated -->
                  <div class="about-row info-row">
                    <span class="info-bold">{{ $gettext('Altitude') }}</span>
                    <span>{{ selectedSite.S_Alti }}m</span>
                    <span class="info-bold">{{ $gettext('Orientation') }}</span>
                    <span>{{ selectedSite.S_Orientation || '-' }}</span>
                    <span class="info-bold">{{ $gettext('Updated') }}</span>
                    <span>{{ formatDate(selectedSite.S_Maj) }}</span>
                  </div>
                  <!-- Line 3: Action buttons -->
                  <div class="about-row btn-row">
                    <v-btn color="primary" density="compact" class="mr-2" @click="openNewSiteDialog">
                      <v-icon start>mdi-plus</v-icon>
                      {{ $gettext('Add') }}
                    </v-btn>
                    <v-btn color="error" density="compact" class="mr-2" @click="onDeleteSite">
                      <v-icon start>mdi-delete</v-icon>
                      {{ $gettext('Delete') }}
                    </v-btn>
                    <v-btn color="warning" density="compact" @click="openEditSiteDialog">
                      <v-icon start>mdi-pencil</v-icon>
                      {{ $gettext('Modify') }}
                    </v-btn>
                  </div>
                </div>
              </v-card-text>
            </v-window-item>

            <!-- COMMENT TAB -->
            <v-window-item value="comment">
              <v-card-text>
                <v-textarea v-model="commentText" :label="$gettext('Add a comment')" rows="3" variant="outlined"
                  density="compact"></v-textarea>
                <div class="comment-btn-row">
                  <v-btn color="error" density="compact" class="mr-2" @click="onDeleteComment">{{ $gettext('Delete')
                    }}</v-btn>
                  <v-btn color="primary" density="compact" @click="onValidateComment">{{ $gettext('OK') }}</v-btn>
                </div>
              </v-card-text>
            </v-window-item>

            <!-- UTILITIES TAB -->
            <v-window-item value="utilities">
              <v-card-text>
                <div class="utilities-btn-row">
                  <v-btn color="secondary" density="compact" class="mr-3" @click="onShowDuplicates">
                    <v-icon start>mdi-content-duplicate</v-icon>
                    {{ $gettext('Duplicate') }}
                  </v-btn>
                  <v-btn color="warning" density="compact" class="mr-3" @click="onCleanDuplicates">
                    <v-icon start>mdi-broom</v-icon>
                    {{ $gettext('Cleaning') }}
                  </v-btn>
                  <v-btn color="secondary" density="compact" class="mr-3" disabled>
                    <v-icon start>mdi-file-export</v-icon>
                    {{ $gettext('Export') }}
                  </v-btn>
                  <v-btn color="secondary" density="compact" disabled>
                    <v-icon start>mdi-file-import</v-icon>
                    {{ $gettext('Import') }}
                  </v-btn>
                </div>
              </v-card-text>
            </v-window-item>
          </v-window>
        </v-card>

        <div v-else class="no-site-message">
          <p>{{ $gettext('Select a site to display details') }}</p>
        </div>
      </div>
    </div>

    <!-- Site Form Dialog -->
    <SiteFormDialog v-model="showSiteDialog" :site="siteFormData" @submit="handleSiteSubmit"
      @cancel="handleSiteCancel" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useGettext } from "vue3-gettext";
import OpenLogbook from '@/components/OpenLogbook.vue';
import LittleMapView from '@/components/LittleMapView.vue';
import SiteFormDialog from '@/components/SiteFormDialog.vue';
import { useDatabaseStore } from '@/stores/database';

// Import icons
import windsockIcon from '@/assets/windsock22.png';
import arriveeIcon from '@/assets/arrivee22.png';
import flagYellowIcon from '@/assets/flag-yellow-22.png';

const databaseStore = useDatabaseStore();
const { $gettext } = useGettext();

// Declare emits
const emit = defineEmits(['dbUpdated']);

// State
const sites = ref([]);
const selectedItems = ref([]);
const selectedSite = ref(null);
const search = ref('');
const page = ref(1);
const itemsPerPage = ref(8);
const tab = ref('about');
const commentText = ref('');
const littleMapRef = ref(null);
const snackbar = ref(false);
const snackbarMessage = ref('');
const typeFilter = ref('all');
const showDuplicatesMode = ref(false);

// Site Form Dialog
const showSiteDialog = ref(false);
const siteFormData = ref(null);

// Table headers
const headers = [
  { title: '', key: 'S_Type', sortable: false, width: '5%' },
  { title: $gettext('Name'), key: 'S_Nom', sortable: true },
  { title: $gettext('Locality'), key: 'S_Localite', sortable: true },
  { title: $gettext('ZIP'), key: 'S_CP', sortable: true },
  { title: $gettext('Alt'), key: 'S_Alti', sortable: true },
  { title: $gettext('Country'), key: 'S_Pays', sortable: true },
];

// Computed
const filteredSites = computed(() => {
  let result = sites.value;

  // Apply type filter
  if (typeFilter.value === 'D') {
    result = result.filter(site => site.S_Type === 'D');
  } else if (typeFilter.value === 'A') {
    result = result.filter(site => site.S_Type === 'A');
  } else if (typeFilter.value === 'other') {
    result = result.filter(site => site.S_Type !== 'D' && site.S_Type !== 'A');
  }

  // Apply search filter
  if (search.value) {
    const searchLower = search.value.toLowerCase();
    result = result.filter(site => {
      return (site.S_Nom && site.S_Nom.toLowerCase().includes(searchLower)) ||
        (site.S_Localite && site.S_Localite.toLowerCase().includes(searchLower)) ||
        (site.S_Pays && site.S_Pays.toLowerCase().includes(searchLower)) ||
        (site.S_CP && site.S_CP.toString().includes(searchLower));
    });
  }

  return result;
});

const pageCount = computed(() => {
  return Math.ceil(filteredSites.value.length / itemsPerPage.value);
});

// Lifecycle
onMounted(async () => {
  if (databaseStore.hasOpenDatabase) {
    loadSites();
  }
});

// Watch for database changes
watch(() => databaseStore.hasOpenDatabase, (hasDb) => {
  if (hasDb) {
    loadSites();
  }
});

// Watch selected site to update comment text
watch(selectedSite, (newSite) => {
  commentText.value = newSite?.S_Commentaire || '';
});

// Watch for filter changes to select first filtered site
watch(typeFilter, async () => {
  await nextTick();
  selectFirstFilteredSite();
});

// Watch for search changes to select first filtered site
watch(search, async () => {
  await nextTick();
  selectFirstFilteredSite();
});

/**
 * Select the first site in the filtered list
 */
function selectFirstFilteredSite() {
  if (filteredSites.value.length > 0) {
    const firstSite = filteredSites.value[0];
    selectedItems.value = [firstSite.S_ID];
    selectedSite.value = firstSite;
    displaySiteOnMap(firstSite);
  } else {
    selectedItems.value = [];
    selectedSite.value = null;
  }
}

/**
 * Load all sites from database
 */
async function loadSites() {
  if (!databaseStore.hasOpenDatabase) return;

  const reqSQL = `SELECT S_ID, S_Type, S_Nom, S_Localite, S_CP, S_Pays, S_Alti, S_Orientation, S_Latitude, S_Longitude, S_Commentaire, S_Maj FROM Site ORDER BY S_Nom`;
  const result = databaseStore.query(reqSQL);

  if (result.success && result.data && result.data[0]) {
    const columns = result.data[0].columns;
    const values = result.data[0].values;
    sites.value = values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    // Wait for DOM and map to be ready, then select first site
    await nextTick();
    setTimeout(() => {
      selectFirstFilteredSite();
    }, 200);
  } else {
    sites.value = [];
  }
}

/**
 * Handle site selection
 */
function onSelectionChange(site) {
  selectedSite.value = site;
  displaySiteOnMap(site);
}

/**
 * Display site marker on map
 */
async function displaySiteOnMap(site) {
  if (!site || !littleMapRef.value) return;

  await nextTick();
  if (littleMapRef.value.displayTakeoffOnly) {
    littleMapRef.value.displayTakeoffOnly(
      site.S_Latitude,
      site.S_Longitude,
      site.S_Nom,
      site.S_Alti,
      site.S_Type
    );
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

/**
 * Open dialog to create a new site
 */
function openNewSiteDialog() {
  siteFormData.value = null;
  showSiteDialog.value = true;
}

/**
 * Open dialog to edit selected site
 */
function openEditSiteDialog() {
  if (!selectedSite.value) return;

  siteFormData.value = {
    id: selectedSite.value.S_ID,
    typeSite: selectedSite.value.S_Type,
    nom: selectedSite.value.S_Nom,
    localite: selectedSite.value.S_Localite,
    cp: selectedSite.value.S_CP,
    pays: selectedSite.value.S_Pays,
    alti: selectedSite.value.S_Alti,
    orient: selectedSite.value.S_Orientation,
    lat: selectedSite.value.S_Latitude,
    long: selectedSite.value.S_Longitude,
    comment: selectedSite.value.S_Commentaire,
    newsite: false
  };
  showSiteDialog.value = true;
}

/**
 * Handle site form submission
 */
function handleSiteSubmit(siteData) {
  if (siteData.newsite) {
    // Insert new site
    insertSite(siteData);
  } else {
    // Update existing site
    updateSite(siteData);
  }
}

/**
 * Insert new site into database
 */
function insertSite(siteData) {
  const table = 'Site';
  const params = {
    S_Type: siteData.typeSite || 'D',
    S_Nom: siteData.nom,
    S_Localite: siteData.localite,
    S_CP: siteData.cp,
    S_Pays: siteData.pays,
    S_Alti: siteData.alti,
    S_Orientation: siteData.orient,
    S_Latitude: siteData.lat,
    S_Longitude: siteData.long,
    S_Commentaire: siteData.comment,
    S_Maj: new Date().toISOString().split('T')[0]
  };

  const result = databaseStore.insert(table, params);
  if (result.success) {
    snackbarMessage.value = $gettext('Site created successfully');
    snackbar.value = true;
    loadSites();
    emit('dbUpdated');
  } else {
    snackbarMessage.value = $gettext('Error creating site');
    snackbar.value = true;
  }
}

/**
 * Update existing site in database
 */
function updateSite(siteData) {
  const reqSQL = `UPDATE Site SET 
    S_Type = '${siteData.typeSite}',
    S_Nom = '${siteData.nom}',
    S_Localite = '${siteData.localite}',
    S_CP = '${siteData.cp}',
    S_Pays = '${siteData.pays}',
    S_Alti = ${siteData.alti || 0},
    S_Orientation = '${siteData.orient || ''}',
    S_Latitude = ${siteData.lat},
    S_Longitude = ${siteData.long},
    S_Commentaire = '${siteData.comment || ''}',
    S_Maj = '${new Date().toISOString().split('T')[0]}'
    WHERE S_ID = ${siteData.id}`;

  const result = databaseStore.update(reqSQL);
  if (result.success) {
    snackbarMessage.value = $gettext('Site updated successfully');
    snackbar.value = true;
    loadSites();
    emit('dbUpdated');
    // Re-select the updated site
    const updatedSite = sites.value.find(s => s.S_ID === siteData.id);
    if (updatedSite) {
      onSelectionChange(updatedSite);
    }
  } else {
    snackbarMessage.value = $gettext('Error updating site');
    snackbar.value = true;
  }
}

/**
 * Delete selected site
 */
function onDeleteSite() {
  if (!selectedSite.value) return;

  const siteName = selectedSite.value.S_Nom;
  if (confirm($gettext('Delete site') + ` "${siteName}" ?`)) {
    const reqSQL = `DELETE FROM Site WHERE S_ID = ${selectedSite.value.S_ID}`;
    const result = databaseStore.update(reqSQL);

    if (result.success) {
      snackbarMessage.value = $gettext('Site deleted');
      snackbar.value = true;
      loadSites();
      emit('dbUpdated');
    } else {
      snackbarMessage.value = $gettext('Error deleting site');
      snackbar.value = true;
    }
  }
}

/**
 * Handle cancel from site form
 */
function handleSiteCancel() {
  // Nothing special to do
}

/**
 * Delete comment
 */
function onDeleteComment() {
  commentText.value = '';
  onValidateComment();
}

/**
 * Validate and save comment
 */
function onValidateComment() {
  if (!selectedSite.value) return;

  const reqSQL = `UPDATE Site SET S_Commentaire = '${commentText.value}' WHERE S_ID = ${selectedSite.value.S_ID}`;
  const result = databaseStore.update(reqSQL);

  if (result.success) {
    selectedSite.value.S_Commentaire = commentText.value;
    const idx = sites.value.findIndex(s => s.S_ID === selectedSite.value.S_ID);
    if (idx !== -1) {
      sites.value[idx].S_Commentaire = commentText.value;
    }
    snackbarMessage.value = commentText.value ? $gettext('Comment saved') : $gettext('Comment deleted');
    snackbar.value = true;
    emit('dbUpdated');
  }
}

/**
 * Show duplicate sites
 */
function onShowDuplicates() {
  if (!databaseStore.hasOpenDatabase) return;

  const reqSQL = `SELECT a.* FROM Site a JOIN (SELECT *, COUNT(S_ID) FROM Site GROUP BY S_Nom, S_Alti HAVING COUNT(S_Nom) > 1) b ON a.S_Nom = b.S_Nom ORDER BY a.S_Nom`;
  const result = databaseStore.query(reqSQL);

  if (result.success && result.data && result.data[0]) {
    const columns = result.data[0].columns;
    const values = result.data[0].values;
    sites.value = values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    showDuplicatesMode.value = true;
    typeFilter.value = 'all';
    snackbarMessage.value = $gettext('Displaying duplicates') + `: ${sites.value.length} ` + $gettext('sites');
    snackbar.value = true;

    // Select first site if available
    if (sites.value.length > 0) {
      selectedItems.value = [sites.value[0].S_ID];
      onSelectionChange(sites.value[0]);
    } else {
      selectedSite.value = null;
    }
  } else {
    snackbarMessage.value = $gettext('No duplicates found');
    snackbar.value = true;
  }
}

/**
 * Clean duplicate sites
 */
function onCleanDuplicates() {
  if (!databaseStore.hasOpenDatabase) return;

  if (confirm($gettext('Delete all duplicate sites? This action cannot be undone.'))) {
    const reqSQL = `DELETE FROM Site WHERE rowid NOT IN (SELECT MIN(rowid) FROM Site GROUP BY S_Nom, S_Alti)`;
    const result = databaseStore.update(reqSQL);

    if (result.success) {
      // Save database
      databaseStore.saveDatabase();
      snackbarMessage.value = $gettext('Duplicates removed successfully');
      snackbar.value = true;
      showDuplicatesMode.value = false;
      loadSites();
      emit('dbUpdated');
    } else {
      snackbarMessage.value = $gettext('Error removing duplicates');
      snackbar.value = true;
    }
  }
}
</script>

<style scoped>
.sites-layout {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: calc(100vh - 120px);
  margin: 0;
  padding: 10px;
  gap: 2vw;
  box-sizing: border-box;
}

.left-panel,
.right-panel {
  width: 50%;
  height: 100%;
  box-sizing: border-box;
}

.left-panel {
  background: #f0f0f0;
  border: 2px solid #333;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.right-panel {
  display: flex;
  flex-direction: column;
  padding-right: 70px;
  gap: 10px;
}

.filter-block {
  width: 100%;
  height: 6%;
  background: #f0f0f0;
  border: 2px solid #333;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 4px 20px;
}

.top-block {
  width: 100%;
  height: 7%;
  background: #f0f0f0;
  border: 2px solid #333;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 10px 20px;
}

.search-field {
  flex: 1;
}

.table-block {
  width: 100%;
  height: 54%;
  background: #f0f0f0;
  border: 2px solid #333;
  border-radius: 10px;
  box-sizing: border-box;
  overflow: auto;
}

.sites-table {
  width: 100%;
  height: 100%;
}

.sites-table tr {
  font-size: 0.85em;
  height: 16px;
}

.sites-table td {
  padding-top: 1px !important;
  padding-bottom: 1px !important;
}

.col-type {
  width: 5% !important;
}

.col-nom {
  width: 25% !important;
}

.col-localite {
  width: 25% !important;
}

.col-cp {
  width: 10% !important;
}

.col-alt {
  width: 10% !important;
}

.col-pays {
  width: 15% !important;
}

.selected-row {
  background-color: #1867C0 !important;
  color: white;
}

.has-comment {
  color: #fbb104 !important;
  font-weight: 600;
}

.custom-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.bottom-block {
  width: 100%;
  height: 33%;
  border: 2px solid #333;
  border-radius: 10px;
  box-sizing: border-box;
  overflow: hidden;
}

.type-icon {
  width: 22px;
  height: 22px;
  vertical-align: middle;
}

.details-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
}

.about-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.about-row {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.info-row {
  gap: 16px;
}

.info-bold {
  font-weight: 600;
}

.btn-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.comment-btn-row {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  justify-content: flex-end;
}

.utilities-btn-row {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.no-site-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  font-style: italic;
}

@media (max-width: 900px) {
  .sites-layout {
    flex-direction: column;
    height: auto;
    padding: 2vw 1vw;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    height: auto;
    margin-bottom: 2vw;
  }

  .right-panel {
    gap: 2vw;
    padding-right: 0;
  }
}
</style>