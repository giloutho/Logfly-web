<template>
  <OpenLogbook :show="true" />
  <div v-if="databaseStore.hasOpenDatabase" class="import-view">
    <header>
      <h1>{{ $gettext('Importer des Traces GPS') }}</h1>      
    </header>    
  </div>
</template>

<script setup>
import { ref } from 'vue';
import OpenLogbook from '@/components/OpenLogbook.vue';
import { useDatabaseStore } from '@/stores/database';

const databaseStore = useDatabaseStore();
const files = ref([]);
const fileInput = ref(null);

function triggerFileInput() {
  fileInput.value.click();
}

function handleFileUpload(event) {
  files.value = Array.from(event.target.files);
}
</script>

<style scoped>
.import-view {
  padding: 20px;
}
.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 10px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  background-color: #f9f9f9;
  margin-bottom: 20px;
}
</style>