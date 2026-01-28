<template>
  <v-card class="details-card" translate="no">
    <v-card-title class="d-flex justify-space-between align-center">
      <div class="d-flex align-center flex-grow-1">
        <v-chip color="primary" label class="mr-2">
          {{ trackData.site }} {{ trackData.day }}
        </v-chip>
        <div v-if="trackData?.tag" class="d-flex align-center ml-2">
          <v-icon :color="tagsMap[trackData.tag]?.color" size="small" class="mr-1">mdi-circle</v-icon>
          <span class="text-caption font-weight-bold">{{ tagsMap[trackData.tag]?.label }}</span>
        </div>
        <!-- Indicator for no-track flights -->
        <v-chip v-if="isNoTrackFlight" color="warning" size="small" class="ml-2">
          <v-icon start size="small">mdi-airplane-off</v-icon>
          {{ $gettext('No GPS track') }}
        </v-chip>
      </div>
      <div class="text-right flex-grow-1">
        {{ $gettext('Flight Details') }}
      </div>
    </v-card-title>
    <v-tabs v-model="tab" color="primary" class="bg-grey-lighten-4">
      <v-tab value="about">
        <v-icon class="mr-2">mdi-information-outline</v-icon>
        {{ $gettext('About') }}
      </v-tab>
      <v-tab value="comment">
        <v-icon class="mr-2">mdi-comment-text-outline</v-icon>
        {{ $gettext('Comment') }}
      </v-tab>
      <v-tab value="modify">
        <v-icon class="mr-2">mdi-pencil-outline</v-icon>
        {{ $gettext('Modify') }}
      </v-tab>
      <!-- Share tab: hidden for no-track flights -->
      <v-tab v-if="!isNoTrackFlight" value="share">
        <v-icon class="mr-2">mdi-share-variant-outline</v-icon>
        {{ $gettext('Export') }}
      </v-tab>
      <!-- More tab: hidden for no-track flights 
      <v-tab v-if="!isNoTrackFlight" value="more">
        <v-icon class="mr-2">mdi-dots-horizontal</v-icon>
        {{ $gettext('More') }}...
      </v-tab>
      -->
    </v-tabs>

    <v-window v-model="tab">
      <!-- ABOUT TAB -->
      <v-window-item value="about">
        <v-card-text>
          <div class="about-block">
            <!-- Line 1: Site, Glider (Pilot only for flights with track) -->
            <div class="about-row info-row">
              <span class="info-bold">{{ $gettext('Site') }}</span>
              <span>{{ trackData?.site || '' }}</span>
              <span class="info-bold">{{ $gettext('Glider') }}</span>
              <span>{{ trackData?.glider || '' }}</span>
              <template v-if="!isNoTrackFlight">
                <span class="info-bold">{{ $gettext('Pilot') }}</span>
                <span>{{ trackData?.decodedIgc?.info?.pilot || '' }}</span>
              </template>
            </div>
            <!-- Line 2: Take off, Duration (Landing only for flights with track) -->
            <div class="about-row info-row">
              <span class="info-bold">{{ $gettext('Take off') }} :</span>
              <span>{{ isNoTrackFlight ? (trackData?.time || '') : timeTakeOff }}</span>
              <template v-if="!isNoTrackFlight">
                <span class="info-bold">{{ $gettext('Landing') }} :</span>
                <span>{{ timeLanding }}</span>
              </template>
              <span class="info-bold">{{ $gettext('Duration') }} :</span>
              <span>{{ trackData?.duration || '' }}</span>
            </div>
            <!-- Line 3: Max GPS alt, Max climb, Max sink (only for flights with track) -->
            <div v-if="!isNoTrackFlight" class="about-row info-row">
              <span class="info-bold">{{ $gettext('Max GPS alt') }} :</span>
              <span>{{ trackData?.decodedIgc?.stat?.maxalt?.gps || '' }}m</span>
              <span class="info-bold">{{ $gettext('Max climb') }} :</span>
              <span>{{ trackData?.decodedIgc?.stat?.maxclimb || '' }}m/s</span>
              <span class="info-bold">{{ $gettext('Max sink') }} :</span>
              <span>{{ trackData?.decodedIgc?.stat?.maxsink || '' }}m/s</span>
            </div>
            <!-- Line 4: Scoring (only for flights with track) -->
            <div v-if="!isNoTrackFlight" class="about-row info-row">
              <v-btn color="success" density="compact" @click="showScoreDialog = true" :disabled="isComputingScore"
                class="ml-2">
                {{ isComputingScore ? 'Computing...' : 'Scoring' }}
              </v-btn>
              <span class="info-bold">{{ scoreLabel }}</span>
            </div>
            <ScoreDialog v-if="!isNoTrackFlight" v-model="showScoreDialog" :fixes="trackFixes" :date="trackDate"
              :scoringFn="igcScoring" @score-result="onScoreSelected" />
            <!-- Line 5: TAG and Photo buttons (always available) -->
            <div class="about-row btn-row">
              <v-btn color="orange-darken-2" density="compact" class="mr-2" @click="showTagDialog = true">
                <v-icon start>mdi-tag-outline</v-icon>
                TAG
              </v-btn>
              <TagDialog v-model="showTagDialog" :currentTag="trackData?.tag" :flightDate="trackData?.day"
                :flightSite="trackData?.site" @save="onTagSave" />
              <v-btn v-if="!trackData?.hasPhoto" color="primary" density="compact" class="mr-2"
                @click="showPhotoDialog = true">{{
                  strAddPhoto }}</v-btn>
              <LogbookPhoto v-model="showPhotoDialog" @save="onPhotoSave" />
              <v-btn v-if="trackData?.hasPhoto" color="error" density="compact" @click="onPhotoDelete">{{ strRemovePhoto
                }}</v-btn>
            </div>
          </div>
        </v-card-text>
      </v-window-item>

      <!-- COMMENT TAB (always available) -->
      <v-window-item value="comment">
        <v-card-text>
          <v-textarea v-model="commentText" :label="$gettext('Add a comment')" rows="5" variant="outlined"
            density="compact"></v-textarea>
          <div class="comment-btn-row">
            <v-btn color="error" density="compact" class="mr-2" @click="onDeleteComment">{{ strDelete }}</v-btn>
            <v-btn color="primary" density="compact" @click="onValidateComment">{{ $gettext('OK') }}</v-btn>
          </div>
        </v-card-text>
      </v-window-item>

      <!-- MODIFY TAB -->
      <v-window-item value="modify">
        <v-card-text>
          <div class="modify-btn-row">
            <!-- Line 1: Change glider and site (only for flights with track) -->
            <div v-if="!isNoTrackFlight" class="modify-line">
              <v-btn color="primary" density="compact" class="mr-2" @click="showGliderDialog = true">{{ strChangeGlider
                }}</v-btn>
              <GliderDialog v-model="showGliderDialog" :gliderList="gliderList" :currentGlider="trackData?.glider"
                @save="onGliderSave" />
              <v-btn color="primary" density="compact" @click="showSiteDialog = true">{{ strChangeSite }}</v-btn>
              <ChangeSiteDialog v-model="showSiteDialog" :siteList="siteList" :currentSite="trackData?.site"
                @save="onSiteSave" />
            </div>
            <!-- Line 2: Delete (always available) -->
            <div class="modify-line">
              <v-btn color="error" density="compact" @click="onDeleteFlight">{{ strDelete }}</v-btn>
            </div>
            <!-- Line 3: Edit and Duplicate (only for no-track flights), Merge flights (only for flights with track) -->
            <div class="modify-line">
              <v-btn v-if="isNoTrackFlight" color="warning" density="compact" class="mr-2" @click="onEdit">
                <v-icon start>mdi-pencil</v-icon>
                {{ strEdit }}
              </v-btn>
              <v-btn v-if="isNoTrackFlight" color="info" density="compact" class="mr-2" @click="onDuplicate">
                <v-icon start>mdi-content-copy</v-icon>
                {{ strDuplicate }}
              </v-btn>
              <v-btn v-if="!isNoTrackFlight" color="secondary" density="compact">{{ strMergeFlights }}</v-btn>
            </div>
          </div>
        </v-card-text>
      </v-window-item>

      <!-- SHARE TAB (only for flights with track) -->
      <v-window-item v-if="!isNoTrackFlight" value="share">
        <v-card-text>
          <div class="share-btn-row">
            <v-btn color="primary" density="compact" class="mr-3" @click="onExportIgc">
              <v-icon start>mdi-file-export</v-icon>
              {{ $gettext('IGC export') }}
            </v-btn>
            <v-btn color="secondary" density="compact" @click="onExportGpx">
              <v-icon start>mdi-file-export</v-icon>
              {{ $gettext('GPX export') }}
            </v-btn>
          </div>
        </v-card-text>
      </v-window-item>

      <!-- MORE TAB (only for flights with track)
      <v-window-item v-if="!isNoTrackFlight" value="more">
        <v-card-text>
          Autres options...
        </v-card-text>
      </v-window-item>.  
      -->
    </v-window>
  </v-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGettext } from "vue3-gettext";
import { igcScoring } from '@/js/igc/igc-scoring';
import ScoreDialog from '@/components/ScoreDialog.vue';
import GliderDialog from '@/components/GliderDialog.vue';
import ChangeSiteDialog from '@/components/ChangeSiteDialog.vue';
import TagDialog from '@/components/TagDialog.vue';
import LogbookPhoto from '@/components/LogbookPhoto.vue';
import { useDatabaseStore } from '@/stores/database';

const databaseStore = useDatabaseStore();
const { $gettext } = useGettext();

const showGliderDialog = ref(false);
const showSiteDialog = ref(false);
const showPhotoDialog = ref(false);
const showTagDialog = ref(false);
const gliderList = ref([]);
const siteList = ref([]);
const tab = ref('about'); // Onglet "About" sélectionné par défaut
const isComputingScore = ref(false);
const showScoreDialog = ref(false);
const scoreJson = ref(null);
const scoreLabel = ref('');
const commentText = ref('');
const currentTag = ref(null);
const tagsMap = ref({});

// Computed string resources to avoid template line-breaking issues
const strChangeGlider = computed(() => $gettext('Change glider'));
const strChangeSite = computed(() => $gettext('Change site'));
const strDelete = computed(() => $gettext('Delete'));
const strEdit = computed(() => $gettext('Edit'));
const strDuplicate = computed(() => $gettext('Duplicate'));
const strMergeFlights = computed(() => $gettext('Merge flights'));
const strAddPhoto = computed(() => $gettext('Add photo'));
const strRemovePhoto = computed(() => $gettext('Remove photo'));

const props = defineProps({
  trackData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:scoreJson', 'update:comment', 'update:glider', 'update:site', 'update:delete', 'update:photo', 'update:tag', 'edit-notrack', 'duplicate-notrack']);

// Computed to detect if this is a flight without GPS track
const isNoTrackFlight = computed(() => {
  // A flight without GPS track has no decodedIgc or rawIgc is empty/null
  if (!props.trackData) return false;
  const hasIgc = props.trackData.rawIgc && props.trackData.rawIgc.trim() !== '';
  const hasDecoded = props.trackData.decodedIgc && props.trackData.decodedIgc.fixes && props.trackData.decodedIgc.fixes.length > 0;
  return !hasIgc && !hasDecoded;
});


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

function loadSiteList() {
  const reqSQL = "SELECT S_ID, S_Nom, S_Localite FROM Site WHERE S_Type = 'D' ORDER BY S_Nom";
  const result = databaseStore.query(reqSQL);
  if (result.success && result.data && result.data[0]) {
    const columns = result.data[0].columns;
    const values = result.data[0].values;
    siteList.value = values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  } else {
    siteList.value = [];
  }
}

// Met à jour le commentaire affiché à chaque changement de vol
watch(() => props.trackData, (newVal) => {
  scoreLabel.value = '';
  commentText.value = newVal?.comment || '';
});

// Charger la liste des voiles à l'ouverture du dialog
watch(showGliderDialog, (val) => { if (val) loadGliderList(); });
watch(showSiteDialog, (val) => { if (val) loadSiteList(); });

function onGliderSave(newGlider) {
  // Remonte la valeur au parent (LogbookView) pour traitement
  emit('update:glider', {
    id: props.trackData?.dbId || null,
    glider: newGlider
  });
}

function onSiteSave(newSite) {
  emit('update:site', {
    id: props.trackData?.dbId || null,
    site: newSite
  });
}

function onTagSave(tagId) {
  emit('update:tag', {
    id: props.trackData?.dbId || null,
    tag: tagId
  });
  // Reload tags map in case labels changed
  loadTagsMap();
}

function loadTagsMap() {
  if (!databaseStore.hasOpenDatabase) return;
  const res = databaseStore.query("SELECT Tag_ID, Tag_Label, Tag_Color FROM Tag");
  if (res.success && res.data && res.data[0]) {
    const map = {};
    res.data[0].values.forEach(r => {
      map[r[0]] = { label: r[1], color: r[2] };
    });
    tagsMap.value = map;
  }
}

watch(() => props.trackData, () => {
  loadTagsMap();
}, { immediate: true });

function onPhotoSave(photoBase64) {
  emit('update:photo', {
    id: props.trackData?.dbId || null,
    photoData: photoBase64
  });
}

function onPhotoDelete() {
  if (confirm($gettext('Delete photo') + ' ?')) {
    emit('update:photo', {
      id: props.trackData?.dbId || null,
      photoData: null
    });
  }
}

function onDeleteFlight() {
  if (!props.trackData) return;
  const { site, day } = props.trackData;
  if (confirm(`Voulez-vous vraiment supprimer le vol de ${site} du ${day} ?`)) {
    emit('update:delete', props.trackData.dbId);
  }
}

function onEdit() {
  if (!props.trackData) return;
  // For no-track flights, emit event to open NoTrackDialog in edit mode
  if (isNoTrackFlight.value) {
    emit('edit-notrack', props.trackData.dbId);
  }
}

function onDuplicate() {
  if (!props.trackData) return;
  // For no-track flights, emit event to open NoTrackDialog in duplicate mode
  if (isNoTrackFlight.value) {
    emit('duplicate-notrack', props.trackData.dbId);
  }
}




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
  return props.trackData?.decodedIgc?.fixes || [];
});

const trackDate = computed(() => {
  return props.trackData?.decodedIgc?.info?.date || '';
});

function onScoreSelected({ league, result }) {
  if (result) {
    scoreJson.value = result;
    const sc_league = result.league
    const sc_best = result.score + ' pts'
    const sc_course = result.course
    const sc_distance = result.distance + ' km'
    const sc_multi = result.multiplier
    scoreLabel.value = `${sc_league} : ${sc_course} Distance ${sc_distance}   Score ${sc_best} Coeff =${sc_multi}`;
    // Informer le parent (LogbookView) du nouveau score calculé
    emit('update:scoreJson', result);
  }
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}min`;
}

function onExportIgc() {
  const igcContent = props.trackData?.rawIgc;
  if (!igcContent) {
    console.warn('No IGC content to export');
    return;
  }

  // Create filename from date or default
  const date = props.trackData?.day || 'flight';
  const filename = `${date.replace(/-/g, '')}_logfly.igc`;

  // Create blob and trigger download
  const blob = new Blob([igcContent], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function onExportGpx() {
  const decodedIgc = props.trackData?.decodedIgc;
  if (!decodedIgc?.fixes) {
    console.warn('No track data to export as GPX');
    return;
  }

  // Import GPX converter
  const { igcToGpx } = await import('@/js/igc/igc-to-gpx.js');

  const gpxContent = igcToGpx(decodedIgc);
  const date = props.trackData?.day || 'flight';
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

.share-btn-row {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
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
