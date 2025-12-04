<template>
  <!-- Affiche le composant d'analyse si les données sont prêtes -->
  <div v-if="analysisResult" class="fullmap-container">
    <TrackAnalysis 
      :analysis-data="analysisResult" 
      @close="closeAnalysisView" 
    />
  </div>
  
  <!-- Sinon, affiche la vue d'upload de fichier -->
  <div v-else class="external-view">
    <div class="external-view-content">
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
        <v-alert v-if="fileError" type="error" dismissible>
          {{ fileError }}
        </v-alert>
        <div v-else>
          <p>{{ $gettext('Décodage et vérification en cours...') }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useGettext } from "vue3-gettext";

import TrackAnalysis from '@/components/TrackAnalysis.vue';
import FullmapTrack from '@/components/FullmapTrack.vue';

const { $gettext } = useGettext();

import { igcDecoding } from '@/js/igc/igc-decoder.js';
import { IgcAnalyze } from '@/js/igc/igc-analyzer.js';

const fileName = ref('');
const fileInput = ref(null);
const fileContent = ref(null);
const fileError = ref('');
const analysisResult = ref(null);

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

function closeAnalysisView() {
  analysisResult.value = null;
  fileName.value = '';
  fileContent.value = null;
  fileError.value = '';
  // Réinitialise le champ de fichier pour permettre de re-sélectionner le même fichier
  if (fileInput.value) {
    fileInput.value.value = '';
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
        const decodedIgc = await igcDecoding(fileContent.value)
        if (decodedIgc.success && decodedIgc.data.fixes && decodedIgc.data.fixes.length > 0) {
          console.log('decodedIgc ok, analyze start');
          const analyzeIgc = await IgcAnalyze(decodedIgc.data.fixes);
          if (!analyzeIgc.success) {
            console.log(analyzeIgc.message)
            fileError.value = analyzeIgc.message;
            fileContent.value = null;
          } else {
            analysisResult.value = analyzeIgc.anaTrack;
          }
        } else {
          console.log(decodedIgc.message)
          fileError.value = decodedIgc.message;
          fileContent.value = null;
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
.fullmap-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.external-view {
  padding: 20px;
  display: flex;
  justify-content: center;
}
.external-view-content {
  max-width: 800px;
  width: 100%;
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