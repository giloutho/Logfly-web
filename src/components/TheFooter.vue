<template>
  <div class="the-footer">
    <v-divider></v-divider>
    <div class="footer-content">
      <span class="footer-version">v{{ version }}</span>
      
      <v-chip class="footer-db" color="primary" variant="outlined" size="small">
        {{ dbPath || $gettext('Aucune base ouverte') }}
      </v-chip>

      <v-btn
        v-if="databaseStore.hasOpenDatabase"
        :color="isDirty ? 'error' : 'success'"
        :loading="isSaving"
        density="compact"
        @click="handleManualSave"
        class="footer-save-btn"
      >
        <v-icon start>{{ isDirty ? 'mdi-alert-outline' : 'mdi-check-bold' }}</v-icon>
        {{ isDirty ? $gettext('To be saved') : $gettext('Saved') }}
      </v-btn>       
    </div>

    <v-snackbar v-model="showSnack" :timeout="2000" color="success" density="compact">
      {{ snackText }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useGettext } from 'vue3-gettext';
import { useDatabaseStore } from '@/stores/database';
import * as logbookService from '@/js/database/logbookService';

const { $gettext } = useGettext();
const databaseStore = useDatabaseStore();

const props = defineProps({
  version: { type: String, default: '1.0.0' },
  isDirty: { type: Boolean, default: false },
  dbPath: { type: String, default: '' }
});

const emit = defineEmits(['save', 'saved']);

const isSaving = ref(false);
const showSnack = ref(false);
const snackText = ref('');

/**
 * LOGIQUE D'AUTOSAVE
 * On surveille la prop isDirty. Si elle devient true, on lance l'enregistrement.
 */
watch(() => props.isDirty, async (newValue) => {
  if (newValue === true && logbookService.isReady.value) {
    await runAutoSave();
  }
});

async function runAutoSave() {
  try {
    isSaving.value = true;
    const data = await databaseStore.exportDatabase(); 
    await logbookService.autoSave(data);
    
    // Appelle l'action du store que nous venons d'ajouter
    databaseStore.markAsSaved(); 
    
    snackText.value = $gettext('Journal auto-enregistré');
    showSnack.value = true;
  } catch (err) {
    console.error("Autosave failed:", err);
  } finally {
    isSaving.value = false;
  }
}

/**
 * SAUVEGARDE MANUELLE (Backup)
 * Si l'utilisateur clique alors que c'est rouge ou s'il veut un backup
 */
async function handleManualSave() {
  await logbookService.reactivateAccess();

  if (props.isDirty) {
    // Si rouge : on enregistre les modifs actuelles
    await runAutoSave();
  } else {
    // Si vert : on propose de créer une copie (Backup)
    try {
      isSaving.value = true;
      const data = await databaseStore.exportDatabase();
      // Ceci ouvrira le dossier A et demandera un nouveau nom de fichier
      await logbookService.backupDatabase(data); 
      snackText.value = $gettext('Copie de sauvegarde créée');
      showSnack.value = true;
    } catch (e) {
      // Annulation du sélecteur de fichier
    } finally {
      isSaving.value = false;
    }
  }
}
</script>

<style scoped>
/* Vos styles d'origine inchangés */
.the-footer {
  width: 100%;
  background: #fafbfc;
  border-top: 1px solid #e0e0e0;
  padding: 0;
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 10;
}
.footer-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px 6px 24px;
  min-height: 40px;
}
.footer-version { font-size: 0.95em; color: #888; }
.footer-db { margin: 0 12px; max-width: 40vw; overflow: hidden; text-overflow: ellipsis; }
.footer-save-btn { min-width: 140px; }
</style>