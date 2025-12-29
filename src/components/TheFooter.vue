<template>
  <div class="the-footer">
    <v-divider></v-divider>
    <div class="footer-content">
      <span class="footer-version">v{{ version }}</span>

      <!-- Language selector -->
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="outlined" size="default" class="footer-lang-btn">
            <span class="flag-emoji">{{ langFlags[currentLangCode] }}</span>
            {{ currentLangCode.toUpperCase() }}
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item v-for="(label, code) in availableLangs" :key="code" :value="code"
            :class="{ 'v-list-item--active': code === currentLangCode }" @click="changeLanguage(code)">
            <template v-slot:prepend>
              <span class="flag-emoji mr-2">{{ langFlags[code] }}</span>
            </template>
            <v-list-item-title>{{ label }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-chip class="footer-db" color="primary" variant="outlined" size="small">
        {{ dbPath || $gettext('No logbook opened') }}
      </v-chip>

      <v-btn v-if="databaseStore.hasOpenDatabase" :color="databaseStore.isDirty ? 'error' : 'success'"
        :loading="isSaving" density="compact" @click="handleManualSave" class="footer-save-btn">
        <v-icon start>{{ databaseStore.isDirty ? 'mdi-alert-outline' : 'mdi-check-bold' }}</v-icon>
        {{ databaseStore.isDirty ? $gettext('To be saved') : $gettext('Saved') }}
      </v-btn>
    </div>

    <v-snackbar v-model="showSnack" :timeout="2000" color="success" density="compact">
      {{ snackText }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { useGettext } from 'vue3-gettext';
import { useDatabaseStore } from '@/stores/database';
import * as logbookService from '@/js/database/logbookService';

const gettext = useGettext();
const { $gettext } = gettext;
const databaseStore = useDatabaseStore();

const props = defineProps({
  version: { type: String, default: '7.0.0' },
  dbPath: { type: String, default: '' }
});

const emit = defineEmits(['save', 'saved']);

const isSaving = ref(false);
const showSnack = ref(false);
const snackText = ref('');

// Language management
const availableLangs = computed(() => gettext.available);
const currentLangCode = computed(() => gettext.current);

// Country flag emojis for each language code
const langFlags = {
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  es: '🇪🇸',
  it: '🇮🇹',
  pt: '🇵🇹',
  nl: '🇳🇱',
  pl: '🇵🇱',
  ru: '🇷🇺',
  ja: '🇯🇵',
  zh: '🇨🇳'
};

function changeLanguage(code) {
  gettext.current = code;
  // Persist choice in localStorage
  localStorage.setItem('logfly-language', code);
}

// On mount, check if user has a saved language preference
onMounted(() => {
  const savedLang = localStorage.getItem('logfly-language');
  if (savedLang && gettext.available[savedLang]) {
    gettext.current = savedLang;
  }
});

/**
 * LOGIQUE D'AUTOSAVE
 * On surveille isDirty directement depuis le store
 */
watch(() => databaseStore.isDirty, async (newValue) => {
  if (newValue === true && logbookService.isReady.value) {
    // Petit debounce naturel ou immédiat ?
    // Pour l'instant immédiat mais attention aux rafales
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

    snackText.value = $gettext('Auto-saved logbook');
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

  // Mode Fallback : Téléchargement direct du fichier
  if (logbookService.isFallbackMode.value) {
    try {
      isSaving.value = true;
      const data = await databaseStore.exportDatabase();

      // Criar um blob e disparar download
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = databaseStore.dbName || 'logfly.db';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // On considère que c'est sauvegardé (même si c'est un download)
      databaseStore.markAsSaved();
      snackText.value = $gettext('File successfully downloaded');
      showSnack.value = true;
    } catch (err) {
      console.error("Export failed:", err);
      snackText.value = $gettext('Error downloading file');
      showSnack.value = true;
    } finally {
      isSaving.value = false;
    }
    return;
  }

  if (databaseStore.isDirty) {
    // Si rouge : on enregistre les modifs actuelles
    await runAutoSave();
  } else {
    // Si vert : on propose de créer une copie (Backup)
    try {
      isSaving.value = true;
      const data = await databaseStore.exportDatabase();
      // Ceci ouvrira le dossier A et demandera un nouveau nom de fichier
      await logbookService.backupDatabase(data);
      snackText.value = $gettext('Backup copy created');
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

.footer-version {
  font-size: 0.95em;
  color: #888;
}

.footer-db {
  margin: 0 12px;
  max-width: 40vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

.footer-lang-btn {
  margin-left: 12px;
  text-transform: none;
  font-size: 0.95em;
  min-width: 80px;
}

.flag-emoji {
  font-size: 1.2em;
  margin-right: 6px;
}

.footer-save-btn {
  min-width: 140px;
}
</style>