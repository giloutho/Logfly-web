<template>
  <div class="open-logbook">
    <v-btn color="primary" @click="openDialog = true">{{ $gettext('Open logbook') }}</v-btn>
    <v-dialog v-model="openDialog" max-width="500">
      <v-card>
        <v-card-title>{{ $gettext('Select a .db file') }}</v-card-title>
        <v-card-text>
          <input type="file" accept=".db" @change="onFileChange" />
          <v-alert v-if="error" type="warning" title="Error" closable>
            {{ error }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="openDialog = false">{{ $gettext('Cancel') }}</v-btn>
          <v-btn text @click="loadDatabase" :disabled="!selectedFile">{{ $gettext('Open') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useGettext } from "vue3-gettext";
import { readSqliteFile, openDatabase, executeQuery, closeDatabase, saveDatabase } from '@/js/database/sql-manager.js'

const openDialog = ref(false)
const selectedFile = ref(null)
const loading = ref(false)
const queryResult = ref(null)
const error = ref('')
const db = ref(null)

const { $gettext } = useGettext();

function onFileChange(event) {
  selectedFile.value = event.target.files[0]
}

async function loadDatabase() {
  if (!selectedFile.value) return;

    loading.value = false;
    error.value = ''
    queryResult.value = null
    try {
        const fileBuffer = await readSqliteFile(selectedFile.value)
        db.value = await openDatabase(fileBuffer)
        // Requête de test : Vérifier la présense de la table "Vol"
        const result = executeQuery(db.value, "SELECT name FROM sqlite_master WHERE type='table' AND name='Vol'")
        if (result.success) {
            if (result.data.length === 0) {
                closeDatabase(db.value)
                db.value = null
                throw new Error('The database does not contain a “Vol” table')
            }
            loading.value = true
        } else {
            error.value = result.message || 'Error while executing the open request'           
        }
    } catch (e) {
        error.value = e.message || 'Error loading database'
    } 
    console.log('loading.value : ', loading.value)


//   // Simulate database loading process
//   setTimeout(() => {
//     loading.value = false;
//     openDialog.value = false;
//     // Emit event to notify parent component that DB is opened
//     emit('db-opened', true);
//   }, 2000);
}   

</script>

<style scoped>
.open-logbook {
  padding: 2rem;
  text-align: center;
}
h1 {
  color: #1976d2;
  margin-bottom: 1rem;
}
</style>
