<template>
  <OpenLogbook v-if="!databaseStore.hasOpenDatabase" />
  <div v-else class="global-logbook">
    <div class="left-panel">
      <LittleMapView v-if="decodedTrack && decodedTrack.GeoJSON" :geoJson="decodedTrack.GeoJSON" />
      <div v-else class="no-track-message">
        <p>Base de données : {{ databaseStore.dbName }}</p>
        <p>Sélectionnez un vol pour afficher la trace</p>
      </div>
    </div>
    <div class="right-panel">
      <div class="top-block">
        <v-text-field
          v-model="search"
          :label="$gettext('Search')"
          prepend-inner-icon="mdi-magnify"
          single-line
          hide-details
          clearable
          density="compact"
          variant="outlined"
        ></v-text-field>
      </div>
      <div class="table-block">        
        <v-data-table
          v-model="selectedItems"
          :headers="headers"
          :items="flights"
          :search="search"
          item-value="V_ID"
          density="compact"
          class="flights-table"
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          @update:model-value="onSelectionChange"
          @update:current-items="onFilteredItemsUpdate"
        >
          <template v-slot:item="{ item, index, props }">
            <tr
              v-bind="props"
              :class="{'selected-row': selectedItems.includes(item.V_ID)}"
              @click="selectedItems = [item.V_ID]; onSelectionChange([item.V_ID])"
              style="cursor:pointer;"
            >
              <td class="col-photo">
                <v-icon v-if="item.Photo === 'Yes'" size="small" color="primary">mdi-camera</v-icon>
              </td>
              <td class="col-tag">{{ item.V_Tag }}</td>
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
              <v-pagination
                v-model="page"
                :length="pageCount"
                :total-visible="7"
                size="small"
              ></v-pagination>
            </div>
          </template>
        </v-data-table>
      </div>
      <div class="bottom-block">
        <p>1/2 largeur écran disponible</p>
        <p>5/12 hauteur écran disponible</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGettext } from "vue3-gettext";
import OpenLogbook from '@/components/OpenLogbook.vue';
import LittleMapView from '@/components/LittleMapView.vue';
import { useDatabaseStore } from '@/stores/database';
import { igcDecoding } from '@/js/igc/igc-decoder.js';
import { IgcAnalyze } from '@/js/igc/igc-analyzer.js';

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

const pageCount = computed(() => {
  return Math.ceil(flights.value.length / itemsPerPage.value);
});

// @update:current-items retourne uniquement les items de la page actuelle. 
// Pour obtenir tous les items filtrés (toutes pages confondues), 
// il faut utiliser un computed qui applique manuellement 
// le filtre de recherche sur flights.value.
const filteredFlights = computed(() => {
  if (!search.value) return flights.value;
  
  const searchLower = search.value.toLowerCase();
  return flights.value.filter(flight => {
    return Object.values(flight).some(value => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(searchLower);
    });
  });
});

const headers = [
  { title: '', key: 'Photo', sortable: false},
  { title: 'Tag', key: 'V_Tag'},
  { title: 'Date', key: 'Day' },
  { title: 'Heure', key: 'Hour' },
  { title: 'Durée', key: 'Duree' },
  { title: 'Site', key: 'V_Site' },
  { title: 'Engin', key: 'V_Engin' },
];

function loadFlights() {
  if (!databaseStore.hasOpenDatabase) return;

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

    // Sélectionner la première ligne de la première page
    selectFirstVisibleRow();
    
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
  console.log('Nombre total de lignes filtrées:', filteredFlights.value.length);
  console.log('Duree:', filteredFlights.value[0]?.V_Duree);
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

async function readIgcFromDb(flightId) {
  // Fonction fictive pour lire et analyser le contenu IGC
  console.log('Lecture IGC pour le vol ID:', flightId);
  if (!databaseStore.hasOpenDatabase) return;
  const reqSQL =`SELECT V_IGC, V_LatDeco, V_LongDeco, V_AltDeco, V_Site FROM Vol WHERE V_ID = ${flightId}`;
  const result = databaseStore.query(reqSQL);

  if (result.success && result.data && result.data[0]) {
    const strIgc = result.data[0].values[0][0];
    const decodedIgc = await igcDecoding(strIgc)
    if (decodedIgc.success && decodedIgc.data.fixes && decodedIgc.data.fixes.length > 0) {
      decodedTrack.value = decodedIgc.data
      const analyzeIgc = await IgcAnalyze(decodedIgc.data.fixes);
      if (!analyzeIgc.success) {
        console.log(analyzeIgc.message)
        fileError.value = analyzeIgc.message;
        fileContent.value = null;
      } else {
        console.log('analyzeIgc.anaTrack.bestGain', analyzeIgc.anaTrack.bestGain, 'm')
        console.log('GeoJson ',decodedTrack.value.GeoJSON)
        analysisTrack.value = analyzeIgc.anaTrack;
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

.col-photo   { width: 7% !important; }
.col-tag     { width: 2% !important; }
.col-day     { width: 17% !important; }
.col-hour    { width: 7% !important; }
.col-duree   { width: 8% !important; }
.col-site    { width: 30% !important; }
.col-engin   { width: 24% !important; }

.selected-row {
  background-color: #606eeb !important;
  color: white;
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
  background: #f0f0f0;
  border: 2px solid #333;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
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
  }
}
</style>