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