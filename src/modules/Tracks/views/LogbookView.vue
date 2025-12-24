<template>
  <v-snackbar v-model="snackbar" :timeout="2000" color="success">
    {{ snackbarMessage }}
  </v-snackbar>
  <OpenLogbook :show="true" />
  <div v-if="databaseStore.hasOpenDatabase" class="global-logbook">
    <div class="left-panel">
      <LittleMapView v-if="decodedTrack && decodedTrack.GeoJSON" :geoJson="decodedTrack.GeoJSON" :scoreJson="scoreJson"
        @open-full-map="onOpenFullMap" @open-flyxc="onOpenFlyXc" @open-analyze="onOpenAnalyze" />
      <div v-else class="no-track-message">
        <p>Base de données : {{ databaseStore.dbName }}</p>
        <p>Sélectionnez un vol pour afficher la trace</p>
      </div>
    </div>
    <div class="right-panel">
      <div class="top-block">
        <v-text-field v-model="search" :label="$gettext('Search')" prepend-inner-icon="mdi-magnify" single-line
          hide-details clearable density="compact" variant="outlined" class="search-field"></v-text-field>
        <v-select v-model="selectedTagFilter" :items="tagOptions" :label="$gettext('Filter by tag')" density="compact"
          variant="outlined" hide-details class="tag-filter ml-4" item-title="title" item-value="value">
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
      </div>
      <div class="table-block">
        <v-data-table v-model="selectedItems" :headers="headers" :items="processedFlights" :search="search"
          item-value="V_ID" density="compact" class="flights-table" v-model:page="page"
          v-model:items-per-page="itemsPerPage" @update:model-value="onSelectionChange"
          @update:current-items="onFilteredItemsUpdate">
          <template v-slot:item="{ item, index, props }">
            <tr v-bind="props" :class="{
              'selected-row': selectedItems.includes(item.V_ID),
              'has-comment': item.V_Commentaire
            }" @click="selectedItems = [item.V_ID]; onSelectionChange([item.V_ID])" style="cursor:pointer;">
              <td class="col-photo">
                <v-icon v-if="item.Photo === 'Yes'" size="large"
                  :color="selectedItems.includes(item.V_ID) ? 'white' : 'primary'" @click.stop="openPhoto(item)">
                  {{ selectedItems.includes(item.V_ID) ? 'mdi-camera-outline' : 'mdi-camera' }}
                </v-icon>
              </td>
              <td class="col-tag">
                <v-icon v-if="item.V_Tag && tagsMap[item.V_Tag]" :color="tagsMap[item.V_Tag].color"
                  size="small">mdi-circle</v-icon>
              </td>
              <td class="col-day">{{ item.Day }}</td>
              <td class="col-hour">{{ item.Hour }}</td>
              <td class="col-duree">{{ item.Duree }}</td>
              <td class="col-site">{{ item.V_Site }}</td>
              <td class="col-engin">{{ item.V_Engin }}</td>
            </tr>
          </template>
          <!-- A voir si on garde ce mode de pagination Voir la doc 
              https://vuetifyjs.com/en/components/data-tables/data-and-display/#external-pagination
          -->
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
      <div class="bottom-block">
        <LogbookDetails v-if="dataFlight" :trackData="dataFlight" @update:scoreJson="scoreJson = $event"
          @update:comment="onCommentUpdate" @update:glider="onGliderUpdate" @update:site="onSiteUpdate"
          @update:delete="onFlightDelete" @update:photo="onPhotoUpdate" @update:tag="onTagUpdate" />
        <div v-else class="no-track-message">
          <p>Sélectionnez un vol pour afficher les détails</p>
        </div>
      </div>
    </div>

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

    <v-dialog v-model="showFullMap" fullscreen transition="dialog-bottom-transition">
      <FullMapView v-if="dataFlight" :flightData="dataFlight" @close="onFullMapClose" />
    </v-dialog>
  </div>
</template>

<script setup>

import { ref, computed, watch } from 'vue';
import { useGettext } from "vue3-gettext";
import OpenLogbook from '@/components/OpenLogbook.vue';
import LittleMapView from '@/components/LittleMapView.vue';
import LogbookDetails from '@/components/LogbookDetails.vue';
import FullMapView from '@/components/FullMapView.vue';
import { useDatabaseStore } from '@/stores/database';
import { igcDecoding } from '@/js/igc/igc-decoder.js';
import { IgcAnalyze } from '@/js/igc/igc-analyzer.js';

// Déclarer les événements que ce composant peut émettre
const emit = defineEmits(['db-updated']);

const databaseStore = useDatabaseStore();
const { $gettext } = useGettext();

const flights = ref([]);
const selectedItems = ref([]);
const page = ref(1);
const itemsPerPage = ref(8);
const search = ref('');
const filteredCount = ref(0);
const decodedTrack = ref(null)
const analysisTrack = ref(null);
const dataFlight = ref(null);
const scoreJson = ref(null);
const snackbar = ref(false);
const snackbarMessage = ref('');
const showPhotoViewer = ref(false);
const showFullMap = ref(false);
const photoUrl = ref(null);
const photoTitle = ref('');
const tagsMap = ref({});
const selectedTagFilter = ref(null);

const tagOptions = computed(() => {
  const opts = Object.values(tagsMap.value).map(t => ({
    title: t.label,
    value: t.id,
    color: t.color
  }));
  return [{ title: $gettext('All tags'), value: null }, ...opts];
});

const pageCount = computed(() => {
  return Math.ceil(flights.value.length / itemsPerPage.value);
});

// @update:current-items retourne uniquement les items de la page actuelle. 
// Pour obtenir tous les items filtrés (toutes pages confondues), 
// il faut utiliser un computed qui applique manuellement 
// le filtre de recherche sur flights.value.
const processedFlights = computed(() => {
  if (!selectedTagFilter.value) return flights.value;
  return flights.value.filter(f => f.V_Tag === selectedTagFilter.value);
});

const filteredFlights = computed(() => {
  if (!search.value) return processedFlights.value;

  const searchLower = search.value.toLowerCase();
  return processedFlights.value.filter(flight => {
    return Object.values(flight).some(value => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(searchLower);
    });
  });
});

const headers = [
  { title: '', key: 'Photo', sortable: false },
  { title: 'Tag', key: 'V_Tag' },
  { title: 'Date', key: 'Day' },
  { title: 'Heure', key: 'Hour' },
  { title: 'Durée', key: 'Duree' },
  { title: 'Site', key: 'V_Site' },
  { title: 'Engin', key: 'V_Engin' },
];

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

function loadFlights(keepSelection = false) {
  if (!databaseStore.hasOpenDatabase) return;
  loadTags();

  let reqSQL = "SELECT V_ID, strftime('%d-%m-%Y',V_date) AS Day, strftime('%H:%M',V_date) AS Hour, replace(V_sDuree,'mn','') AS Duree, V_Site, V_Engin, V_Commentaire, V_Duree, V_Tag, ";
  reqSQL += "CASE WHEN (V_Photos IS NOT NULL AND V_Photos !='') THEN 'Yes' END Photo ";
  reqSQL += "FROM Vol ORDER BY V_Date DESC";

  const result = databaseStore.query(reqSQL);

  if (result.success && result.data && result.data[0]) {
    const columns = result.data[0].columns;
    const values = result.data[0].values;
    // Transformer chaque ligne en objet clé/valeur
    flights.value = values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    // Sélectionner la première ligne de la première page ou garder la sélection actuelle
    // Use processedFlights instead of flights to respect filter if applied?
    // Actually keep logic simple: verify selection in whole list
    if (keepSelection && selectedItems.value.length > 0) {
      // Vérifier si l'item sélectionné existe toujours
      const exists = flights.value.some(f => f.V_ID === selectedItems.value[0]);
      if (exists) {
        onSelectionChange(selectedItems.value);
      } else {
        selectFirstVisibleRow();
      }
    } else {
      selectFirstVisibleRow();
    }

  } else {
    console.error('Erreur lors du chargement des vols:', result.message);
  }
}

function onSelectionChange(newSelection) {
  if (newSelection && newSelection.length > 0) {
    const readIgc = readIgcFromDb(newSelection[0]);
  }
}

function onFilteredItemsUpdate(items) {
  // items contient uniquement les items de la page actuelle
  // Pour obtenir tous les items filtrés, utiliser filteredFlights.value
  filteredCount.value = filteredFlights.value.length;
  //  console.log('Nombre total de lignes filtrées:', filteredFlights.value.length);
  //  console.log('Duree:', filteredFlights.value[0]?.V_Duree);
  // console.log('Items de la page actuelle:', items.length);  uniquement la page affichée
}

function selectFirstVisibleRow() {
  // Calculer l'index de début de page
  const start = (page.value - 1) * itemsPerPage.value;
  const visibleRows = flights.value.slice(start, start + itemsPerPage.value);
  if (visibleRows.length > 0) {
    selectedItems.value = [visibleRows[0].V_ID];
    onSelectionChange([visibleRows[0].V_ID]);
  }
}

// Charger les vols quand la DB est ouverte
watch(() => databaseStore.hasOpenDatabase, (isOpen) => {
  if (isOpen) {
    loadFlights();
  }
}, { immediate: true });

// Sélectionner la première ligne affichée à chaque changement de page ou d'items-per-page
watch([page, itemsPerPage], () => {
  if (flights.value.length > 0) {
    selectFirstVisibleRow();
  }
});

// Met à jour le commentaire en base, dans flights, et dans dataFlight
function onCommentUpdate({ id, comment }) {
  // Recherche l'ID du vol sélectionné
  const flightId = id || null;
  if (!flightId) return;
  // Mise à jour en base
  const req = `UPDATE Vol SET V_Commentaire = "${comment}" WHERE V_ID = ${flightId}`;
  const result = databaseStore.query(req);
  if (!result.success) {
    console.error('Erreur lors de la mise à jour du commentaire:', result.message);
    snackbarMessage.value = 'Erreur lors de la mise à jour du commentaire';
    snackbar.value = true;
    return;
  }
  // Mise à jour dans flights
  const idx = flights.value.findIndex(f => f.V_ID === flightId);
  if (idx !== -1) {
    flights.value[idx].V_Commentaire = comment;
  }
  // Mise à jour dans dataFlight
  if (dataFlight.value) {
    dataFlight.value.comment = comment;
  }
  snackbarMessage.value = comment ? 'Commentaire enregistré' : 'Commentaire supprimé';
  snackbar.value = true;
  // Signale au parent qu'une modification a eu lieu
  emit('db-updated');
}

// Met à jour la voile (V_Engin) en base, dans flights, et dans dataFlight
function onGliderUpdate({ id, glider }) {
  const flightId = id || dataFlight.value?.decodedIgc?.info?.id || selectedItems.value[0];
  if (!flightId) return;
  const req = `UPDATE Vol SET V_Engin = '${glider}' WHERE V_ID = ${flightId}`;
  const result = databaseStore.query(req);
  if (!result.success) {
    snackbarMessage.value = 'Erreur lors de la mise à jour de la voile';
    snackbar.value = true;
    return;
  }
  // Mise à jour dans flights
  const idx = flights.value.findIndex(f => f.V_ID === flightId);
  if (idx !== -1) {
    flights.value[idx].V_Engin = glider;
  }
  // Mise à jour dans dataFlight
  if (dataFlight.value) {
    dataFlight.value.glider = glider;
  }
  snackbarMessage.value = 'Voile modifiée';
  snackbar.value = true;
  // Signale au parent qu'une modification a eu lieu
  emit('db-updated');
}

// Met à jour le site (V_Site) en base, dans flights, et dans dataFlight
function onSiteUpdate({ id, site }) {
  const flightId = id || dataFlight.value?.decodedIgc?.info?.id || selectedItems.value[0];
  if (!flightId) return;
  const req = `UPDATE Vol SET V_Site = '${site}' WHERE V_ID = ${flightId}`;
  const result = databaseStore.query(req);
  if (!result.success) {
    snackbarMessage.value = 'Erreur lors de la mise à jour du site';
    snackbar.value = true;
    return;
  }
  // Mise à jour dans flights
  const idx = flights.value.findIndex(f => f.V_ID === flightId);
  if (idx !== -1) {
    flights.value[idx].V_Site = site;
  }
  // Mise à jour dans dataFlight
  if (dataFlight.value) {
    dataFlight.value.site = site;
  }
  snackbarMessage.value = 'Site modifié';
  snackbar.value = true;
  // Signale au parent qu'une modification a eu lieu
  emit('db-updated');
}

// Supprime le vol
function onFlightDelete(flightId) {
  if (!flightId) return;

  const req = `DELETE FROM Vol WHERE V_ID = ${flightId}`;
  const result = databaseStore.query(req);

  if (!result.success) {
    snackbarMessage.value = 'Erreur lors de la suppression du vol';
    snackbar.value = true;
    return;
  }

  // Trouver l'index du vol supprimé
  const index = flights.value.findIndex(f => f.V_ID === flightId);

  if (index !== -1) {
    // Supprimer de la liste locale
    flights.value.splice(index, 1);

    // Déterminer la nouvelle sélection
    let newSelectionFnId = null;
    if (flights.value.length > 0) {
      // Si on a supprimé le dernier élément, on prend le précédent
      const newIndex = index < flights.value.length ? index : index - 1;
      if (newIndex >= 0) {
        newSelectionFnId = flights.value[newIndex].V_ID;
      }
    }

    if (newSelectionFnId) {
      selectedItems.value = [newSelectionFnId];
      onSelectionChange([newSelectionFnId]);
    } else {
      selectedItems.value = [];
      dataFlight.value = null;
      decodedTrack.value = null;
    }
  }

  snackbarMessage.value = 'Vol supprimé';
  snackbar.value = true;
  emit('db-updated');
  snackbar.value = true;
  emit('db-updated');
}

// Ouvre la photo du vol dans une modale
async function openPhoto(item) {
  if (!databaseStore.hasOpenDatabase) return;

  const reqSQL = `SELECT V_Photos FROM Vol WHERE V_ID = ${item.V_ID}`;
  const result = databaseStore.query(reqSQL);

  if (result.success && result.data && result.data[0]) {
    const photoData = result.data[0].values[0][0];
    if (photoData) {
      // photoData est une string base64 (compatibilité logfly65)
      photoUrl.value = 'data:image/jpeg;base64,' + photoData;
      photoTitle.value = `${item.Day} ${item.V_Site}`;
      showPhotoViewer.value = true;
    }
  }
}

// Nettoyer l'URL de la photo à la fermeture
watch(showPhotoViewer, (val) => {
  if (!val && photoUrl.value) {
    URL.revokeObjectURL(photoUrl.value);
    photoUrl.value = null;
  }
});

function onPhotoUpdate({ id, photoData }) {
  const flightId = id || dataFlight.value?.decodedIgc?.info?.id || selectedItems.value[0];
  if (!flightId) return;

  let result;
  if (photoData) {
    // Update avec string base64
    result = databaseStore.update(
      `UPDATE Vol SET V_Photos = ? WHERE V_ID = ${flightId}`,
      [photoData]
    );
  } else {
    // Delete (set null)
    result = databaseStore.query(`UPDATE Vol SET V_Photos = NULL WHERE V_ID = ${flightId}`);
  }

  if (!result.success) {
    snackbarMessage.value = 'Erreur lors de la mise à jour de la photo';
    snackbar.value = true;
    return;
  }

  // Update lists
  const idx = flights.value.findIndex(f => f.V_ID === flightId);
  if (idx !== -1) {
    flights.value[idx].Photo = photoData ? 'Yes' : null;
  }

  if (dataFlight.value && dataFlight.value.dbId === flightId) {
    dataFlight.value.hasPhoto = !!photoData;
  }

  snackbarMessage.value = photoData ? 'Photo ajoutée' : 'Photo supprimée';
  snackbar.value = true;
  emit('db-updated');
}

function onTagUpdate({ id, tag }) {
  const flightId = id || dataFlight.value?.dbId;
  if (!flightId) return;

  const tagVal = tag === null ? 'NULL' : tag;
  const req = `UPDATE Vol SET V_Tag = ${tagVal} WHERE V_ID = ${flightId}`;
  const result = databaseStore.query(req);

  if (!result.success) {
    console.error('Error updating tag', result.message);
    return;
  }

  // Update lists
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
  if (dataFlight.value) {
    showFullMap.value = true;
  }
}

function onFullMapClose() {
  showFullMap.value = false;
  // Recharger la liste pour prendre en compte les modifs (durée, IGC...)
  // et forcer le rafraîchissement de la sélection
  loadFlights(true);
}

function onOpenFlyXc() {
  console.log('Open FlyXC requested');
}

function onOpenAnalyze() {
  console.log('Open Analyze requested');
}

async function readIgcFromDb(flightId) {
  // Fonction fictive pour lire et analyser le contenu IGC
  if (!databaseStore.hasOpenDatabase) return;
  const reqSQL = `SELECT V_IGC, strftime('%d-%m-%Y',V_date) AS Day, V_Site, V_Engin, V_Commentaire, V_sDuree, CASE WHEN (V_Photos IS NOT NULL AND V_Photos !='') THEN 1 ELSE 0 END as HasPhoto, V_Tag FROM Vol WHERE V_ID = ${flightId}`;
  const result = databaseStore.query(reqSQL);

  if (result.success && result.data && result.data[0]) {
    const strIgc = result.data[0].values[0][0];
    const decodedIgc = await igcDecoding(strIgc)
    if (decodedIgc.success && decodedIgc.data.fixes && decodedIgc.data.fixes.length > 0) {
      decodedTrack.value = decodedIgc.data
      const analyzeIgc = await IgcAnalyze(decodedIgc.data.fixes);
      if (!analyzeIgc.success) {
        console.log(analyzeIgc.message)
        // fileError.value = analyzeIgc.message;
        // fileContent.value = null;
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
          decodedIgc: decodedTrack.value
        }
      }
    }
  } else {
    console.error('Erreur lors du chargement des vols:', result.message);
  }

}

</script>

<style scoped>
.global-logbook {
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 90vh;
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

.no-track-message {
  text-align: center;
  padding: 20px;
}

.right-panel {
  display: flex;
  flex-direction: column;
  padding-right: 70px;
  gap: 10px;
}

.top-block {
  width: 100%;
  height: 8.33%;
  background: #f0f0f0;
  border: 2px solid #333;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 10px 20px;
}

.table-block {
  width: 100%;
  height: 50%;
  background: #f0f0f0;
  border: 2px solid #333;
  border-radius: 10px;
  box-sizing: border-box;
  overflow: auto;
}

.flights-table {
  width: 100%;
  height: 100%;
}

.flights-table tr {
  font-size: 0.85em;
  height: 16px;
}

.flights-table td {
  padding-top: 1px !important;
  padding-bottom: 1px !important;
}

.col-photo {
  width: 7% !important;
}

.col-tag {
  width: 2% !important;
}

.col-day {
  width: 17% !important;
}

.col-hour {
  width: 7% !important;
}

.col-duree {
  width: 8% !important;
}

.col-site {
  width: 30% !important;
}

.col-engin {
  width: 24% !important;
}

.selected-row {
  background-color: #1867C0 !important;
  color: white;
}

.has-comment {
  color: #fbb104 !important;
  /* bleu Vuetify, à ajuster si besoin */
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
  height: 41.67%;
  border: 2px solid #333;
  border-radius: 10px;
  box-sizing: border-box;
  overflow: hidden;
}

@media (max-width: 900px) {
  .global-logbook {
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
    margin-bottom: 2vw;
  }
}
</style>