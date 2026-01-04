<template>
  <OpenLogbook :show="true" />
  <div v-if="databaseStore.hasOpenDatabase" class="equip-module-container">
    <EquipView @db-updated="$emit('db-updated')" />
  </div>
</template>

<script setup>
import OpenLogbook from '@/components/OpenLogbook.vue';
import EquipView from '@/modules/Equip/views/EquipView.vue';
import { useDatabaseStore } from '@/stores/database';

defineEmits(['db-updated']);

const databaseStore = useDatabaseStore();
</script>

<style scoped>
.equip-module-container {
  width: 100%;
  height: 100%;
}
</style>