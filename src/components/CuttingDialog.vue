<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="600">
        <v-card>
            <v-card-title>Couper la trace</v-card-title>
            <v-card-text>
                Fonctionnalité en cours de développement.
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
    modelValue: Boolean
})
defineEmits(['update:modelValue'])
</script>
