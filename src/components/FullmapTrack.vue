<template>
  <section>
     <div class="toolbar-row">
        <v-btn class="toolbar-btn" color="default">Infos</v-btn>     
        <v-btn class="toolbar-btn" color="default">Chronologie</v-btn>
        <v-btn class="toolbar-btn" color="default">Espaces aériens</v-btn>    
        <v-btn class="toolbar-btn" color="default" >Score</v-btn> 
        <v-btn class="toolbar-btn" color="default">Mesurer</v-btn>
        <v-btn class="toolbar-btn" color="default">Couper</v-btn>
     </div> 
        <div class="toolbar-separator"></div>     
  </section>
</template>    

<script setup>
import { ref } from "vue";
import { useGettext } from "vue3-gettext";

// eslint-disable-next-line no-unused-vars
const props = defineProps({
  analysisData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['close']);
const { $gettext } = useGettext();

function close() {
  emit('close');
}

const scoreDialog = ref(false)
const scores = [
  'FFVL',
  'XContest',
  'FAI',
  'FAI-Cylinders',
  'FAI-OAR',
  'FAI-OAR2',
  'XCLeague'
]

const infosDialog = ref(false)

</script>

<style scoped>
section {
  padding: 0.5rem;
  text-align: left;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  width: 100%;
  box-sizing: border-box;
}
.toolbar-btn {
  font-size: 0.85rem;
  min-width: 80px;
  padding: 0 10px;
  background: #f5f5f5;
  color: #333;
  border-radius: 4px;
  box-shadow: none;
}
.toolbar-separator {
  width: 100%;
  height: 2px;
  background: #e0e0e0;
  margin-bottom: 8px;
  display: block;
}
h1 {
  color: #8e76e4;
  margin-bottom: 1rem;
}
.map-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.map-container {
  width: 100%;
  flex: 1;
  min-height: 0;
  z-index: 1;
}
.altitude-graph {
  width: 100%;
  height: 150px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
}
.chart-container {
  width: 100%;
  height: 100%;
  padding: 5px;
}
.graph-info {
  width: 100%;
  min-height: 28px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  border-top: 1px solid #e0e0e0;
  font-size: 1.05em;
  padding: 6px 12px;
  color: #333;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
</style>