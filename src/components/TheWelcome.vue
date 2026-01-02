<script setup>
import { ref } from 'vue'
import WelcomeItem from './WelcomeItem.vue'
import DocumentationIcon from './icons/IconDocumentation.vue'
import ToolingIcon from './icons/IconTooling.vue'
import EcosystemIcon from './icons/IconEcosystem.vue'
import CommunityIcon from './icons/IconCommunity.vue'
import SupportIcon from './icons/IconSupport.vue'
import EquipIcon from './icons/IconEquip.vue'
import ExternalLayout from '@/components/ExternalLayout.vue'
import { igcDecoding } from '@/js/igc/igc-decoder.js'
import { IgcAnalyze } from '@/js/igc/igc-analyzer.js'

const openReadmeInEditor = () => fetch('/__open-in-editor?file=README.md')

// Demo track state
const showDemoTrack = ref(false)
const demoDecodedTrack = ref(null)
const demoAnalysisTrack = ref(null)
const demoRawContent = ref('')
const demoFileName = ref('demo.igc')
const demoLoading = ref(false)

async function loadDemoTrack() {
  if (demoLoading.value) return
  demoLoading.value = true

  try {
    const response = await fetch('/demo.igc')
    if (!response.ok) {
      console.error('Failed to load demo.igc:', response.statusText)
      demoLoading.value = false
      return
    }

    const content = await response.text()
    demoRawContent.value = content

    const decodedIgc = await igcDecoding(content)
    if (decodedIgc.success && decodedIgc.data.fixes && decodedIgc.data.fixes.length > 0) {
      demoDecodedTrack.value = decodedIgc.data
      const analyzeIgc = await IgcAnalyze(decodedIgc.data.fixes)
      if (analyzeIgc.success) {
        demoAnalysisTrack.value = analyzeIgc.anaTrack
        showDemoTrack.value = true
      } else {
        console.error('Demo track analysis failed:', analyzeIgc.message)
      }
    } else {
      console.error('Demo track decoding failed:', decodedIgc.message)
    }
  } catch (err) {
    console.error('Error loading demo track:', err)
  } finally {
    demoLoading.value = false
  }
}

function closeDemoTrack() {
  showDemoTrack.value = false
  demoDecodedTrack.value = null
  demoAnalysisTrack.value = null
  demoRawContent.value = ''
}
</script>

<template>
  <!-- Demo Track Dialog -->
  <v-dialog v-model="showDemoTrack" fullscreen transition="dialog-bottom-transition">
    <ExternalLayout v-if="demoDecodedTrack && demoAnalysisTrack" :decodedTrack="demoDecodedTrack"
      :analysisTrack="demoAnalysisTrack" :rawIgcContent="demoRawContent" :fileName="demoFileName" :fullscreen="true"
      @close="closeDemoTrack" />
  </v-dialog>

  <div class="welcome-outer">
    <div class="welcome-inner">
      <WelcomeItem>
        <template #icon>
          <DocumentationIcon />
        </template>
        <template #heading>{{ $gettext('Flights & Tracks') }}</template>
        <ul>
          <li>{{ $gettext('Access your logbook') }}<router-link :to="{ name: 'logbook-view' }">{{ $gettext('Logbook')
              }}</router-link></li>
          <li> {{ $gettext('Import new flights with or without GPS tracks') }}<router-link
              :to="{ name: 'import-gps' }">{{
                $gettext('Import flights')
              }}</router-link></li>
          <li>{{ $gettext('Review external GPS tracks') }} IGC/GPX<router-link :to="{ name: 'external-track' }">{{
            $gettext('External GPS track') }}</router-link></li>
          <li>
            <a href="#" @click.prevent="loadDemoTrack" class="demo-link">
              <v-icon size="24" class="mr-1">mdi-map-search-outline</v-icon>
              {{ $gettext('View the demo GPS track, a magnificent tour of Mont Blanc') }}
            </a>
            <v-progress-circular v-if="demoLoading" indeterminate size="16" width="2" class="ml-2" />
          </li>
        </ul>
      </WelcomeItem>

      <WelcomeItem>
        <template #icon>
          <ToolingIcon />
        </template>
        <template #heading>{{ $gettext('Statistics') }}</template>
        <ul>
          <li>{{ $gettext('Consult the annual summary of your flights') }}<router-link
              :to="{ name: 'synthese-annee' }">{{
                $gettext('Annual summary') }}</router-link></li>
          <li>{{ $gettext('Obtain global statistics of your logbook') }}<router-link
              :to="{ name: 'synthese-globale' }">{{
                $gettext('Global summary') }}</router-link></li>
        </ul>
      </WelcomeItem>

      <WelcomeItem>
        <template #icon>
          <EcosystemIcon />
        </template>
        <template #heading>{{ $gettext('Routing') }}</template>
        <ul>
          <li>{{ $gettext('Manage your waypoints') }}<router-link :to="{ name: 'waypoints-view' }">{{
            $gettext('Waypoints')
              }}</router-link></li>
          <li>{{ $gettext('Visualize and edit airspaces') }}<router-link :to="{ name: 'airspaces-view' }">{{
            $gettext('Airspaces') }}</router-link></li>
          <li>{{ $gettext('Program XC flights') }}<router-link :to="{ name: 'xcnav-view' }">{{ $gettext('XC Nav')
          }}</router-link></li>
        </ul>
      </WelcomeItem>

      <WelcomeItem>
        <template #icon>
          <CommunityIcon />
        </template>
        <template #heading>{{ $gettext('Sites') }}</template>
        <ul>
          <li>{{ $gettext('Manage the sites file of your logbook') }}<router-link :to="{ name: 'files-base' }">{{
            $gettext('Sites') }}</router-link></li>
          <!-- On n'affiche pas pour l'instant le site paragliding earth -->
          <!--
          <li>{{ $gettext('Consult the Paragliding Earth database') }}</li>
          -->
        </ul>
      </WelcomeItem>
      <WelcomeItem>
        <template #icon>
          <EquipIcon />
        </template>
        <template #heading>{{ $gettext('Equipment') }}</template>
        <ul>
          <li>{{ $gettext('Manage your equipment : purchase, revision...') }}<router-link
              :to="{ name: 'equip-base' }">{{
                $gettext('Equipment') }}</router-link></li>
        </ul>
      </WelcomeItem>
      <WelcomeItem>
        <template #icon>
          <SupportIcon />
        </template>
        <template #heading>{{ $gettext('Utilities') }}</template>
        <ul>
          <li>{{ $gettext('Manage app preferences') }}</li>
          <li>{{ $gettext('Access support') }}</li>
          <li>{{ $gettext('Help translate Logfly') }}<router-link :to="{ name: 'translation-view' }">{{
            $gettext('Translation') }}</router-link></li>
        </ul>
      </WelcomeItem>
    </div>
  </div>
</template>
<style scoped>
.welcome-outer {
  display: flex;
  justify-content: center;
  width: 100%;
  padding-top: 30px;
}

.welcome-inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.demo-link {
  color: #1976d2;
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}

.demo-link:hover {
  color: #1565c0;
  text-decoration: underline;
}
</style>
