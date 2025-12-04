<template>
  <v-app-bar 
    color="primary" 
    dark 
    app 
    flat
  >
    <v-toolbar-title>
      <router-link :to="{ name: 'home' }" class="app-title-link"> 
      <!-- <router-link :to="{ name: 'logbook-view' }" class="app-title-link">  -->      
        <v-icon left>mdi-airplane-takeoff</v-icon>
        Logfly 7
      </router-link>
    </v-toolbar-title>

    <v-spacer></v-spacer>

    <div class="d-none d-sm-flex">
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props">
            <v-icon left>mdi-map-marker-path</v-icon>
            {{ $gettext('Flights & Tracks') }}
            <v-icon right>mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item :to="{ name: 'logbook-view' }">
            <v-list-item-title>{{ $gettext('Logbook') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'import-gps' }">
            <v-list-item-title>{{ $gettext('Import tracks') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'external-track' }">
            <v-list-item-title>{{ $gettext('External track') }}</v-list-item-title>
          </v-list-item>          
        </v-list>
      </v-menu>
      
      <v-btn text :to="{ name: 'stat-base' }">
        <v-icon left>mdi-chart-line</v-icon>
        {{ $gettext('Statistics') }}
      </v-btn>
      
      <v-btn text :to="{ name: 'routing-base' }">
        <v-icon left>mdi-map</v-icon>
        {{ $gettext('Routing') }}
      </v-btn>
      
      <v-btn text :to="{ name: 'files-base' }">
        <v-icon left>mdi-folder-settings</v-icon>
        {{ $gettext('Sites') }}
      </v-btn>
      
      <v-btn text :to="{ name: 'equip-base' }">
        <v-icon left>mdi-sail-boat</v-icon>
        {{ $gettext('Equipment') }}
      </v-btn>
      
      <v-btn text :to="{ name: 'settings-base' }">
        <v-icon left>mdi-cog</v-icon>
        {{ $gettext('Settings & Utilities') }}
      </v-btn>
    </div>

    <v-app-bar-nav-icon class="d-sm-none"></v-app-bar-nav-icon>

  </v-app-bar>
</template>

<script setup>
// Pas d'imports spécifiques car nous utilisons les composants Vuetify (v-app-bar, v-btn, v-icon)
// et le composant global de Vue Router (<router-link>).
</script>

<style lang="scss" scoped>
// Si vous avez un fichier `settings.scss` à la racine de `src`, vous pouvez l'importer comme ceci :
// @use "@/settings.scss" as *;

.app-title-link {
  color: inherit; /* Utilise la couleur du v-app-bar (white par défaut si 'dark') */
  text-decoration: none;
}
</style>