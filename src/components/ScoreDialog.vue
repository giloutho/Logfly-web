<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="400">
    <v-card>
      <v-card-title>Scoring</v-card-title>
      <v-card-text>
        <v-select
          v-model="selectedScore"
          :items="scores"
          label="Choisir une règle de calcul"
          variant="outlined"
          density="compact"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Annuler</v-btn>
        <v-btn 
          color="primary" 
          variant="text" 
          :disabled="!selectedScore" 
          @click="validate"
        >
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
  scores: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'select']);

const selectedScore = ref(null);

function selectScore(score) {
  selectedScore.value = score;
}

function validate() {
  if (selectedScore.value) {
    emit('select', selectedScore.value);
    emit('update:modelValue', false);
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
