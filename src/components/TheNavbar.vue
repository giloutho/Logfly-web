<template>
  <v-app-bar color="primary" dark app flat translate="no">
    <v-toolbar-title>
      <router-link :to="{ name: 'home' }" class="app-title-link">
        <img src="@/assets/Logowebwh.png" alt="Logo Logfly"
          style="vertical-align: middle; margin-right: 8px; height: 48px;" />
        Logfly
      </router-link>
    </v-toolbar-title>

    <v-spacer></v-spacer>

    <div class="d-none d-sm-flex align-center">
      <!-- Navigation menus -->
      <v-menu offset-y translate="no">
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props">
            {{ $gettext('Flights & Tracks') }}
          </v-btn>
        </template>
        <v-list>
          <v-list-item :to="{ name: 'logbook-view' }">
            <v-list-item-title>{{ $gettext('Logbook') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'import-gps' }">
            <v-list-item-title>{{ $gettext('Import tracks') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'external-track' }">
            <v-list-item-title>{{ $gettext('External track') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-menu offset-y translate="no">
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props">
            {{ $gettext('Statistics') }}
            <v-icon right>mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item :to="{ name: 'synthese-annee' }">
            <v-list-item-title>{{ $gettext('Annual summary') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'synthese-globale' }">
            <v-list-item-title>{{ $gettext('Global summary') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-menu offset-y translate="no">
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props">
            {{ $gettext('Routing') }}
            <v-icon right>mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item :to="{ name: 'waypoints-view' }">
            <v-list-item-title>{{ $gettext('Waypoints') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'airspaces-view' }">
            <v-list-item-title>{{ $gettext('Airspaces') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'xcnav-view' }">
            <v-list-item-title>{{ $gettext('XC Nav') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-menu offset-y translate="no">
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props">
            {{ $gettext('Sites') }}
            <v-icon right>mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item :to="{ name: 'sites-view' }">
            <v-list-item-title>{{ $gettext('Sites') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-btn text :to="{ name: 'equip-base' }">
        {{ $gettext('Equipment') }}
      </v-btn>

      <v-menu offset-y translate="no">
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props">
            {{ $gettext('Utilities') }}
            <v-icon right>mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item :to="{ name: 'support-view' }">
            <v-list-item-title>{{ $gettext('Support') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'translation-view' }">
            <v-list-item-title>{{ $gettext('Translation') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <!-- Divider -->
      <v-divider vertical class="mx-2" style="opacity: 0.3;" />

      <!-- Language selector -->
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="text" size="small" class="lang-btn" :title="$gettext('Change language')">
            <span class="flag-emoji">{{ langFlags[currentLangCode] }}</span>
            <span class="lang-code">{{ currentLangCode.toUpperCase() }}</span>
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

      <!-- Save button (when DB open) -->
      <v-btn v-if="databaseStore.hasOpenDatabase" :color="databaseStore.isDirty ? 'warning' : 'success'" variant="tonal"
        size="small" class="ml-1 save-btn" :loading="isSaving" @click="handleSave"
        :title="databaseStore.isDirty ? $gettext('Unsaved changes – click to save') : $gettext('All changes saved')">
        <v-icon start>{{ databaseStore.isDirty ? 'mdi-alert-outline' : 'mdi-check-bold' }}</v-icon>
        {{ databaseStore.isDirty ? $gettext('Save') : $gettext('Saved') }}
      </v-btn>
    </div>

    <v-app-bar-nav-icon class="d-sm-none"></v-app-bar-nav-icon>
  </v-app-bar>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useGettext } from 'vue3-gettext';
import { useDatabaseStore } from '@/stores/database';
import * as logbookService from '@/js/database/logbookService';

const gettext = useGettext();
const { $gettext } = gettext;
const databaseStore = useDatabaseStore();

const props = defineProps({
  isDirty: { type: Boolean, default: false },
  dbPath: { type: String, default: '' }
});

const emit = defineEmits(['save']);

// Language management
const availableLangs = computed(() => gettext.available);
const currentLangCode = computed(() => gettext.current);

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
  localStorage.setItem('logfly-language', code);
}

onMounted(() => {
  const savedLang = localStorage.getItem('logfly-language');
  if (savedLang && gettext.available[savedLang]) {
    gettext.current = savedLang;
  }
});

// Save logic
const isSaving = ref(false);
const showSnack = ref(false);
const snackText = ref('');

// Auto-save when isDirty changes
watch(() => databaseStore.isDirty, async (newValue) => {
  if (newValue === true && logbookService.isReady.value) {
    await runAutoSave();
  }
});

async function runAutoSave() {
  try {
    isSaving.value = true;
    const data = await databaseStore.exportDatabase();
    await logbookService.autoSave(data);
    databaseStore.markAsSaved();
  } catch (err) {
    console.error('Autosave failed:', err);
  } finally {
    isSaving.value = false;
  }
}

async function handleSave() {
  await logbookService.reactivateAccess();

  if (logbookService.isFallbackMode.value) {
    try {
      isSaving.value = true;
      const data = await databaseStore.exportDatabase();
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = databaseStore.dbName || 'logfly.db';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      databaseStore.markAsSaved();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      isSaving.value = false;
    }
    return;
  }

  if (databaseStore.isDirty) {
    await runAutoSave();
  } else {
    try {
      isSaving.value = true;
      const data = await databaseStore.exportDatabase();
      await logbookService.backupDatabase(data);
    } catch (e) {
      // Annulation du sélecteur
    } finally {
      isSaving.value = false;
    }
  }
}
</script>

<style lang="scss" scoped>
.app-title-link {
  color: inherit;
  text-decoration: none;
}

.lang-btn {
  text-transform: none;
  font-size: 0.9em;
  min-width: 70px;
}

.flag-emoji {
  font-size: 1.1em;
  margin-right: 4px;
}

.lang-code {
  font-size: 0.85em;
}

.save-btn {
  font-size: 0.85em;
}
</style>