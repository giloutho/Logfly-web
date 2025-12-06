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
      <router-view />
    </v-main>
    
    <!-- Pas de footer pour l'instant
    <v-footer class="app-footer">
      ©  Paragliding App
    </v-footer>
    -->
  </v-app>
</template>

<script setup>
  import TheNavbar from '@/components/TheNavbar.vue' 
</script>