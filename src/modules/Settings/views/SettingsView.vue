<template>
  <v-card flat class="settings-card">
    <div class="settings-content">
      <!-- Header -->
      <div class="settings-header">
        <div class="icon-container">
          <v-icon size="48" color="white">mdi-cog</v-icon>
        </div>
        <h1 class="settings-title">{{ $gettext('Settings') }}</h1>
        <p class="settings-subtitle">{{ $gettext('Configure your preferences') }}</p>
      </div>

      <!-- Form -->
      <v-form ref="settingsForm" class="settings-form">
        <v-row>
          <!-- Champ 1 : Démarrage -->
          <v-col cols="12" md="6">
            <v-select v-model="form.startPage" :items="startPageItems" :label="$gettext('Startup')" item-title="label"
              item-value="value" variant="outlined" density="comfortable" prepend-inner-icon="mdi-rocket-launch"
              hide-details="auto" class="mb-2">
            </v-select>
          </v-col>

          <!-- Champ 2 : Langue -->
          <v-col cols="12" md="6">
            <v-select v-model="form.language" :items="languageItems" :label="$gettext('Language')" item-title="label"
              item-value="value" variant="outlined" density="comfortable" prepend-inner-icon="mdi-translate"
              hide-details="auto" class="mb-2">
            </v-select>
          </v-col>

          <!-- Champ 3 : Nom pilote -->
          <v-col cols="12" md="6">
            <v-text-field v-model="form.pilotName" :label="$gettext('Pilot name')" variant="outlined"
              density="comfortable" prepend-inner-icon="mdi-account" hide-details="auto" class="mb-2"
              @input="form.pilotName = form.pilotName.toUpperCase()">
            </v-text-field>
          </v-col>

          <!-- Champ 4 : Nom voile -->
          <v-col cols="12" md="6">
            <v-text-field v-model="form.gliderName" :label="$gettext('Glider name')" variant="outlined"
              density="comfortable" prepend-inner-icon="mdi-paragliding" hide-details="auto" class="mb-2"
              @input="form.gliderName = form.gliderName.toUpperCase()">
            </v-text-field>
          </v-col>

          <!-- Champ 5 : Couche carte par défaut -->
          <v-col cols="12" md="6">
            <v-select v-model="form.defaultMapLayer" :items="mapLayerItems" :label="$gettext('Default map layer')"
              variant="outlined" density="comfortable" prepend-inner-icon="mdi-map" hide-details="auto" class="mb-2">
            </v-select>
          </v-col>

          <!-- Champ 6 : League -->
          <v-col cols="12" md="6">
            <v-select v-model="form.league" :items="leagueItems" :label="$gettext('League')" variant="outlined"
              density="comfortable" prepend-inner-icon="mdi-trophy" hide-details="auto" class="mb-2">
            </v-select>
          </v-col>

          <!-- Champ 7 : Identifiant -->
          <v-col cols="12" md="6">
            <v-text-field v-model="form.leagueId" :label="$gettext('Identifier')" variant="outlined"
              density="comfortable" prepend-inner-icon="mdi-card-account-details" hide-details="auto" class="mb-2">
            </v-text-field>
          </v-col>

          <!-- Champ 8 : Pass -->
          <v-col cols="12" md="6">
            <v-text-field v-model="form.leaguePass" :label="$gettext('Password')" variant="outlined"
              density="comfortable" prepend-inner-icon="mdi-lock" hide-details="auto" class="mb-2"
              :type="showPassword ? 'text' : 'password'" :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword">
            </v-text-field>
          </v-col>
        </v-row>

        <!-- Buttons -->
        <div class="settings-actions">
          <v-btn color="primary" size="large" class="save-btn" :loading="saving" @click="handleSave"
            prepend-icon="mdi-content-save">
            {{ $gettext('Save') }}
          </v-btn>
          <v-btn variant="outlined" size="large" class="reset-btn" @click="handleReset" prepend-icon="mdi-refresh">
            {{ $gettext('Reset') }}
          </v-btn>
        </div>
      </v-form>

      <!-- Snackbar -->
      <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom">
        {{ snackMessage }}
        <template v-slot:actions>
          <v-btn variant="text" @click="snackbar = false">
            {{ $gettext('Close') }}
          </v-btn>
        </template>
      </v-snackbar>
    </div>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useGettext } from 'vue3-gettext';
import {
  loadSettings,
  saveSettings,
  availableMapLayers,
  startPageOptions,
} from '@/js/settings/settingsService';

const gettext = useGettext();
const { $gettext } = gettext;

const saving = ref(false);
const showPassword = ref(false);
const snackbar = ref(false);
const snackMessage = ref('');
const snackColor = ref('success');

// Form data
const form = reactive({
  startPage: 'home',
  language: '',
  pilotName: '',
  gliderName: '',
  defaultMapLayer: 'OpenStreetMap',
  league: 'FFVL',
  leagueId: '',
  leaguePass: '',
});

// Start page dropdown items
const startPageItems = computed(() => [
  { label: $gettext('Home'), value: 'home' },
  { label: $gettext('Logbook'), value: 'logbook' },
  { label: $gettext('Import'), value: 'import' },
]);

// Language dropdown items built from gettext available languages
const languageItems = computed(() => {
  const items = [];
  const available = gettext.available;
  for (const code in available) {
    items.push({ label: available[code], value: code });
  }
  return items;
});

// Map layer dropdown items
const mapLayerItems = availableMapLayers;

// League dropdown items
const leagueItems = ['FFVL', 'XContest'];

// Load settings on mount
onMounted(async () => {
  const saved = await loadSettings();
  Object.assign(form, saved);
});

// Save handler
async function handleSave() {
  saving.value = true;
  try {
    // Apply language change if needed
    if (form.language && form.language !== gettext.current) {
      gettext.current = form.language;
      localStorage.setItem('logfly-language', form.language);
    }

    const success = await saveSettings({ ...form });
    if (success) {
      snackColor.value = 'success';
      snackMessage.value = $gettext('Settings saved successfully');
    } else {
      snackColor.value = 'error';
      snackMessage.value = $gettext('Error saving settings');
    }
  } catch (err) {
    snackColor.value = 'error';
    snackMessage.value = $gettext('Error saving settings');
    console.error(err);
  } finally {
    saving.value = false;
    snackbar.value = true;
  }
}

// Reset handler: reload from IndexedDB
async function handleReset() {
  const saved = await loadSettings();
  Object.assign(form, saved);
  snackColor.value = 'info';
  snackMessage.value = $gettext('Settings restored');
  snackbar.value = true;
}
</script>

<style scoped>
.settings-card {
  width: 100%;
  height: calc(100vh - 120px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  overflow-y: auto;
}

.settings-content {
  width: 100%;
  max-width: 800px;
  padding: 40px 32px;
}

.settings-header {
  text-align: center;
  margin-bottom: 32px;
}

.icon-container {
  width: 96px;
  height: 96px;
  margin: 0 auto 16px auto;
  border-radius: 50%;
  background: linear-gradient(135deg, #1976D2 0%, #1565C0 50%, #0D47A1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(25, 118, 210, 0.3);
}

.settings-title {
  font-size: 2rem;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.settings-subtitle {
  font-size: 1.1rem;
  color: #4a4a6a;
  margin-bottom: 0;
}

.settings-form {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.settings-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 24px;
}

.save-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  letter-spacing: 0.5px;
  padding: 0 32px !important;
  box-shadow: 0 4px 16px rgba(25, 118, 210, 0.3) !important;
  transition: transform 0.2s, box-shadow 0.2s !important;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(25, 118, 210, 0.4) !important;
}

.reset-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  letter-spacing: 0.5px;
  padding: 0 32px !important;
}

@media (max-width: 600px) {
  .settings-content {
    padding: 24px 16px;
  }

  .settings-form {
    padding: 20px 16px;
  }

  .icon-container {
    width: 80px;
    height: 80px;
  }

  .icon-container .v-icon {
    font-size: 40px !important;
  }

  .settings-title {
    font-size: 1.6rem;
  }

  .settings-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>