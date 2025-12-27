<template>
    <v-card class="external-details-card" elevation="0">
        <v-card-text class="pa-3">
            <div class="details-content">
                <!-- Site row -->
                <div class="detail-row site-row">
                    <span class="detail-label">Site</span>
                    <span class="site-value">{{ siteName }}</span>
                </div>

                <!-- Scoring row -->
                <div class="detail-row scoring-row">
                    <v-btn color="success" density="compact" @click="showScoreDialog = true"
                        :disabled="isComputingScore">
                        {{ isComputingScore ? 'Computing...' : 'SCORING' }}
                    </v-btn>
                    <span class="score-label">{{ scoreLabel }}</span>
                </div>
                <ScoreDialog v-model="showScoreDialog" :fixes="fixes" :date="flightDate" :scoringFn="igcScoring"
                    @score-result="onScoreSelected" />

                <!-- Export buttons row -->
                <div class="detail-row export-row">
                    <v-btn color="primary" density="compact" class="mr-3" @click="onExportIgc">
                        <v-icon start>mdi-file-export</v-icon>
                        {{ $gettext('IGC export') }}
                    </v-btn>
                    <v-btn color="secondary" density="compact" @click="onExportGpx">
                        <v-icon start>mdi-file-export</v-icon>
                        {{ $gettext('GPX export') }}
                    </v-btn>
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, computed } from 'vue';
import { igcScoring } from '@/js/igc/igc-scoring';
import ScoreDialog from '@/components/ScoreDialog.vue';

const props = defineProps({
    decodedData: Object,
    anaResult: Object,
    rawIgcContent: String
});

const emit = defineEmits(['export-igc', 'export-gpx', 'score-computed']);

const showScoreDialog = ref(false);
const isComputingScore = ref(false);
const scoreLabel = ref('');

const siteName = computed(() => {
    return props.decodedData?.info?.site || 'Site non défini';
});

const fixes = computed(() => {
    return props.decodedData?.fixes || [];
});

const flightDate = computed(() => {
    return props.decodedData?.info?.date || '';
});

function onScoreSelected({ league, result }) {
    if (result) {
        const sc_league = result.league;
        const sc_best = result.score + ' pts';
        const sc_course = result.course;
        const sc_distance = result.distance + ' km';
        const sc_multi = result.multiplier;
        scoreLabel.value = `${sc_league} : ${sc_course} Distance ${sc_distance} Score ${sc_best} Coeff =${sc_multi}`;
        emit('score-computed', result);
    }
}

function onExportIgc() {
    if (!props.rawIgcContent) {
        console.warn('No IGC content to export');
        return;
    }

    // Create filename from date or default
    const date = props.decodedData?.info?.date || 'flight';
    const filename = `${date.replace(/-/g, '')}_logfly.igc`;

    // Create blob and trigger download
    const blob = new Blob([props.rawIgcContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    emit('export-igc');
}

async function onExportGpx() {
    if (!props.decodedData?.fixes) {
        console.warn('No track data to export as GPX');
        return;
    }

    // Import GPX converter
    const { igcToGpx } = await import('@/js/igc/igc-to-gpx.js');

    const gpxContent = igcToGpx(props.decodedData);
    const date = props.decodedData?.info?.date || 'flight';
    const filename = `${date.replace(/-/g, '')}_logfly.gpx`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    emit('export-gpx');
}
</script>

<style scoped>
.external-details-card {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.details-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.detail-row {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #f5f5f5;
    border-radius: 6px;
}

.site-row {
    gap: 16px;
}

.detail-label {
    font-weight: 600;
    color: #333;
    min-width: 60px;
}

.site-value {
    font-weight: 500;
    color: #1976d2;
}

.scoring-row {
    gap: 16px;
}

.score-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #444;
    flex: 1;
}

.export-row {
    justify-content: flex-start;
    gap: 12px;
}
</style>
