<template>
  <OpenLogbook :show="true" />
  <div v-if="databaseStore.hasOpenDatabase">
    <h1>Sites management coming soon...</h1>
  </div>
</template>

<script setup>
import OpenLogbook from '@/components/OpenLogbook.vue';
import { useDatabaseStore } from '@/stores/database';

const databaseStore = useDatabaseStore();
</script>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>