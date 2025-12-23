<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="400">
    <v-card>
      <v-card-title>Scoring</v-card-title>
      <v-card-text>
        <v-select v-model="selectedScore" :items="scores" label="Choisir une règle de calcul" variant="outlined"
          density="compact" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Annuler</v-btn>
        <v-btn color="primary" variant="text" :style="{ fontWeight: 'bold' }" :disabled="!selectedScore || loading"
          :loading="loading" @click="validate">
          Valider
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>

import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  fixes: {
    type: Array,
    default: () => []
  },
  date: {
    type: String,
    default: ''
  },
  scoringFn: {
    type: Function,
    required: true
  }
});

const scores = [
  'FFVL',
  'XContest',
  'FAI',
  'FAI-Cylinders',
  'FAI-OAR',
  'FAI-OAR2',
  'XCLeague'
];

const emit = defineEmits(['update:modelValue', 'score-result']);

const selectedScore = ref(null);
const loading = ref(false);

async function validate() {
  if (selectedScore.value && props.date && props.fixes.length > 0) {
    loading.value = true;
    try {
      const args = {
        date: props.date,
        fixes: props.fixes,
        league: selectedScore.value
      }
      const result = await props.scoringFn(args);
      if (result.success) {
        emit('score-result', { league: selectedScore.value, result: result.geojson });
        emit('update:modelValue', false);
      } else {
        console.error('Scoring failed:', result.message);
        // Optionally emit an error or show a snackbar
      }
    } catch (e) {
      console.error('Scoring error', e);
    } finally {
      loading.value = false;
    }
  }
}

// Réinitialiser la sélection quand le dialog se ferme
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    selectedScore.value = null;
  }
});
</script>

<style scoped>
/* Plus de styles custom pour la liste, le v-select est natif Vuetify */
</style>
