<template>
  <v-dialog v-model="dialog" persistent max-width="500">
    <v-card :loading="loading">
      <!--
      <v-card-title class="pa-2 d-flex justify-end">
        <v-btn icon="mdi-information-outline" variant="text" density="comfortable" color="grey-darken-1"
          @click="displayInfo"></v-btn>
      </v-card-title>
-->
      <v-card-text>
        <h3 class="text-h6 text-primary mb-4 font-weight-bold">
          <v-icon start color="primary">mdi-database-eye</v-icon>
          {{ $gettext('Existing logbook') }}
          <span> <v-btn icon="mdi-information-outline" variant="text" density="comfortable" color="grey-darken-1"
              @click="displayInfo"></v-btn></span>
        </h3>
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>

        <v-btn block color="primary" prepend-icon="mdi-folder-search" @click="handlePickDirectory" :disabled="loading">
          {{ hasFileSystemApi ? $gettext('Choose a folder') : $gettext('Open a .db file') }}
        </v-btn>

        <v-btn v-if="currentFile && availableFiles.length === 0" variant="text" block class="mt-4"
          @click="reconnectLastFile">
          {{ $gettext('Reopen') }} {{ currentFile.name }}
        </v-btn>

        <!-- Fallback input for standard file selection -->
        <input ref="fileInput" type="file" accept=".db,.sqlite" style="display: none"
          @change="handleFallbackFileSelection">

        <v-slide-y-transition>
          <div v-if="availableFiles.length > 0" class="mt-6">
            <div class="text-caption mb-2">{{ $gettext('Logbooks detected') }} :</div>
            <v-select :items="sortedAvailableFiles" item-title="name" :label="$gettext('Select a logbook')"
              prepend-inner-icon="mdi-database" return-object variant="outlined"
              @update:model-value="handleFileSelection"></v-select>
          </div>
        </v-slide-y-transition>

        <v-divider class="my-6"></v-divider>

        <!-- Création nouveau logbook -->
        <h3 class="text-h6 text-success mb-4 font-weight-bold">
          <v-icon start color="success">mdi-database-plus</v-icon>
          {{ $gettext('New logbook') }}
        </h3>

        <v-text-field v-model="newLogbookName" :label="$gettext('Enter a name and click the Create button')"
          prepend-inner-icon="mdi-database-minus" variant="outlined" density="compact" class="mb-2" hide-details
          placeholder="mylogbook.db"></v-text-field>
        <v-btn block color="success" prepend-icon="mdi-plus-circle" @click="handleCreateNewLogbook"
          :disabled="loading || !newLogbookName">
          {{ $gettext('Create new logbook') }}
        </v-btn>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" color="grey-darken-1" @click="closeDialog">
          {{ $gettext('Cancel') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-snackbar v-model="showInfo" timeout="8000" color="info" location="bottom">
      {{ infoMessage }}
      <template v-slot:actions>
        <v-btn variant="text" @click="showInfo = false">
          {{ $gettext('Close') }}
        </v-btn>
      </template>
    </v-snackbar>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useGettext } from "vue3-gettext";
import { useDatabaseStore } from '@/stores/database'
import { useRouter } from 'vue-router';
// Importation de notre nouveau service
import * as logbookService from '@/js/database/logbookService';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const databaseStore = useDatabaseStore();
const router = useRouter();
const error = ref('');
const loading = ref(false);
const showInfo = ref(false);
const infoMessage = ref('');
const newLogbookName = ref('');

const { $gettext } = useGettext();
const emit = defineEmits(['db-opened', 'close']);

const fileInput = ref(null);
const hasFileSystemApi = 'showDirectoryPicker' in window;

// La modale s'affiche si show est true ET que la base n'est pas ouverte
const dialog = computed(() => props.show && !databaseStore.hasOpenDatabase);

// Accès aux variables réactives du service
const { availableFiles, isReady, currentFile, dirHandle } = logbookService;

const sortedAvailableFiles = computed(() => {
  return [...availableFiles.value].sort((a, b) => a.name.localeCompare(b.name));
});

onMounted(async () => {
  // Tente de restaurer les handles au montage (IndexedDB)
  await logbookService.initPersistence();
});

function closeDialog() {
  emit('close');
  router.push({ name: 'home' });
}

function displayInfo() {
  let msg = $gettext('In previous versions of Logfly');
  msg += ', ' + $gettext('the default logbook folder was Documents/Logfly');
  msg += '. ' + $gettext('The default logbook was logfly.db') + '.';
  infoMessage.value = msg;
  showInfo.value = true;
}

/**
 * Création d'un nouveau logbook
 */
async function handleCreateNewLogbook() {
  error.value = '';
  loading.value = true;

  try {
    // Ajouter .db si non présent
    let filename = newLogbookName.value.trim();
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      filename = filename.substring(0, lastDotIndex);
    }
    filename += '.db';

    // Créer la nouvelle base de données
    const result = await databaseStore.createNewLogbook(filename);
    if (!result.success) {
      error.value = result.error || $gettext('Error creating the logbook');
      loading.value = false;
      return;
    }

    // Exporter et sauvegarder le fichier
    const data = await databaseStore.exportDatabase();
    const blob = new Blob([data], { type: 'application/x-sqlite3' });

    if ('showSaveFilePicker' in window) {
      // API File System Access - Ouvrir un sélecteur de sauvegarde
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'SQLite Database',
            accept: { 'application/x-sqlite3': ['.db'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        // Confirmer et enregistrer le handle pour autosave futur
        await logbookService.confirmFile(handle);
      } catch (saveErr) {
        if (saveErr.name === 'AbortError') {
          // L'utilisateur a annulé -> on reste dans le dialog
          loading.value = false;
          return;
        }
        throw saveErr;
      }
    } else {
      // Fallback : téléchargement classique
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      // Mode fallback - pas de handle
      logbookService.setFallbackFile({ name: filename });
    }

    // Succès - Émettre l'événement et naviguer vers ImportView
    emit('db-opened');
    newLogbookName.value = '';
    router.push({ name: 'import' });

  } catch (err) {
    error.value = err.message || $gettext('Error creating the logbook');
    console.error('Erreur création logbook:', err);
  } finally {
    loading.value = false;
  }
}

/**
 * Étape 1 : Ouvrir le dossier et scanner les fichiers
 */
async function handlePickDirectory() {
  error.value = '';

  // Fallback si API non supportée
  if (!hasFileSystemApi) {
    fileInput.value.click();
    return;
  }

  try {
    loading.value = true;
    await logbookService.pickFolder();
    if (availableFiles.value.length === 0) {
      error.value = $gettext('No logbook found in this folder');
    }
  } catch (err) {
    if (err.name !== 'AbortError') error.value = err.message;
  } finally {
    loading.value = false;
  }
}

/**
 * Étape 2 : Charger le fichier sélectionné
 */
async function handleFileSelection(fileHandle) {
  try {
    loading.value = true;
    const file = await fileHandle.getFile();
    const result = await databaseStore.loadDatabase(file);

    if (result.success) {
      // Sauvegarder les handles dans IndexedDB pour la persistance et le startIn
      await logbookService.confirmFile(fileHandle);

      emit('db-opened', file.name);
      // La modale se ferme via la computed 'dialog'
    } else {
      error.value = databaseStore.error;
    }
  } catch (err) {
    error.value = $gettext('Error reading the file');
    console.error(err);
  } finally {
    loading.value = false;
  }
}

/**
 * Fallback : Ouvrir sans File System Access API
 */
async function handleFallbackFileSelection(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    loading.value = true;
    const result = await databaseStore.loadDatabase(file);

    if (result.success) {
      // En mode fallback, on ne persiste pas le handle car impossible
      // Mais on prévient le service qu'un fichier est chargé (nom seulement)
      await logbookService.setFallbackFile(file);

      emit('db-opened', file.name);
    } else {
      error.value = databaseStore.error;
    }
  } catch (err) {
    error.value = $gettext('Error reading the file');
    console.error(err);
  } finally {
    loading.value = false;
    // Reset input
    event.target.value = '';
  }
}

/**
 * Cas particulier : Re-charger le dernier fichier connu (si persistence OK)
 */
async function reconnectLastFile() {
  if (currentFile.value) {
    await logbookService.reactivateAccess();
    if (isReady.value) {
      await handleFileSelection(currentFile.value);
    }
  }
}

</script>

<style scoped>
/* Styles de la modale gérés par Vuetify */
</style>