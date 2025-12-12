<style>
.app-container {
  height: 100vh !important;
  min-height: 100vh !important;
  width: 100vw !important;
  box-sizing: border-box;
}
.content-area {
  height: 100%;
  min-height: 100%;
  width: 100%;
  box-sizing: border-box;
}
</style>
<template>
  <v-app class="app-container">
    
    <TheNavbar />
    <v-main class="content-area">
      <router-view @db-updated="onDbUpdated" />
    </v-main>
    
    <!-- Pas de footer pour l'instant     -->
    <v-footer class="app-footer">
      ©  Paragliding App
    </v-footer>
    <TheFooter
      :version="appVersion"
      :dbPath="dbPath"
      :isDirty="isDirty"
      @save="onSave"
    />
    <OpenLogbook @db-opened="onDbOpened" />
    <!-- Snackbar supprimé -->
  </v-app>
</template>

<script setup>
  import TheNavbar from '@/components/TheNavbar.vue' 
  import TheFooter from '@/components/TheFooter.vue' 
  import OpenLogbook from '@/components/OpenLogbook.vue';
  import { ref, computed } from 'vue';
  import { useDatabaseStore } from '@/stores/database';
  import { saveDatabase } from '@/js/database/sql-manager.js';

  const appVersion = '1.0.0'; // À remplacer par la vraie version
  const databaseStore = useDatabaseStore();
  const dbPath = computed(() => databaseStore.dbName || '');
  const isDirty = ref(false); // Passe à true dès qu'une modif DB est faite
  
  function onDbUpdated() {
    isDirty.value = true;
  }
  // Snackbar supprimé


  function onSave() {
    // Utilise le nom du fichier ouvert depuis le store, sinon un nom par défaut
    const filename = databaseStore.dbName || 'carnet.db';
    try {
      saveDatabase(databaseStore.db, filename);
      isDirty.value = false;
      // La couleur du bouton passera à success via la prop isDirty
    } catch (e) {
      // Optionnel : afficher une erreur dans la console
      console.error('Erreur lors de la sauvegarde :', e.message);
    }
  }

function onDbOpened(name) {
  // La mutation du store s'occupe déjà de dbName, rien à faire ici
}
</script>