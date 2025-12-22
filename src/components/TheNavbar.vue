<template>
  <v-app-bar color="primary" dark app flat translate="no">
    <v-toolbar-title>
      <router-link :to="{ name: 'home' }" class="app-title-link">
        <!-- <router-link :to="{ name: 'logbook-view' }" class="app-title-link">  -->
        <img src="@/assets/Logowebwh.png" alt="Logo Logfly"
          style="vertical-align: middle; margin-right: 8px; height: 32px;" />
        Logfly
      </router-link>
    </v-toolbar-title>

    <v-spacer></v-spacer>

    <div class="d-none d-sm-flex">
      <v-menu offset-y translate="no">
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props">
            <!-- <v-icon left>mdi-map-marker-path</v-icon>. -->
            {{ $gettext('Flights & Tracks') }}
            <!-- <v-icon right>mdi-menu-down</v-icon> -->
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
      <v-menu offset-y translate="no">
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props">
            <!-- <v-icon left>mdi-chart-line</v-icon> -->
            {{ $gettext('Statistics') }}
            <v-icon right>mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item :to="{ name: 'synthese-annee' }">
            <v-list-item-title>{{ $gettext('Annual summary') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'synthese-globale' }">
            <v-list-item-title>{{ $gettext('Global summary') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-menu offset-y translate="no">
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props">
            <!-- <v-icon left>mdi-chart-line</v-icon> -->
            {{ $gettext('Routing') }}
            <v-icon right>mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item :to="{ name: 'waypoints-view' }">
            <v-list-item-title>{{ $gettext('Waypoints') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'airspaces-view' }">
            <v-list-item-title>{{ $gettext('Airspaces') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'xcnav-view' }">
            <v-list-item-title>{{ $gettext('XC Nav') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-menu offset-y translate="no">
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props">
            {{ $gettext('Sites') }}
            <v-icon right>mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item :to="{ name: 'sites-view' }">
            <v-list-item-title>{{ $gettext('Sites') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'pgearth-view' }">
            <v-list-item-title>{{ $gettext('Paragliding Earth') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-btn text :to="{ name: 'equip-base' }">
        <!-- <v-icon left>mdi-sail-boat</v-icon>. -->
        {{ $gettext('Equipment') }}
      </v-btn>

      <v-menu offset-y translate="no">
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props">
            <!-- <v-icon left>mdi-map-marker-path</v-icon>. -->
            {{ $gettext('Settings & Utilities') }}
            <v-icon right>mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item :to="{ name: 'settings-view' }">
            <v-list-item-title>{{ $gettext('Settings') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'support-view' }">
            <v-list-item-title>{{ $gettext('Support') }}</v-list-item-title>
          </v-list-item>
          <v-list-item :to="{ name: 'utils-view' }">
            <v-list-item-title>{{ $gettext('Utilities') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
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
  color: inherit;
  /* Utilise la couleur du v-app-bar (white par défaut si 'dark') */
  text-decoration: none;
}
</style>