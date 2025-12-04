<template>
  <v-app class="app-container">
    
    <TheNavbar /> <v-main class="content-area">
      <router-view v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
          <template #fallback>
            <div class="loading-full-page">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
              <p>Chargement du module, veuillez patienter...</p>
            </div>
          </template>
        </Suspense>
      </router-view>
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