<script setup>
import WelcomeItem from './WelcomeItem.vue'
import DocumentationIcon from './icons/IconDocumentation.vue'
import ToolingIcon from './icons/IconTooling.vue'
import EcosystemIcon from './icons/IconEcosystem.vue'
import CommunityIcon from './icons/IconCommunity.vue'
import SupportIcon from './icons/IconSupport.vue'
import EquipIcon from './icons/IconEquip.vue'

const openReadmeInEditor = () => fetch('/__open-in-editor?file=README.md')
</script>

<template>
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
          <li>{{ $gettext('Consult the Paragliding Earth database') }}</li>
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
</style>
