<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500"
        persistent>
        <v-card>
            <v-card-title class="headline">Confirmation</v-card-title>
            <v-card-text>
                <div v-if="startPoint && endPoint" class="text-body-1">
                    La trace démarrera au point {{ startPoint.index }} à {{ startPoint.time }}<br>
                    et se terminera au point {{ endPoint.index }} à {{ endPoint.time }}<br>
                    <br>
                    Le clic sur Non annule l'opération en cours.
                </div>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="grey darken-1" text @click="$emit('cancel')">Non</v-btn>
                <v-btn color="primary" @click="$emit('confirm')">Oui</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
defineProps({
    modelValue: Boolean,
    startPoint: Object,
    endPoint: Object
})
defineEmits(['update:modelValue', 'confirm', 'cancel'])
</script>
