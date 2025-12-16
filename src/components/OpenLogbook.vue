<template>
  <v-dialog v-model="dialog" persistent max-width="600">
    <v-card  class="mx-auto" max-width="600">
      <v-card-title class="text-h5 bg-primary">
        {{ $gettext('Logbook') }}
      </v-card-title>
      <v-card-text class="pt-6">
        <div class="text-center mb-0">
          <v-icon size="32" color="primary">mdi-note-text-outline</v-icon>
        </div>
        <p class="text-center mb-4">
            {{ $gettext('No logbook open') }},
            {{ $gettext('Select a logbook (file with .db extension)') }}<br>
            {{ $gettext('In older versions, logbook is in Documents/logfly folder') }}
        </p>
        <v-alert v-if="error" type="error" closable @click:close="error = ''" class="mb-4">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="pb-8">
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="openFileDialog" size="large">
          <v-icon start>mdi-folder-open</v-icon>
          {{ $gettext('Select') }}
        </v-btn>
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useGettext } from "vue3-gettext";
import { useDatabaseStore } from '@/stores/database'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const databaseStore = useDatabaseStore()
const error = ref('')

const { $gettext } = useGettext();

const emit = defineEmits(['db-opened', 'file-handle']);

// La modale s'affiche si show est true ET que la base n'est pas ouverte
const dialog = computed(() => props.show && !databaseStore.hasOpenDatabase);

async function openFileDialog() {
  // Vérifier si l'API File System Access est disponible
  if (!('showOpenFilePicker' in window)) {
    error.value = 'File System Access API non supportée par ce navigateur. Utilisez Chrome, Edge ou Opera.';
    showError.value = true;
    return;
  }

  try {
    databaseStore.clearError();
    
    // Ouvrir le sélecteur de fichiers
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'SQLite Database',
          accept: {
            'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3']
          }
        }
      ],
      multiple: false
    });

    // Obtenir le fichier depuis le handle
    const file = await fileHandle.getFile();
    
    // Charger la base de données
    const result = await databaseStore.loadDatabase(file);
    
    if (result.success) {
      // Émettre le nom du fichier et le handle pour une réutilisation ultérieure
      emit('db-opened', file.name);
      emit('file-handle', fileHandle);
      // La modale se fermera automatiquement car hasOpenDatabase devient true
    } else {
      error.value = databaseStore.error;
    }
  } catch (err) {
    // L'utilisateur a annulé ou une erreur s'est produite
    if (err.name !== 'AbortError') {
      error.value = `Erreur lors de l'ouverture du fichier: ${err.message}`;
      console.error('Erreur showOpenFilePicker:', err);
    }
  }
}

</script>

<style scoped>
/* Styles de la modale gérés par Vuetify */
</style>