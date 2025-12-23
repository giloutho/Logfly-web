<template>
    <v-card v-if="result" class="score-result-card" elevation="2">
        <div class="result-header" :style="{ borderLeft: `6px solid ${headerColor}` }">
            <div class="header-content">
                <span class="league-name">{{ league }}</span>
                <v-btn icon="mdi-close" density="compact" variant="text" size="small" @click="$emit('close')"></v-btn>
            </div>
        </div>

        <div class="result-body">
            <div class="result-row highlight">
                <span class="label">Score maximum</span>
                <span class="value">{{ result.score ? result.score.toFixed(2) : '0' }} pts</span>
            </div>

            <div class="result-row">
                <span class="label">{{ result.course || 'Parcours' }}</span>
                <span class="value">{{ result.distance ? result.distance.toFixed(2) : '0' }} km</span>
            </div>

            <div class="result-row highlight">
                <span class="label">Coefficient</span>
                <span class="value">{{ result.multiplier || '1.0' }}</span>
            </div>

            <div class="legs-container mt-2">
                <div v-for="(leg, index) in result.legs" :key="index" class="result-row leg-row">
                    <span class="label">{{ leg.name || `TP${index + 1}` }} {{ leg.next ? ': ' + leg.next : '' }}</span>
                    <span class="value">{{ leg.d ? leg.d.toFixed(2) : '0' }} km</span>
                </div>
            </div>
        </div>
    </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { getLeagueColor } from '@/js/leaflet/map-utils.js';

const props = defineProps({
    league: {
        type: String,
        required: true
    },
    result: { // This is the geojson object (with properties we added in igc-scoring or standard ones)
        type: Object,
        required: true
    }
});

defineEmits(['close']);

const headerColor = computed(() => {
    const colorObj = getLeagueColor(props.league);
    return colorObj ? colorObj.namedColor : 'grey';
});
</script>

<style scoped>
.score-result-card {
    width: 320px;
    /* Reduced width for "discrete" look */
    font-family: 'Roboto', sans-serif;
    font-size: 0.85rem;
    position: absolute;
    top: 10px;
    left: 60px;
    /* Offset from left to avoid overlapping potential toolbar or map controls */
    z-index: 1000;
    /* Above map */
    opacity: 0.95;
}

.result-header {
    padding: 6px 8px;
    background: white;
    border-bottom: 1px solid #eee;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.league-name {
    font-weight: bold;
    font-size: 1rem;
}

.result-body {
    padding: 8px 12px;
}

.result-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    line-height: 1.2;
}

.result-row.highlight {
    background-color: #f5f5f5;
    margin: 0 -12px;
    padding: 4px 12px;
    font-weight: 500;
}

.leg-row {
    color: #555;
}

.label {
    font-weight: 500;
}

.value {
    text-align: right;
    font-family: monospace;
    font-weight: bold;
}
</style>
