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
                    @click="openImportDialog('Vol sans trace', 'notrace')"
                  >
                    Vol sans trace
                  </v-btn>
                </v-col>
              </v-row>
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
          >
            {{ $gettext('Importer') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useGettext } from 'vue3-gettext';
import OpenLogbook from '@/components/OpenLogbook.vue';
import { useDatabaseStore } from '@/stores/database';

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
const error = ref('');

// Descriptions des appareils
const deviceDescriptions = {
  'XCTracer': [
    $gettext('Plug in the XCTracer and briefly press the button'),
    $gettext('Click Select and choose the drive containing'),
    $gettext('a XC**.txt file and files in igc format'),
    $gettext('Validate and click Import')
  ],
  'Skytraax 2': [
    'Importez les traces depuis votre Skytraax 2.',
    'Sélectionnez le dossier des traces sur l\'appareil.'
  ],
  'Skytraax 3/4/5': [
    'Importez les traces depuis votre Skytraax 3, 4 ou 5.',
    'Sélectionnez le dossier des traces.'
  ],
  'Syride Usb': ['Importez les traces depuis votre Syride connecté en USB.'],
  'Oudie': [
    'Importez les traces depuis votre Oudie.',
    'Sélectionnez le dossier IGC.'
  ],
  'CPilot': ['Importez les traces depuis votre CPilot.'],
  'Element': ['Importez les traces depuis votre Element.'],
  'Connect': ['Importez les traces depuis votre Connect.'],
  'Reversale': ['Importez les traces depuis votre Reversale.'],
  'Skydrop': ['Importez les traces depuis votre Skydrop.'],
  'Varduino': ['Importez les traces depuis votre Varduino.'],
  'Flynet': ['Importez les traces depuis votre Flynet.'],
  'Sensbox': ['Importez les traces depuis votre Sensbox.'],
  'Flymaster SD': [
    'Connexion série avec Flymaster SD.',
    'Assurez-vous que l\'appareil est connecté.'
  ],
  'Flymaster Old': ['Connexion série avec ancien modèle Flymaster.'],
  'Flytec 6020/30': ['Connexion série avec Flytec 6020 ou 6030.'],
  'Flytec 6015': ['Connexion série avec Flytec 6015.'],
  'Digifly': ['Connexion série avec Digifly.'],
  'Dossier': ['Sélectionnez un dossier contenant des fichiers de traces (IGC, GPX, etc.).'],
  'Syride PCTools': ['Importez depuis un dossier de traces Syride PCTools.'],
  'Vol sans trace': ['Créez une entrée de vol manuel sans fichier de trace associé.']
};

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
  return deviceDescriptions[selectedDevice.value] || ['Sélectionnez un dossier pour importer les traces.'];
}

async function selectDirectory() {
  try {
    if ('showDirectoryPicker' in window) {
      // API moderne File System Access
      const directoryHandle = await window.showDirectoryPicker();
      selectedDirectory.value = directoryHandle.name;
      // TODO: Stocker le handle pour traitement ultérieur
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

function startImport() {
  // TODO: Implémenter la logique d'importation
  console.log('Import depuis:', selectedDevice.value, 'Type:', importType.value);
  if (selectedDirectory.value) {
    console.log('Dossier sélectionné:', selectedDirectory.value);
  }
  closeImportDialog();
}
</script>

<style scoped>
.import-view {

  min-height: 80vh;
}
</style>