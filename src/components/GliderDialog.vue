<template>
  <v-dialog v-model="show" max-width="500">
    <v-card>
      <v-card-title class="headline">Modifier la voile</v-card-title>
      <v-card-text>
        <div class="dialog-section">
          <div class="dialog-label">Choisir une voile existante</div>
          <v-select
            v-model="selectedGlider"
            :items="gliderList"
            label="Glider"
            variant="outlined"
            density="compact"
            clearable
          />
        </div>
        <div class="dialog-section">
          <div class="dialog-label">Ou nouvelle voile</div>
          <v-text-field
            v-model="newGlider"
            label="Enter new glider name"
            variant="outlined"
            density="compact"
            clearable
          />
        </div>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="onCancel">Cancel</v-btn>
        <v-btn color="primary" @click="onOk">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  gliderList: {
    type: Array,
    default: () => []
  },
  currentGlider: String
});
const emit = defineEmits(['update:modelValue', 'save']);

const show = ref(props.modelValue);
const selectedGlider = ref(props.currentGlider || '');
const newGlider = ref('');

watch(() => props.modelValue, val => show.value = val);
watch(show, val => emit('update:modelValue', val));

function onCancel() {
  show.value = false;
}

function onOk() {
  // Priorité au champ texte si rempli
  const glider = newGlider.value.trim() || selectedGlider.value;
  emit('save', glider);
  show.value = false;
}
</script>

<style scoped>
.dialog-section {
  background: #e3f3fa;
  border-radius: 8px;
  padding: 16px 12px;
  margin-bottom: 16px;
}
.dialog-label {
  font-size: 1.2em;
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
