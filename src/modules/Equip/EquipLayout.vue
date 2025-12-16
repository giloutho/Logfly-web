<template>
  <OpenLogbook :show="true" />
  <div v-if="databaseStore.hasOpenDatabase" class="equip-module-container">
    <h2>Equipment management</h2>
    <router-view @db-updated="$emit('db-updated')" />
  </div>
</template>

<script setup>
import OpenLogbook from '@/components/OpenLogbook.vue';
import { useDatabaseStore } from '@/stores/database';

defineEmits(['db-updated']);

const databaseStore = useDatabaseStore();
</script>