<template>
    <v-dialog v-model="dialogVisible" width="90vw" max-width="1200" persistent scrollable>
        <SiteForm :site="site" @submit="onSubmit" @cancel="onCancel" />
    </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import SiteForm from '@/components/SiteForm.vue';

// Props
const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    site: {
        type: Object,
        default: null
    }
});

// Emits
const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

// Local dialog state synced with v-model
const dialogVisible = ref(props.modelValue);

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
    dialogVisible.value = newVal;
});

// Watch for internal changes and emit
watch(dialogVisible, (newVal) => {
    emit('update:modelValue', newVal);
});

/**
 * Handle form submission
 */
function onSubmit(siteData) {
    emit('submit', siteData);
    dialogVisible.value = false;
}

/**
 * Handle cancel
 */
function onCancel() {
    emit('cancel');
    dialogVisible.value = false;
}
</script>
