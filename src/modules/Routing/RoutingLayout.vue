<template>
  <router-view @db-updated="$emit('db-updated')" />
</template>

<script setup>
defineEmits(['db-updated']);
</script>