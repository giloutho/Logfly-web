<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="480">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ $gettext('Scoring') }}</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('update:modelValue', false)" />
      </v-card-title>

      <v-card-text>
        <!-- Flight info -->
        <div class="text-caption text-grey mb-3" v-if="flightDate || flightSite">
          {{ flightDate }} — {{ flightSite }}
        </div>

        <!-- League selector -->
        <v-select v-model="selectedScore" :items="scores" :label="$gettext('Choose a scoring rule')" variant="outlined"
          density="compact" :disabled="loading" class="mb-3" />

        <!-- Loading spinner -->
        <div v-if="loading" class="d-flex align-center justify-center py-4 flex-column gap-2">
          <v-progress-circular indeterminate color="primary" size="40" />
          <span class="text-caption text-grey mt-2">{{ $gettext('Computing score...') }}</span>
        </div>

        <!-- Result display -->
        <div v-if="scoreResult && !loading" class="score-result pa-4 rounded">
          <div class="text-overline text-grey mb-1">{{ $gettext('Result') }}</div>
          <div class="text-h5 font-weight-bold" style="color:#1565C0">
            {{ scoreResult.distanceKm }} km
          </div>
          <div class="text-body-2 text-grey mt-1">
            {{ selectedScore }} — {{ scoreResult.circuit }}
          </div>
          <div v-if="scoreResult.score" class="text-body-1 font-weight-bold mt-2 text-success">
            {{ scoreResult.score }}
          </div>
        </div>

        <!-- Error message -->
        <v-alert v-if="scoreError" type="error" variant="tonal" density="compact" class="mt-2">
          {{ scoreError }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $gettext('Close') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!selectedScore || loading" :loading="loading"
          @click="validate">
          {{ $gettext('Calculate') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>

import { ref, watch } from 'vue';
import { useGettext } from 'vue3-gettext';

const { $gettext } = useGettext();

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
  flightDate: {
    type: String,
    default: ''
  },
  flightSite: {
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
const scoreResult = ref(null);
const scoreError = ref(null);

async function validate() {
  if (!selectedScore.value || props.fixes.length === 0) return;
  loading.value = true;
  scoreResult.value = null;
  scoreError.value = null;
  try {
    const args = {
      date: props.date || '',
      fixes: props.fixes,
      league: selectedScore.value
    };
    const result = await props.scoringFn(args);
    if (result && result.success) {
      // igcScoring returns { success, geojson } where geojson has .score, .distance, .course
      const geojson = result.geojson;
      const distanceKm = geojson?.distance !== undefined
        ? (Math.round(geojson.distance * 100) / 100).toFixed(2)
        : '?';
      const circuit = geojson?.course || '';
      const score = geojson?.score !== undefined ? geojson.score.toFixed(2) + ' pts' : '';
      scoreResult.value = { distanceKm, circuit, score };
      emit('score-result', { league: selectedScore.value, result: geojson });
    } else {
      scoreError.value = result?.message || $gettext('Scoring failed');
    }
  } catch (e) {
    console.error('Scoring error', e);
    scoreError.value = $gettext('An unexpected error occurred');
  } finally {
    loading.value = false;
  }
}

// Reset when dialog closes
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    selectedScore.value = null;
    scoreResult.value = null;
    scoreError.value = null;
  }
});
</script>

<style scoped>
.score-result {
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
}
</style>
