<template>
    <v-dialog v-model="show" max-width="600">
        <v-card>
            <v-card-title class="headline">{{ $gettext('Change site') }}</v-card-title>
            <v-card-text>
                <div class="dialog-section">
                    <div class="dialog-label">{{ $gettext('Option 2 Switch to an existing site') }}</div>
                    <v-autocomplete v-model="selectedSite" :items="siteList" item-title="S_Nom" item-value="S_Nom"
                        :label="$gettext('Choose an existing site')" variant="outlined" density="compact" clearable
                        auto-select-first>
                        <template v-slot:item="{ props, item }">
                            <v-list-item v-bind="props" :subtitle="item.raw.S_Localite"></v-list-item>
                        </template>
                    </v-autocomplete>
                </div>

                <div class="dialog-section">
                    <div class="dialog-label">{{ $gettext('Option 1 Update name') }}</div>
                    <v-text-field v-model="newSiteName" :label="$gettext('Enter new site name')" variant="outlined"
                        density="compact" class="text-uppercase" clearable />
                </div>

                <div class="summary-section" v-if="currentSite || targetSite">
                    <span class="current-site">{{ currentSite }}</span>
                    <span class="separator"> {{ $gettext('become') }} </span>
                    <span class="target-site">{{ targetSite }}</span>
                </div>

            </v-card-text>
            <v-card-actions class="justify-end">
                <v-btn variant="text" @click="onCancel">{{ $gettext('Cancel') }}</v-btn>
                <v-btn color="primary" @click="onOk" :disabled="!targetSite">{{ $gettext('OK') }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useGettext } from "vue3-gettext";

const { $gettext } = useGettext();

const props = defineProps({
    modelValue: Boolean,
    siteList: {
        type: Array,
        default: () => []
    },
    currentSite: String
});

const emit = defineEmits(['update:modelValue', 'save']);

const show = ref(props.modelValue);
const selectedSite = ref('');
const newSiteName = ref('');

watch(() => props.modelValue, val => show.value = val);
watch(show, val => emit('update:modelValue', val));

// Reset fields when dialog opens
watch(() => props.modelValue, (val) => {
    if (val) {
        selectedSite.value = '';
        newSiteName.value = '';
    }
});

// Force la saisie en majuscules
watch(newSiteName, (val) => {
    if (val) {
        newSiteName.value = val.toUpperCase();
    }
});

const targetSite = computed(() => {
    if (newSiteName.value && newSiteName.value.trim()) {
        return newSiteName.value.trim().toUpperCase();
    }
    return selectedSite.value || '';
});

function onCancel() {
    show.value = false;
}

function onOk() {
    if (targetSite.value) {
        emit('save', targetSite.value);
        show.value = false;
    }
}
</script>

<style scoped>
.dialog-section {
    background: #e3f3fa;
    border-radius: 8px;
    padding: 16px 12px;
    margin-bottom: 16px;
}

.dialog-label {
    font-size: 1.1em;
    font-weight: 600;
    margin-bottom: 8px;
}

.summary-section {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 8px;
    font-size: 1.1em;
    gap: 10px;
}

.current-site {
    font-weight: bold;
    color: #555;
}

.separator {
    font-style: italic;
    color: #777;
}

.target-site {
    font-weight: bold;
    color: #1867C0;
    /* Primary color usually */
}
</style>
