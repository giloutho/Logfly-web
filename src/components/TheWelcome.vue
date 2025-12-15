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
          <li>{{ $gettext('Accédez à votre carnet de vols') }}<router-link :to="{ name: 'logbook-view' }">{{ $gettext('Logbook') }}</router-link></li>
          <li>  {{ $gettext('Importez de nouvelles traces') }}<router-link :to="{ name: 'import-gps' }">{{ $gettext('Import GPS tracks') }}</router-link></li>
          <li>{{ $gettext('Examinez des traces IGC ou GPX') }}<router-link :to="{ name: 'external-track' }">{{ $gettext('Review an external GPS track') }}</router-link></li>
        </ul>
      </WelcomeItem>

      <WelcomeItem>
        <template #icon>
          <ToolingIcon />
        </template>
        <template #heading>{{ $gettext('Statistics') }}</template>
        <ul>
          <li>{{ $gettext('Consultez la synthèse annuelle de vos vols') }}<router-link :to="{ name: 'synthese-annee' }">{{ $gettext('Annual summary') }}</router-link></li>
          <li>{{ $gettext('Obtenez les statistiques globales du carnet de vols') }}<router-link :to="{ name: 'synthese-globale' }">{{ $gettext('Global summary') }}</router-link></li>
        </ul>    
      </WelcomeItem>

      <WelcomeItem>
        <template #icon>
          <EcosystemIcon />
        </template>
        <template #heading>{{ $gettext('Routing') }}</template>
        <ul>
          <li>{{ $gettext('Gérez vos waypoints') }}<router-link :to="{ name: 'waypoints-view' }">{{ $gettext('Waypoints') }}</router-link></li>
          <li>{{ $gettext('Visualisez et éditez les espaces aériens') }}<router-link :to="{ name: 'airspaces-view' }">{{ $gettext('Airspaces') }}</router-link></li>
          <li>{{ $gettext('Programmez les itinéraires de cross') }}<router-link :to="{ name: 'xcnav-view' }">{{ $gettext('XC Nav') }}</router-link></li>      
        </ul>
      </WelcomeItem>

      <WelcomeItem>
        <template #icon>
          <CommunityIcon />
        </template>
        <template #heading>{{ $gettext('Sites') }}</template>
        <ul>
          <li>{{ $gettext('Gérez le fichier des sites du carnet de vol') }}<router-link :to="{ name: 'files-base' }">{{ $gettext('Sites') }}</router-link></li>
          <li>{{ $gettext('Consultez la base de données Paragliding Earth') }}</li>
        </ul>
      </WelcomeItem>
      <WelcomeItem>
        <template #icon>
          <EquipIcon />
        </template>
        <template #heading>{{ $gettext('Equipment') }}</template>
        <ul>
          <li>{{ $gettext('Gérez votre matériel : achat, révision...') }}<router-link :to="{ name: 'equip-base' }">{{ $gettext('Equipment') }}</router-link></li>
        </ul>
      </WelcomeItem>
      <WelcomeItem>
        <template #icon>
          <SupportIcon />
        </template>
        <template #heading>{{ $gettext('Settings & Utilities') }}</template>
        <ul>
          <li>{{ $gettext('Gérez les préférences de l\'application') }}</li>
          <li>{{ $gettext('Accédez au support') }}</li>
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
