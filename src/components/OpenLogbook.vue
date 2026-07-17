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

        <v-divider class="my-6"></v-divider>

        <!-- Google Drive Option -->
        <h3 class="text-h6 text-info mb-4 font-weight-bold">
          <v-icon start color="info">mdi-google-drive</v-icon>
          {{ $gettext('Google Drive') }}
        </h3>

        <!-- Case 1: Not connected -->
        <div v-if="!gdriveToken">
          <v-btn block color="info" prepend-icon="mdi-google-drive" @click="handleGDriveConnect" :disabled="loading">
            {{ $gettext('Connect to Google Drive') }}
          </v-btn>
        </div>

        <!-- Case 2: Connected -->
        <div v-else>
          <div class="d-flex align-center justify-space-between mb-4">
            <span class="text-subtitle-2 text-success">
              <v-icon color="success" class="mr-1">mdi-check-circle</v-icon>
              {{ $gettext('Connected') }}
            </span>
            <v-btn size="x-small" variant="text" color="error" @click="handleGDriveDisconnect">
              {{ $gettext('Disconnect') }}
            </v-btn>
          </div>

          <!-- List of detected files in GDrive -->
          <div v-if="gdriveFiles.length > 0" class="mb-4">
            <div class="text-caption mb-2">{{ $gettext('Google Drive Logbooks') }} :</div>
            <v-select :items="gdriveFiles" item-title="name" :label="$gettext('Select a logbook')"
              prepend-inner-icon="mdi-database" return-object variant="outlined"
              @update:model-value="handleGDriveFileSelection"></v-select>
          </div>
          <div v-else class="text-caption text-grey mb-4">
            {{ $gettext('No logbooks found on Google Drive. Create one below or upload an existing file.') }}
          </div>

          <!-- Reopen last GDrive file if any -->
          <v-btn v-if="lastGDriveFileId && lastGDriveFileName" variant="text" block class="mb-4"
            @click="handleGDriveReopenLastFile" :disabled="loading">
            {{ $gettext('Reopen') }} {{ lastGDriveFileName }}
          </v-btn>

          <!-- Create new logbook on Google Drive -->
          <v-text-field v-model="newGDriveLogbookName" :label="$gettext('Create new logbook on Google Drive')"
            prepend-inner-icon="mdi-database-plus" variant="outlined" density="compact" class="mb-2" hide-details
            placeholder="logfly.db"></v-text-field>
          <v-btn block color="info" prepend-icon="mdi-plus-circle" @click="handleCreateGDriveLogbook"
            :disabled="loading || !newGDriveLogbookName" class="mb-4">
            {{ $gettext('Create new logbook') }}
          </v-btn>

          <!-- Upload local logbook to Google Drive -->
          <v-btn block variant="outlined" color="info" prepend-icon="mdi-upload" @click="triggerGDriveUpload" :disabled="loading">
            {{ $gettext('Upload a local file to Google Drive') }}
          </v-btn>
          <input ref="gdriveUploadInput" type="file" accept=".db,.sqlite" style="display: none"
            @change="handleGDriveLocalUpload">
        </div>
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
import * as gdriveService from '@/js/database/gdriveService';

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
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const hasFileSystemApi = 'showDirectoryPicker' in window && !isMobile;

// Google Drive refs
const gdriveToken = ref(null);
const gdriveFiles = ref([]);
const newGDriveLogbookName = ref('');
const gdriveUploadInput = ref(null);
const lastGDriveFileId = ref(null);
const lastGDriveFileName = ref(null);

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

  // Intercepter token du hash d'authentification
  let token = null;
  const oauthResponse = gdriveService.handleOAuthResponse();
  if (oauthResponse) {
    token = oauthResponse.token;
    // Redirect back to the starting path if we landed on the root page
    if (oauthResponse.redirectPath && oauthResponse.redirectPath !== window.location.pathname) {
      router.push(oauthResponse.redirectPath);
    }
  } else {
    token = gdriveService.getCachedToken();
  }

  if (token) {
    gdriveToken.value = token;
    lastGDriveFileId.value = localStorage.getItem('gdrive_last_file_id');
    lastGDriveFileName.value = localStorage.getItem('gdrive_last_file_name');
    await fetchGDriveFiles();
  }
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

// Google Drive functions
async function fetchGDriveFiles() {
  if (!gdriveToken.value) return;
  try {
    gdriveFiles.value = await gdriveService.listDriveFiles(gdriveToken.value);
  } catch (err) {
    if (err.message === 'Unauthorized') {
      handleGDriveDisconnect();
      error.value = $gettext('Session expired. Please reconnect to Google Drive.');
    } else {
      error.value = err.message || $gettext('Failed to list files from Google Drive');
    }
  }
}

function handleGDriveConnect() {
  // Save current route path to redirect back later after successful auth
  sessionStorage.setItem('gdrive_redirect_path', window.location.pathname + window.location.search);
  gdriveService.redirectToGoogleAuth();
}

function handleGDriveDisconnect() {
  gdriveService.clearCachedToken();
  gdriveToken.value = null;
  gdriveFiles.value = [];
  lastGDriveFileId.value = null;
  lastGDriveFileName.value = null;
  databaseStore.closeDatabaseStore();
}

async function handleGDriveFileSelection(driveFile) {
  if (!driveFile) return;
  try {
    loading.value = true;
    error.value = '';
    
    const fileId = driveFile.id;
    const fileName = driveFile.name;
    
    const blob = await gdriveService.downloadDriveFile(gdriveToken.value, fileId);
    const result = await databaseStore.loadDatabaseFromGDrive(blob, fileId, fileName, gdriveToken.value);
    
    if (result.success) {
      localStorage.setItem('gdrive_last_file_id', fileId);
      localStorage.setItem('gdrive_last_file_name', fileName);
      emit('db-opened', fileName);
    } else {
      error.value = result.error || $gettext('Error reading the database');
    }
  } catch (err) {
    error.value = err.message || $gettext('Error downloading from Google Drive');
    console.error(err);
  } finally {
    loading.value = false;
  }
}

async function handleGDriveReopenLastFile() {
  if (!lastGDriveFileId.value) return;
  await handleGDriveFileSelection({ id: lastGDriveFileId.value, name: lastGDriveFileName.value });
}

async function handleCreateGDriveLogbook() {
  error.value = '';
  loading.value = true;
  try {
    let filename = newGDriveLogbookName.value.trim();
    if (!filename) return;
    if (!filename.endsWith('.db')) {
      filename += '.db';
    }

    const result = await databaseStore.createNewLogbook(filename);
    if (!result.success) {
      error.value = result.error || $gettext('Error creating the logbook');
      loading.value = false;
      return;
    }

    let uint8Array = await databaseStore.exportDatabase();
    const fileId = await gdriveService.createDriveFile(gdriveToken.value, filename);
    await gdriveService.updateDriveFile(gdriveToken.value, fileId, uint8Array);
    uint8Array = null; // Clean RAM

    databaseStore.isGoogleDrive = true;
    databaseStore.gdriveFileId = fileId;
    databaseStore.gdriveToken = gdriveToken.value;

    localStorage.setItem('gdrive_last_file_id', fileId);
    localStorage.setItem('gdrive_last_file_name', filename);

    emit('db-opened', filename);
    newGDriveLogbookName.value = '';
    router.push({ name: 'import' });
  } catch (err) {
    error.value = err.message || $gettext('Error creating logbook on Google Drive');
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function triggerGDriveUpload() {
  if (gdriveUploadInput.value) {
    gdriveUploadInput.value.click();
  }
}

async function handleGDriveLocalUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  error.value = '';
  loading.value = true;
  try {
    const result = await databaseStore.loadDatabase(file);
    if (!result.success) {
      error.value = result.error || $gettext('Error reading local file');
      loading.value = false;
      return;
    }

    let uint8Array = await databaseStore.exportDatabase();
    const fileId = await gdriveService.createDriveFile(gdriveToken.value, file.name);
    await gdriveService.updateDriveFile(gdriveToken.value, fileId, uint8Array);
    uint8Array = null; // Clean RAM

    databaseStore.isGoogleDrive = true;
    databaseStore.gdriveFileId = fileId;
    databaseStore.gdriveToken = gdriveToken.value;

    localStorage.setItem('gdrive_last_file_id', fileId);
    localStorage.setItem('gdrive_last_file_name', file.name);

    await fetchGDriveFiles();
    emit('db-opened', file.name);
  } catch (err) {
    error.value = err.message || $gettext('Error uploading to Google Drive');
    console.error(err);
  } finally {
    loading.value = false;
    event.target.value = '';
  }
}

</script>

<style scoped>
/* Styles de la modale gérés par Vuetify */
</style>