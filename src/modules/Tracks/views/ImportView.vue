<template>
  <OpenLogbook :show="true" />
  <div v-if="databaseStore.hasOpenDatabase" class="import-view">
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-text>
              <v-row>
                <!-- GPS USB Menu -->
                <v-col cols="12" md="3">
                  <v-menu offset-y>
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        color="primary"
                        block
                        size="large"
                        prepend-icon="mdi-usb"
                      >
                        GPS USB
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item
                        v-for="device in usbDevices"
                        :key="device"
                        @click="openImportDialog(device, 'usb')"
                      >
                        <v-list-item-title>{{ device }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-col>

                <!-- GPS Serial Menu -->
                <v-col cols="12" md="3">
                  <v-menu offset-y>
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        color="secondary"
                        block
                        size="large"
                        prepend-icon="mdi-serial-port"
                      >
                        GPS Serial
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item
                        v-for="device in serialDevices"
                        :key="device"
                        @click="openImportDialog(device, 'serial')"
                      >
                        <v-list-item-title>{{ device }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-col>

                <!-- Dossier Menu -->
                <v-col cols="12" md="3">
                  <v-menu offset-y>
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        color="success"
                        block
                        size="large"
                        prepend-icon="mdi-folder-open"
                      >
                        Dossier
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item
                        v-for="option in folderOptions"
                        :key="option"
                        @click="openImportDialog(option, 'folder')"
                      >
                        <v-list-item-title>{{ option }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-col>

                <!-- Vol sans trace -->
                <v-col cols="12" md="3">
                  <v-btn
                    color="warning"
                    block
                    size="large"
                    prepend-icon="mdi-airplane-off"
                    @click="openImportDialog($gettext('Flight without GPS'), 'notrace')"
                  >
                    {{ $gettext('Flight without GPS') }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Table des vols scannés -->
    <v-container v-if="showFlightTable" fluid class="mt-10px">
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
              <div>
                <span><b>{{ currentDevice }}</b> : {{ filteredFlights.length }} {{ $gettext('tracks decoded') }}</span>
                <v-checkbox
                  v-model="showAllFlights"
                  label="Afficher tous les vols"
                  hide-details
                  density="compact"
                  class="mt-2"
                />
              </div>
              <div>
                <v-btn
                  color="success"
                  @click="importSelectedFlights"
                  :disabled="!hasSelectedFlights"
                  class="mr-2"
                >
                  <v-icon start>mdi-database-import</v-icon>
                  Importer ({{ selectedFlightsCount }})
                </v-btn>
                <v-btn
                  color="grey"
                  variant="text"
                  @click="closeFlightTable"
                >
                  Fermer
                </v-btn>
              </div>
            </v-card-title>
            <v-card-text>
              <v-data-table
                :headers="flightTableHeaders"
                :items="filteredFlights"
                :items-per-page="6"
                class="elevation-1"
              >
                <!-- Checkbox to-store -->
                <template v-slot:item.toStore="{ item }">
                  <v-checkbox
                    v-model="item.toStore"
                    hide-details
                    :disabled="!item.isValid || item.existsInDB"
                  />
                </template>

                <!-- Date -->
                <template v-slot:item.date="{ item }">
                  <span :class="{ 'text-grey': !item.isValid }">
                    {{ item.date || '-' }}
                  </span>
                </template>

                <!-- Heure décollage -->
                <template v-slot:item.takeoffTime="{ item }">
                  <span :class="{ 'text-grey': !item.isValid }">
                    {{ item.takeoffTime || '-' }}
                  </span>
                </template>

                <!-- Nom du fichier -->
                <template v-slot:item.fileName="{ item }">
                  <v-tooltip :text="item.filePath || item.fileName">
                    <template v-slot:activator="{ props }">
                      <span v-bind="props" :class="{ 'text-grey': !item.isValid }">
                        {{ item.fileName }}
                      </span>
                    </template>
                  </v-tooltip>
                  <v-chip
                    v-if="item.existsInDB"
                    size="x-small"
                    color="warning"
                    class="ml-2"
                  >
                    {{ $gettext('Already in the logbook') }}
                  </v-chip>
                  <v-chip
                    v-if="!item.isValid"
                    size="x-small"
                    color="error"
                    class="ml-2"
                  >
                    {{ $gettext('Invalid') }}
                  </v-chip>
                </template>

                <!-- Nom pilote -->
                <template v-slot:item.pilotName="{ item }">
                  <span :class="{ 'text-grey': !item.isValid }">
                    {{ item.pilotName || '-' }}
                  </span>
                </template>

                <!-- Bouton Map -->
                <template v-slot:item.actions="{ item }">
                  <v-btn
                    icon="mdi-map"
                    size="small"
                    variant="text"
                    color="primary"
                    @click="showFlightOnMap(item)"
                    :disabled="!item.isValid"
                  />
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Dialog d'importation -->
    <v-dialog v-model="importDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="text-h5 bg-primary">
          {{ selectedDevice }}
        </v-card-title>
        <v-card-text class="pt-6">
          <v-alert type="info" variant="tonal" class="mb-4">
            <p v-for="(line, index) in getDeviceDescription()" :key="index" class="mb-2">
              {{ line }}
            </p>
          </v-alert>

          <div v-if="importType !== 'serial'" class="text-center">
            <v-btn
              color="primary"
              size="large"
              prepend-icon="mdi-folder-open"
              @click="selectDirectory"
            >
              {{ $gettext('Select') }}
            </v-btn>
            <p v-if="selectedDirectory" class="mt-4 text-success">
              <v-icon color="success">mdi-check-circle</v-icon>
              {{ selectedDirectory }}
            </p>
          </div>

          <div v-else class="text-center">
            <p class="text-body-1 mb-4">
              {{ $gettext('Connexion série à implémenter') }}
            </p>
            <v-btn
              color="secondary"
              size="large"
              prepend-icon="mdi-connection"
              disabled
            >
              {{ $gettext('Connexion Serial') }}
            </v-btn>
          </div>

          <v-alert v-if="error" type="error" class="mt-4">
            {{ error }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeImportDialog">
            {{ $gettext('Annuler') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            @click="startImport"
            :disabled="!selectedDirectory && importType !== 'serial'"
            :loading="isScanning"
          >
            {{ isScanning ? 'Scan en cours...' : $gettext('Importer') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useGettext } from 'vue3-gettext';
import OpenLogbook from '@/components/OpenLogbook.vue';
import { useDatabaseStore } from '@/stores/database';
import { parseIGC, checkFlightExists } from '../js/igc-parser';
import { scanDirectoryForIGC, processIGCFiles } from '../js/directory-scanner';
import { getDeviceDescriptions } from '../js/device-descriptions';

// Déclarer les événements que ce composant peut émettre
defineEmits(['dbUpdated']);

const { $gettext } = useGettext();
const databaseStore = useDatabaseStore();

// Listes des appareils et options
const usbDevices = [
  'XCTracer',
  'Skytraax 2',
  'Skytraax 3/4/5',
  'Syride Usb',
  'Oudie',
  'CPilot',
  'Element',
  'Connect',
  'Reversale',
  'Skydrop',
  'Varduino',
  'Flynet',
  'Sensbox'
];

const serialDevices = [
  'Flymaster SD',
  'Flymaster Old',
  'Flytec 6020/30',
  'Flytec 6015',
  'Digifly'
];

const folderOptions = [
  'Dossier',
  'Syride PCTools'
];

// États du dialog
const importDialog = ref(false);
const selectedDevice = ref('');
const importType = ref(''); // 'usb', 'serial', 'folder', 'notrace'
const selectedDirectory = ref('');
const selectedDirectoryHandle = ref(null);
const error = ref('');
const isScanning = ref(false);
const scannedFlights = ref([]);
const showFlightTable = ref(false);
const showAllFlights = ref(true);
const currentDevice = ref('');

// Headers de la table des vols
const flightTableHeaders = [
  { title: '', key: 'toStore', sortable: false, width: '50px' },
  { title: 'Date', key: 'date', sortable: true },
  { title: 'Heure', key: 'takeoffTime', sortable: true },
  { title: 'Fichier', key: 'fileName', sortable: true },
  { title: 'Pilote', key: 'pilotName', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '100px' }
];

// Computed pour les vols sélectionnés
const selectedFlightsCount = computed(() => {
  return scannedFlights.value.filter(f => f.toStore).length;
});

const hasSelectedFlights = computed(() => {
  return selectedFlightsCount.value > 0;
});

// Computed pour filtrer les vols affichés
const filteredFlights = computed(() => {
  if (showAllFlights.value) {
    return scannedFlights.value;
  }
  // Afficher uniquement les vols à incorporer (toStore = true)
  return scannedFlights.value.filter(f => f.toStore);
});

// Descriptions des appareils (utilise $gettext pour l'internationalisation)
const deviceDescriptions = getDeviceDescriptions($gettext);

function openImportDialog(device, type) {
  selectedDevice.value = device;
  importType.value = type;
  selectedDirectory.value = '';
  error.value = '';
  importDialog.value = true;
}

function closeImportDialog() {
  importDialog.value = false;
  selectedDevice.value = '';
  selectedDirectory.value = '';
  error.value = '';
}

function getDeviceDescription() {
  return deviceDescriptions[selectedDevice.value] || [$gettext('Not yet available')];
}

async function selectDirectory() {
  try {
    if ('showDirectoryPicker' in window) {
      // API moderne File System Access
      const directoryHandle = await window.showDirectoryPicker({ mode: 'read' });
      selectedDirectory.value = directoryHandle.name;
      selectedDirectoryHandle.value = directoryHandle;
      error.value = '';
    } else {
      // Fallback pour navigateurs non supportés
      error.value = 'L\'API File System Access n\'est pas supportée par ce navigateur. Veuillez utiliser Chrome, Edge ou Opera.';
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      error.value = `Erreur lors de la sélection du dossier: ${err.message}`;
      console.error('Erreur showDirectoryPicker:', err);
    }
  }
}

async function startImport() {
  if (!selectedDirectoryHandle.value) {
    error.value = $gettext('No directory selected');
    return;
  }

  isScanning.value = true;
  error.value = '';
  
  try {
    // 1. Scanner le répertoire pour trouver tous les fichiers IGC
    const igcFiles = await scanDirectoryForIGC(selectedDirectoryHandle.value);
    
    if (igcFiles.length === 0) {
      error.value = $gettext('No tracks in this folder');
      isScanning.value = false;
      return;
    }

    // 2. Traiter chaque fichier (parser + vérifier existence)
    const db = databaseStore.db;
    scannedFlights.value = await processIGCFiles(igcFiles, parseIGC, checkFlightExists, db);
    
    // 3. Mémoriser le device et fermer le dialog
    currentDevice.value = selectedDevice.value;
    closeImportDialog();
    showFlightTable.value = true;
    
  } catch (err) {
    error.value = `Erreur lors du scan: ${err.message}`;
    console.error('Erreur startImport:', err);
  } finally {
    isScanning.value = false;
  }
}

function closeFlightTable() {
  showFlightTable.value = false;
  scannedFlights.value = [];
  showAllFlights.value = true;
  currentDevice.value = '';
}

function showFlightOnMap(flight) {
  // TODO: Ouvrir une modal avec une carte affichant la trace
  console.log('Afficher le vol sur la carte:', flight);
  alert(`Affichage carte pour ${flight.fileName}\nDate: ${flight.date}\nHeure: ${flight.takeoffTime}`);
}

async function importSelectedFlights() {
  const flightsToImport = scannedFlights.value.filter(f => f.toStore);
  
  if (flightsToImport.length === 0) {
    return;
  }

  try {
    const db = databaseStore.db;
    let importedCount = 0;

    for (const flight of flightsToImport) {
      try {
        // Insérer le vol dans la base de données
        // TODO: Adapter les champs selon votre schéma de base de données
        const stmt = db.prepare(`
          INSERT INTO Vol (
            V_Date, V_Heure, V_Engin, V_Duree, V_sDuree, V_Vitesse,
            V_AltDeco, V_Commentaire, V_IGC
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
          flight.date,
          flight.takeoffTime,
          flight.gliderType || '',
          0, // Durée à calculer
          '', // Durée formatée
          0, // Vitesse à calculer
          0, // Altitude décollage
          flight.site || '',
          flight.rawContent
        ]);
        
        stmt.free();
        importedCount++;
      } catch (err) {
        console.error(`Erreur import ${flight.fileName}:`, err);
      }
    }

    // Marquer la base comme modifiée
    databaseStore.markAsDirty();

    // Afficher un message de succès
    alert(`${importedCount} vol(s) importé(s) avec succès`);
    
    // Fermer la table
    closeFlightTable();

  } catch (err) {
    console.error('Erreur lors de l\'import:', err);
    alert(`Erreur lors de l'import: ${err.message}`);
  }
}
</script>

<style scoped>
.import-view {
  min-height: 80vh;
}

.mt-10px {
  margin-top: 5px !important;
}
</style>