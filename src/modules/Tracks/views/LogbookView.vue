<template>
  <div class="logbook-view">
    <header class="logbook-header">
      <h1>Carnet de Vols du Pilote</h1>
      
      <button 
        @click="goToAnnualStats" 
        class="btn-primary"
      >
        📊 {{ $gettext('Voir la Synthèse Annuelle (Module Stat)') }}
      </button>
    </header>

    <div class="logbook-controls">
      <button @click="showImport">{{ $gettext('Importer Traces GPS') }}</button>
      <button @click="showExternalTrace">{{ $gettext('Examiner Trace Extérieure') }}</button>
    </div>

    <section class="logbook-content">
      <p>{{ $gettext('Liste détaillée de tous les vols enregistrés...') }}</p>
      <ul>
        <li>Vol du 2025-10-25 - Site: Annecy - Durée: 3h45</li>
        <li>Vol du 2025-09-01 - Site: Saint Hilaire - Durée: 1h12</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

// Obtient l'instance du router de Vue
const router = useRouter();

/**
 * Fonction pour naviguer vers le Module Stat (Synthèse Annuelle)
 */
function goToAnnualStats() {
  // CLÉ : Utiliser le nom de la route que nous avons défini dans router/index.js
  router.push({ name: 'synthese-annee' }); 
  
  // Note: Si le bundle 'module-stat' n'est pas chargé, cette action 
  // le déclenchera automatiquement. L'utilisateur verra le "Chargement du module..." 
  // défini dans AppLayout.vue pendant cette opération.
}

// Fonctions pour les autres vues du Module Track
function showImport() {
  // router.push({ name: 'import-gps' });
  console.log("Naviguer vers l'importation de traces GPS.");
}

function showExternalTrace() {
  // router.push({ name: 'examine-trace' });
  console.log("Naviguer vers l'examen d'une trace externe.");
}
</script>

<style scoped>
/* Styles simplifiés pour l'exemple */
.logbook-view {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.logbook-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.logbook-controls button {
  margin-right: 10px;
  padding: 8px 15px;
  cursor: pointer;
}

.btn-primary {
  background-color: #4a90e2;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}
</style>