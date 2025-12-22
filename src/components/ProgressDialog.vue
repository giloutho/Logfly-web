<template>
    <v-dialog v-model="dialogModel" persistent max-width="400">
        <v-card class="pa-4 text-center">
            <v-card-text>
                <div class="d-flex align-center justify-center gap-4 py-4">
                    <div class="text-h6 font-weight-bold message-text">
                        {{ message }}
                    </div>
                    <v-progress-circular indeterminate color="red-lighten-1" size="48" width="4"></v-progress-circular>
                </div>
            </v-card-text>
            <v-card-actions class="justify-end px-6 pb-2">
                <v-btn variant="text" size="large" color="grey-darken-1" class="text-capitalize"
                    @click="$emit('cancel')">
                    Annuler
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    modelValue: Boolean,
    message: {
        type: String,
        default: 'Airspaces checking in progress'
    }
})

const emit = defineEmits(['update:modelValue', 'cancel'])

const dialogModel = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})
</script>

<style scoped>
.message-text {
    flex: 1;
    text-align: left;
    color: #333;
}
</style>
