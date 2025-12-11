<template>
  <v-card class="details-card">
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Flight Details</span>
      <v-chip color="primary" class="ml-auto" label>
        {{ trackData.site }} {{ trackData.day }}
      </v-chip>
    </v-card-title>
    <v-tabs v-model="tab" color="primary" class="bg-grey-lighten-4">
      <v-tab value="about">
        <v-icon class="mr-2">mdi-information-outline</v-icon>
        About
      </v-tab>
      <v-tab value="comment">
        <v-icon class="mr-2">mdi-comment-text-outline</v-icon>
        Comment
      </v-tab>
      <v-tab value="modify">
        <v-icon class="mr-2">mdi-pencil-outline</v-icon>
        Modify
      </v-tab>
      <v-tab value="share">
        <v-icon class="mr-2">mdi-share-variant-outline</v-icon>
        Share
      </v-tab>
      <v-tab value="more">
        <v-icon class="mr-2">mdi-dots-horizontal</v-icon>
        More
      </v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="about">
        <v-card-text>
          <div class="about-block">
            <!--
            <div class="about-row tag-row">
              <span class="tag-label">{{ trackData?.tagLabel || 'Une ligne pour le libellé éventuel du tag' }}</span>
            </div>-->
            <div class="about-row info-row">
              <span class="info-bold">Site</span>                
              <span>{{ trackData?.site || '' }}</span>
              <span class="info-bold">Voile</span>
              <span>{{ trackData?.glider || '' }}</span>
              <span class="info-bold">Pilote</span>
              <span>{{ trackData?.decodedIgc.info.pilot || '' }}</span>
            </div>
            <div class="about-row info-row">
              <span class="info-bold">Décollage :</span> <span>{{ timeTakeOff }}</span>
              <span class="info-bold">Atterrissage :</span> <span>{{ timeLanding }}</span>
              <span class="info-bold">Durée :</span> <span>{{ trackData?.duration || '' }}</span>
            </div>
            <div class="about-row info-row">
              <span class="info-bold">Alt max GPS :</span> <span>{{ trackData?.decodedIgc.stat.maxalt.gps || '' }}m</span>
              <span class="info-bold">Vario max :</span> <span>{{ trackData?.decodedIgc.stat.maxclimb || '' }}m/s</span>
              <span class="info-bold">Vario mini :</span> <span>{{ trackData?.decodedIgc.stat.maxsink || '' }}m/s</span>
            </div>
            <div class="about-row info-row">              
              <v-btn
                color="success"
                density="compact"
                @click="showScoreDialog = true"
                :disabled="isComputingScore"
                class="ml-2"
              >
                {{ isComputingScore ? 'Computing...' : 'Scoring' }}
              </v-btn>
              <span class="info-bold">{{ scoreLabel }}</span>
            </div>
            <ScoreDialog
              v-model="showScoreDialog"
              @select="onScoreSelected"
            />
            <div class="about-row btn-row">
              <v-btn color="primary" density="compact" class="mr-2">Add photo</v-btn>
              <v-btn color="error" density="compact">Remove photo</v-btn>
            </div>
          </div>
        </v-card-text>
      </v-window-item>

      <v-window-item value="comment">
        <v-card-text>
          <v-textarea
            v-model="commentText"
            label="Ajouter un commentaire"
            rows="5"
            variant="outlined"
            density="compact"
          ></v-textarea>
          <div class="comment-btn-row">
            <v-btn color="error" density="compact" class="mr-2" @click="onDeleteComment">Supprimer</v-btn>
            <v-btn color="primary" density="compact" @click="onValidateComment">Valider</v-btn>
          </div>
        </v-card-text>
      </v-window-item>

      <v-window-item value="modify">
        <v-card-text>
          <div class="modify-btn-row">
            <div class="modify-line">
              <v-btn color="primary" density="compact" class="mr-2" @click="showGliderDialog = true">Modifier la voile</v-btn>
                        <GliderDialog
                          v-model="showGliderDialog"
                          :gliderList="gliderList"
                          :currentGlider="trackData?.glider"
                          @save="onGliderSave"
                        />
              <v-btn color="primary" density="compact">Change site</v-btn>
            </div>
            <div class="modify-line">
              <v-btn color="error" density="compact">Supprimer</v-btn>
            </div>
            <div class="modify-line">
              <v-btn color="warning" density="compact" class="mr-2">Editer/Dupliquer</v-btn>
              <v-btn color="secondary" density="compact">Fusionner les vols</v-btn>
            </div>
          </div>
        </v-card-text>
      </v-window-item>

      <v-window-item value="share">
        <v-card-text>
          Options de partage...
        </v-card-text>
      </v-window-item>

      <v-window-item value="more">
        <v-card-text>
          Autres options...
        </v-card-text>
      </v-window-item>
    </v-window>
  </v-card>
</template>

<script setup>
import GliderDialog from '@/components/GliderDialog.vue';
import { useDatabaseStore } from '@/stores/database';
const showGliderDialog = ref(false);
const gliderList = ref([]);

const databaseStore = useDatabaseStore();

function loadGliderList() {
  const reqSQL = "SELECT DISTINCT V_Engin FROM Vol WHERE V_Engin IS NOT NULL AND V_Engin != '' ORDER BY upper(V_Engin)";
  const result = databaseStore.query(reqSQL);
  if (result.success && result.data && result.data[0]) {
    const values = result.data[0].values;
    gliderList.value = values.map(row => row[0]);
  } else {
    gliderList.value = [];
  }
}

// Charger la liste des voiles à l'ouverture du dialog
watch(showGliderDialog, (val) => { if (val) loadGliderList(); });

function onGliderSave(newGlider) {
  // Remonte la valeur au parent (LogbookView) pour traitement
  emit('update:glider', {
    id: props.trackData?.dbId || null,
    glider: newGlider
  });
}
import { ref, computed, watch } from 'vue';
import { useGettext } from "vue3-gettext";
import { igcScoring } from '@/js/igc/igc-scoring';
import ScoreDialog from '@/components/ScoreDialog.vue';

const props = defineProps({
  trackData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:scoreJson', 'update:comment', 'update:glider']);

const tab = ref('about'); // Onglet "About" sélectionné par défaut
const isComputingScore = ref(false);
const showScoreDialog = ref(false);
const scoreJson = ref(null);
const scoreLabel = ref('');
const commentText = ref('');

// Met à jour le commentaire affiché à chaque changement de vol
watch(() => props.trackData, (newVal) => {
  scoreLabel.value = '';
  commentText.value = newVal?.comment || '';
});

function onDeleteComment() {
  commentText.value = '';
  onValidateComment();
}

function onValidateComment() {
  // On émet l'ID du vol et le commentaire courant
  console.log('Emitting comment update:', props.trackData?.dbId || null)
  emit('update:comment', {
    id: props.trackData?.dbId || null,
    comment: commentText.value
  });
}

const timeTakeOff = computed(() => {
    const feature = props.trackData?.decodedIgc?.GeoJSON?.features[0];
    if (!feature || !feature.properties.coordTimes || feature.properties.coordTimes.length === 0) {
        return '';
    }       
    const dateTkoff = new Date(feature.properties.coordTimes[0]) // to get local time   
    return dateTkoff.getUTCHours().toString().padStart(2, '0') + ':' + dateTkoff.getUTCMinutes().toString().padStart(2, '0');
});

const timeLanding = computed(() => {
    const feature = props.trackData?.decodedIgc?.GeoJSON?.features[0];
    if (!feature || !feature.properties.coordTimes || feature.properties.coordTimes.length === 0) {
        return '';
    }         
    const dateLanding = new Date(feature.properties.coordTimes[feature.properties.coordTimes.length - 1])
    return dateLanding.getUTCHours().toString().padStart(2, '0') + ':' + dateLanding.getUTCMinutes().toString().padStart(2, '0');
});

const trackFixes = computed(() => {
  return props.trackData?.decodedIgc?.fixes|| [];
}); 

const trackDate = computed(() => {
    return props.trackData?.decodedIgc?.info?.date || '';
});

function onScoreSelected(league) {
  computeScore(league);
}

async function computeScore(league) {
  if (isComputingScore.value) return; // Évite les clics multiples
  if (!trackFixes.value || trackFixes.value.length === 0) {
    console.warn('Pas de fixes disponibles pour le calcul du score');
    return;
  }
  if (!trackDate.value) {
    console.warn('Pas de date disponible pour le calcul du score');
    return;
  }
  isComputingScore.value = true;
  try {
    const result = await igcScoring({
      date: trackDate.value,
      fixes: trackFixes.value,
      league: league
    });
    if (result.success) {
        scoreJson.value = result.geojson;
        const strScore = JSON.parse(JSON.stringify(result.geojson))
        const sc_league = strScore.league
        const sc_best = strScore.score+' pts'
        const sc_course = strScore.course
        const sc_distance = strScore.distance+' km'
        const sc_multi = strScore.multiplier
        // Score computed: League=FFVL, Score=34.64 pts, Course=Triangle plat, Distance=28.87 km, Multiplier=1.2
        scoreLabel.value = `${sc_league} : ${sc_course} Distance ${sc_distance}   Score ${sc_best} Coeff =${sc_multi}`;        
        // Informer le parent (LogbookView)du nouveau score calculé
        emit('update:scoreJson', result.geojson);
        return result.geojson;
    } else {
        console.error('Erreur scoring:', result.message);
    }
  } catch (error) {
        console.error('Erreur lors du calcul du score:', error);
  } finally {
        isComputingScore.value = false;
  }
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}min`;
}
</script>

<style scoped>
.details-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
}

.details-card :deep(.v-card) {
  border-radius: 0;
  box-shadow: none;
}

.track-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.label {
  font-weight: 500;
  color: #666;
}

.value {
  font-weight: 600;
  color: #333;
}

.no-data {
  color: #999;
  font-style: italic;
  text-align: center;
  padding: 40px 20px;
}

.about-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.about-row {
  display: flex;
  align-items: center;
  padding: 4px 4px;
  background: #f5f5f5;
  border-radius: 4px;
}

.tag-row {
  font-size: 1.1em;
  margin-bottom: 4px;
}

.tag-label {
  font-weight: 400;
}

.info-bold {
  font-weight: 600;
}

.btn-row {
  display: flex;
  gap: 16px;
  margin-top: 10px;
}

.modify-btn-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}
.modify-line {
  display: flex;
  flex-direction: row;
  gap: 12px;
}

.comment-btn-row {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  justify-content: flex-end;
}

.compute-btn {
  padding: 6px 16px;
  margin-left: 16px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  transition: background-color 0.2s;
}

.compute-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.compute-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>

