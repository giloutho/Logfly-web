<template>
  <div class="the-footer">
    <v-divider></v-divider>
    <div class="footer-content">
      <span class="footer-version">v{{ version }}</span>
      <v-chip class="footer-db" color="primary" variant="outlined" size="small">
        {{ dbPath || 'Aucune base ouverte' }}
      </v-chip>
      <v-btn
        v-if="databaseStore.hasOpenDatabase"
        :color="isDirty ? 'error' : 'success'"
        density="compact"
        @click="$emit('save')"
        class="footer-save-btn"
      >
        <v-icon start>{{ isDirty ? 'mdi-alert-outline' : 'mdi-check-bold' }}</v-icon>
        {{ isDirty ? $gettext('To be saved') : $gettext('Saved') }}
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGettext } from 'vue3-gettext';
import { useDatabaseStore } from '@/stores/database';

const { $gettext } = useGettext();
const databaseStore = useDatabaseStore();

const props = defineProps({
  version: {
    type: String,
    default: '1.0.0'
  },
  isDirty: {
    type: Boolean,
    default: false
  },
  dbPath: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.the-footer {
  width: 100%;
  background: #fafbfc;
  border-top: 1px solid #e0e0e0;
  padding: 0 0 0 0;
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 10;
}
.footer-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px 6px 24px;
  min-height: 40px;
}
.footer-version {
  font-size: 0.95em;
  color: #888;
}
.footer-db {
  margin: 0 12px;
  max-width: 40vw;
  overflow: hidden;
  text-overflow: ellipsis;
}
.footer-save-btn {
  min-width: 120px;
}
</style>