<template>
  <v-card flat>
    <v-app-bar color="white" flat class="toolbar-app-bar">
      <v-spacer></v-spacer>
        <v-btn class="toolbar-btn">{{ $gettext('Infos') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Pathway') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Airspaces') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Scoring') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Measure') }}</v-btn>
        <v-btn class="toolbar-btn">{{ $gettext('Cutting') }}</v-btn>

      <v-spacer></v-spacer>

      <v-btn icon @click="close">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-app-bar>

    <v-card-text>
      <!-- 
        Le contenu de l'analyse sera affiché ici.
        Par exemple, vous pouvez afficher le nombre de points d'élévation.
      -->
      <h2>{{ $gettext('Analysis Details') }}</h2>
      <p v-if="analysisData && analysisData.elevation">
        {{ $gettext('Track contains') }} {{ analysisData.elevation.length }} {{ $gettext('elevation points.') }}
      </p>
      
      <!-- C'est ici que vous ajouterez les graphiques et autres visualisations -->

    </v-card-text>
  </v-card>
</template>

<script setup>
import { useGettext } from "vue3-gettext";

// eslint-disable-next-line no-unused-vars
const props = defineProps({
  analysisData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['close']);
const { $gettext } = useGettext();

function close() {
  emit('close');
}
</script>

<style scoped>
.toolbar-app-bar {
  padding: 0 0.5rem;
  border-bottom: 2px solid #e0e0e0 !important;
}

.toolbar-btn {
  font-size: 0.85rem;
  min-width: 80px;
  padding: 0 10px;
  margin-right: 10px;
  background: #f5f5f5;
  color: #333;
  border-radius: 4px;
  box-shadow: none;
  /* Vuetify 3 utilise 'text-transform: uppercase' par défaut, on le retire */
  text-transform: none; 
}
</style>
