<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="600">
        <v-card>
            <v-card-title>Informations</v-card-title>
            <v-card-text>
                <div v-if="trackData">
                    <p><strong>Date:</strong> {{ trackData.date || 'N/A' }}</p>
                    <p><strong>Pilote:</strong> {{ trackData.pilot || 'N/A' }}</p>
                    <p><strong>Voile:</strong> {{ trackData.glider || 'N/A' }}</p>
                    <!-- Add more stats as needed, relying on data structure -->
                </div>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="$emit('update:modelValue', false)">Fermer</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
defineProps({
    modelValue: Boolean,
    trackData: Object
})
defineEmits(['update:modelValue'])
</script>
