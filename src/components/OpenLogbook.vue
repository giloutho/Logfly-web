<template>
  <v-dialog v-model="dialog" persistent max-width="500">
    <v-card :loading="loading">
      <v-card-title class="pa-4">
        {{ $gettext('Ouverture du Journal') }}
      </v-card-title>

      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>

        <v-btn block color="primary" prepend-icon="mdi-folder-search" @click="handlePickDirectory" :disabled="loading">
          {{ hasFileSystemApi ? $gettext('Choisir le dossier de la base') : $gettext('Ouvrir un fichier .db') }}
        </v-btn>

        <!-- Fallback input for standard file selection -->
        <input ref="fileInput" type="file" accept=".db,.sqlite" style="display: none"
          @change="handleFallbackFileSelection">

        <v-slide-y-transition>
          <div v-if="availableFiles.length > 0" class="mt-6">
            <div class="text-caption mb-2">{{ $gettext('Fichiers détectés :') }}</div>
            <v-select :items="availableFiles" item-title="name" label="Sélectionnez votre base SQLite"
              prepend-inner-icon="mdi-database" return-object variant="outlined"
              @update:model-value="handleFileSelection"></v-select>
          </div>
        </v-slide-y-transition>

        <v-btn v-if="currentFile && availableFiles.length === 0" variant="text" block class="mt-4"
          @click="reconnectLastFile">
          {{ $gettext('Réouvrir') }} {{ currentFile.name }}
        </v-btn>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-btn variant="text" @click="closeDialog">
          {{ $gettext('Annuler') }}
        </v-btn>
      </v-card-actions>
    </v-card>
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

const { $gettext } = useGettext();
const emit = defineEmits(['db-opened', 'close']);

const fileInput = ref(null);
const hasFileSystemApi = 'showDirectoryPicker' in window;

// La modale s'affiche si show est true ET que la base n'est pas ouverte
const dialog = computed(() => props.show && !databaseStore.hasOpenDatabase);

// Accès aux variables réactives du service
const { availableFiles, isReady, currentFile, dirHandle } = logbookService;

onMounted(async () => {
  // Tente de restaurer les handles au montage (IndexedDB)
  await logbookService.initPersistence();
});

function closeDialog() {
  emit('close');
  router.push({ name: 'home' });
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
      error.value = $gettext('Aucun fichier SQLite trouvé dans ce dossier.');
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
    error.value = $gettext('Erreur lors de la lecture du fichier.');
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
    error.value = $gettext('Erreur lors de la lecture du fichier.');
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