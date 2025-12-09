<template>
  <OpenLogbook v-if="!databaseStore.hasOpenDatabase" />
  <div v-else class="global-logbook">
    <div class="left-panel">
      <p>Base de données : {{ databaseStore.dbName }}</p>
      <p>1/2 largeur écran disponible</p>
    </div>
    <div class="right-panel">
      <div class="top-block">
        <p>1/12 hauteur écran disponible</p>
      </div>
      <div class="middle-block">
        <p>6/12 hauteur écran disponible</p>
        <p>1/2 largeur écran disponible</p>
      </div>
      <div class="bottom-block">
        <p>1/2 largeur écran disponible</p>
        <p>5/12 hauteur écran disponible</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import OpenLogbook from '@/components/OpenLogbook.vue';
import { useDatabaseStore } from '@/stores/database';

const databaseStore = useDatabaseStore();
</script>

<style scoped>
.global-logbook {
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 90vh;
  margin: 0;
  padding: 10px;
  gap: 2vw;
  box-sizing: border-box;
}

.left-panel,
.right-panel {
  width: 50%;
  height: 100%;
  box-sizing: border-box;
}

.left-panel {
  background: lightgreen;
  border: 2px solid #333;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.right-panel {
  display: flex;
  flex-direction: column;
  padding-right: 70px;
  gap: 10px;
}

.top-block {
  width: 100%;
  height: 8.33%;
  background: #f0f0f0;
  border: 2px solid #333;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.middle-block {
  width: 100%;
  height: 50%;
  background: #f0f0f0;
  border: 2px solid #333;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.bottom-block {
  width: 100%;
  height: 41.67%;
  background: #f0f0f0;
  border: 2px solid #333;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

@media (max-width: 900px) {
  .global-logbook {
    flex-direction: column;
    height: auto;
    padding: 2vw 1vw;
  }
  .left-panel,
  .right-panel {
    width: 100%;
    height: auto;
    margin-bottom: 2vw;
  }
  .right-panel {
    gap: 2vw;
  }
}
</style>