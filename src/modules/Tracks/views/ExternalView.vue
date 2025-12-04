<template>
  <div class="external-view">
    <header>
      <h1>{{ $gettext('External track') }}</h1>
      <p>{{ $gettext('Analyze a track file without importing it into your logbook') }}</p>
    </header>

    <section class="upload-area">
      <div class="drop-zone" @click="triggerFileInput">
        <p>{{ $gettext('Drag and drop your file here') }} {{ $gettext('or click to select') }}</p>
        <input type="file" @change="handleFileSelect" ref="fileInput" hidden />
      </div>
    </section>

    <section v-if="fileName">
      <h2>{{ $gettext('Analyse de :') }} {{ fileName }}</h2>
      <div v-if="fileError" style="color: red;">{{ fileError }}</div>
      <div v-else-if="fileContent">
        <p>{{ $gettext('Fichier décodé et vérifié avec succès.') }}</p>
        <!-- Ajoutez ici l'affichage des résultats ou des graphiques -->
      </div>
      <div v-else>
        <p>{{ $gettext('Décodage et vérification en cours...') }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useGettext } from "vue3-gettext";

const { $gettext } = useGettext();

import { igcDecoding } from '@/js/igc/igc-decoder.js';

const fileName = ref('');
const fileInput = ref(null);
const fileContent = ref(null);
const fileError = ref('');

function triggerFileInput() {
  fileInput.value.click();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    fileName.value = file.name;
    validateFile(file);
  }
}

function validateFile(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const content = e.target.result;
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext !== 'gpx' && ext !== 'igc') { 
        fileError.value = $gettext("GPX or IGC format only");
        fileContent.value = null;
      } else {
        fileContent.value = content;
        fileError.value = '';
        if (ext === 'gpx') {
          // transformation en igc
          // si la transfo a échoué on déclenche une erreur
        }
        console.log('fileContent reçu')
        const decodedIgc = await igcDecoding(fileContent.value)
        console.log('decodedIgc reçu')
        if (decodedIgc.success && decodedIgc.data.fixes && decodedIgc.data.fixes.length > 0) {
          console.log('decodedIgc:', decodedIgc);
        } else {
          console.log(decodedIgc.message)
        }
      }
    } catch (err) {
      fileError.value = $gettext('Decoding problem in track file');
      fileContent.value = null;
    }
  };
  reader.readAsText(file);
}
</script>

<style scoped>
.external-view {
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