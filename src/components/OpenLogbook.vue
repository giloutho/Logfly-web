<template>
  <div class="open-logbook">
    <v-btn color="primary" @click="openDialog = true">{{ $gettext('Open logbook') }}</v-btn>
    <v-dialog v-model="openDialog" max-width="500">
      <v-card>
        <v-card-title>{{ $gettext('Select a .db file') }}</v-card-title>
        <v-card-text>
          <input type="file" accept=".db" @change="onFileChange" />
          <v-alert v-if="error" type="warning" title="Error" closable @click:close="databaseStore.clearError()">
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
import { ref, computed } from 'vue';
import { useGettext } from "vue3-gettext";
import { useDatabaseStore } from '@/stores/database'

const databaseStore = useDatabaseStore()
const openDialog = ref(false)
const selectedFile = ref(null)

const { $gettext } = useGettext();

const error = computed(() => databaseStore.error)

function onFileChange(event) {
  selectedFile.value = event.target.files[0]
}

async function loadDatabase() {
  if (!selectedFile.value) return;

  databaseStore.clearError()
  
  const result = await databaseStore.loadDatabase(selectedFile.value)
  
  if (result.success) {
    openDialog.value = false
    selectedFile.value = null
  }
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
