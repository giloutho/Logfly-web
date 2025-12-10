<template>
  <v-card class="details-card">
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Flight Details</span>
      <v-chip color="primary" class="ml-auto" label>
        {{ trackData.site }} {{ trackData.day }}
      </v-chip>
    </v-card-title>
    <v-tabs v-model="tab" bg-color="primary">
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
              <span class="info-bold">Score :</span> <span>{{ trackData?.score || '75 km ajouter points et bouton si null' }}</span>
              <v-btn color="success" density="compact" class="ml-4">Compute</v-btn>
            </div>
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
            label="Ajouter un commentaire"
            rows="5"
            variant="outlined"
            density="compact"
          ></v-textarea>
        </v-card-text>
      </v-window-item>

      <v-window-item value="modify">
        <v-card-text>
          Options de modification...
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
import { ref, computed } from 'vue';

const props = defineProps({
  trackData: {
    type: Object,
    default: null
  }
});

const tab = ref('about'); // Onglet "About" sélectionné par défaut

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
</style>
