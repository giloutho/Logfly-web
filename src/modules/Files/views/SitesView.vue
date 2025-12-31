<template>
  <OpenLogbook :show="true" />
  <div v-if="databaseStore.hasOpenDatabase" class="sites-view">
    <h1 class="text-h5 mb-4">{{ $gettext('Sites management') }}</h1>

    <!-- Action buttons -->
    <div class="d-flex gap-3 mb-4">
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openNewSiteDialog">
        {{ $gettext('New site') }}
      </v-btn>
    </div>

    <p class="text-body-2 text-medium-emphasis">
      {{ $gettext('Sites management coming soon...') }}
    </p>

    <!-- Site Form Dialog -->
    <SiteFormDialog v-model="showSiteDialog" :site="selectedSite" @submit="handleSiteSubmit"
      @cancel="handleSiteCancel" />

    <!-- Snackbar for feedback -->
    <v-snackbar v-model="showSnackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useGettext } from 'vue3-gettext';
import OpenLogbook from '@/components/OpenLogbook.vue';
import SiteFormDialog from '@/components/SiteFormDialog.vue';
import { useDatabaseStore } from '@/stores/database';

const { $gettext } = useGettext();
const databaseStore = useDatabaseStore();

// Emits
const emit = defineEmits(['dbUpdated']);

// Dialog state
const showSiteDialog = ref(false);
const selectedSite = ref(null);

// Snackbar state
const showSnackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('success');

/**
 * Open dialog to create a new site
 */
function openNewSiteDialog() {
  selectedSite.value = null;
  showSiteDialog.value = true;
}

/**
 * Open dialog to edit an existing site
 */
function openEditSiteDialog(site) {
  selectedSite.value = site;
  showSiteDialog.value = true;
}

/**
 * Handle site form submission
 */
function handleSiteSubmit(siteData) {
  console.log('Site data submitted:', siteData);

  // TODO: Save to database
  // if (siteData.newsite) {
  //   await insertSite(siteData);
  // } else {
  //   await updateSite(siteData);
  // }

  snackbarMessage.value = siteData.newsite
    ? $gettext('Site created successfully')
    : $gettext('Site updated successfully');
  snackbarColor.value = 'success';
  showSnackbar.value = true;
}

/**
 * Handle site form cancel
 */
function handleSiteCancel() {
  console.log('Site form cancelled');
}
</script>

<style scoped>
.sites-view {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}
</style>