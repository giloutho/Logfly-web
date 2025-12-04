<template>
  <div class="import-view">
    <header>
      <h1>{{ $gettext('Importer des Traces GPS') }}</h1>
      <p>{{ $gettext('Sélectionnez un ou plusieurs fichiers de trace (IGC, GPX, etc.) depuis votre ordinateur pour les ajouter à votre carnet de vols.') }}</p>
    </header>
    
    <section class="import-area">
      <div class="drop-zone" @click="triggerFileInput">
        <p>{{ $gettext('Glissez et déposez vos fichiers ici, ou cliquez pour sélectionner.') }}</p>
        <input type="file" multiple @change="handleFileUpload" ref="fileInput" hidden />
      </div>
    </section>

    <section class="file-list" v-if="files.length > 0">
      <h2>{{ $gettext('Fichiers à importer :') }}</h2>
      <ul>
        <li v-for="file in files" :key="file.name">{{ file.name }} ({{ (file.size / 1024).toFixed(2) }} KB)</li>
      </ul>
      <v-btn color="primary">{{ $gettext('Lancer l\'importation') }}</v-btn>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';

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