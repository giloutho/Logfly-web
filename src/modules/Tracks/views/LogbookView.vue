<template>
  <OpenLogbook v-if="!databaseStore.hasOpenDatabase" />
  <div v-else class="global-logbook">
    <div class="left-panel">
      <p>Base de données : {{ databaseStore.dbName }}</p>
      <p>1/2 largeur écran disponible</p>
    </div>
    <div class="right-panel">
      <div class="top-block">
        <p>1/12 hauteur écran disponible</p>
      </div>
      <div class="table-block">
        <v-data-table
          v-model="selectedItems"
          :headers="headers"
          :items="flights"
          item-value="V_ID"
          show-select
          single-select
          density="compact"
          class="flights-table"
          @update:model-value="onSelectionChange"
        >
          <template v-slot:item.Photo="{ item }">
            <v-icon v-if="item.Photo === 'Yes'" size="small" color="primary">mdi-camera</v-icon>
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
import { ref, watch } from 'vue';
import OpenLogbook from '@/components/OpenLogbook.vue';
import { useDatabaseStore } from '@/stores/database';

const databaseStore = useDatabaseStore();

const flights = ref([]);
const selectedItems = ref([]);

const headers = [
  { title: '', key: 'Photo', sortable: false, width: '50px' },
  { title: 'Tag', key: 'V_Tag', width: '80px' },
  { title: 'Date', key: 'Day', width: '100px' },
  { title: 'Heure', key: 'Hour', width: '80px' },
  { title: 'Durée', key: 'Duree', width: '80px' },
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

    // Sélectionner la première ligne par défaut
    if (flights.value.length > 0) {
      selectedItems.value = [flights.value[0].V_ID];
      console.log('Première ligne sélectionnée, ID:', flights.value[0].V_ID);
    }
  } else {
    console.error('Erreur lors du chargement des vols:', result.message);
  }
}

function onSelectionChange(newSelection) {
  if (newSelection && newSelection.length > 0) {
    console.log('ID sélectionné:', newSelection[0]);
  }
}

// Charger les vols quand la DB est ouverte
watch(() => databaseStore.hasOpenDatabase, (isOpen) => {
  if (isOpen) {
    loadFlights();
  }
}, { immediate: true });
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
  background: lightgreen;
  border: 2px solid #333;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
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