<template>
    <v-dialog v-model="show" max-width="600">
        <v-card>
            <v-card-title class="headline">{{ $gettext('Take off') }}</v-card-title>
            <v-card-text>
                <!-- Section 1: Choose an existing site -->
                <div class="dialog-section">
                    <div class="dialog-label">{{ $gettext('Choose a logbook site') }}</div>
                    <v-autocomplete v-model="selectedSite" :items="siteList" item-title="S_Nom" item-value="S_ID"
                        :label="$gettext('Choose an existing site')" variant="outlined" density="compact" clearable
                        auto-select-first return-object>
                        <template v-slot:item="{ props, item }">
                            <v-list-item v-bind="props" :subtitle="item.raw.S_Localite + ' ' + item.raw.S_Pays">
                            </v-list-item>
                        </template>
                    </v-autocomplete>
                </div>

                <!-- Section 2: Create a new site -->
                <div class="dialog-section">
                    <div class="dialog-label">{{ $gettext('Or create a new site') }}</div>
                    <v-btn color="success" variant="flat" prepend-icon="mdi-map-marker-plus" @click="openSiteForm">
                        {{ $gettext('Create a new site') }}
                    </v-btn>
                </div>

                <!-- Summary section -->
                <div class="summary-section" v-if="displaySite">
                    <v-icon color="primary" class="mr-2">mdi-map-marker</v-icon>
                    <span class="selected-site-name">{{ displaySite.S_Nom }}</span>
                    <span class="selected-site-details" v-if="displaySite.S_Localite || displaySite.S_Pays">
                        ({{ [displaySite.S_Localite, displaySite.S_Pays].filter(Boolean).join(', ') }})
                    </span>
                    <span class="selected-site-alt" v-if="displaySite.S_Alti">
                        - {{ displaySite.S_Alti }}m
                    </span>
                </div>

            </v-card-text>
            <v-card-actions class="justify-end">
                <v-btn variant="text" @click="onCancel">{{ $gettext('Cancel') }}</v-btn>
                <v-btn color="primary" @click="onOk" :disabled="!displaySite">{{ $gettext('OK') }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- SiteFormDialog for creating new site -->
    <SiteFormDialog v-model="showSiteForm" :site="newSiteData" @submit="onSiteCreated" @cancel="showSiteForm = false" />
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useGettext } from "vue3-gettext";
import SiteFormDialog from '@/components/SiteFormDialog.vue';

const { $gettext } = useGettext();

const props = defineProps({
    modelValue: Boolean,
    siteList: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update:modelValue', 'save', 'site-created']);

const show = ref(props.modelValue);
const selectedSite = ref(null);
const showSiteForm = ref(false);
const newlyCreatedSite = ref(null);

// New site data template (Take Off type by default)
const newSiteData = ref({
    id: 0,
    typeSite: 'D', // D = Take Off
    nom: '',
    orient: '',
    alti: '',
    cp: '',
    localite: '',
    pays: '',
    lat: 45.835775,
    long: 6.205428,
    comment: ''
});

watch(() => props.modelValue, val => show.value = val);
watch(show, val => emit('update:modelValue', val));

// Reset fields when dialog opens
watch(() => props.modelValue, (val) => {
    if (val) {
        selectedSite.value = null;
        newlyCreatedSite.value = null;
    }
});

// The site to display (either selected or newly created)
const displaySite = computed(() => {
    if (newlyCreatedSite.value) {
        return newlyCreatedSite.value;
    }
    return selectedSite.value;
});

function openSiteForm() {
    // Reset new site data
    newSiteData.value = {
        id: 0,
        typeSite: 'D',
        nom: '',
        orient: '',
        alti: '',
        cp: '',
        localite: '',
        pays: '',
        lat: 45.835775,
        long: 6.205428,
        comment: ''
    };
    showSiteForm.value = true;
}

function onSiteCreated(siteData) {
    // Emit event to save to database (parent will handle DB insert)
    emit('site-created', siteData);

    // Store the newly created site for display
    newlyCreatedSite.value = {
        S_ID: siteData.id || 0,
        S_Nom: siteData.nom,
        S_Localite: siteData.localite,
        S_Pays: siteData.pays,
        S_Alti: siteData.alti,
        S_Latitude: siteData.lat,
        S_Longitude: siteData.long,
        isNew: true
    };

    // Clear autocomplete selection
    selectedSite.value = null;
    showSiteForm.value = false;
}

function onCancel() {
    show.value = false;
}

function onOk() {
    if (displaySite.value) {
        emit('save', displaySite.value);
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
    flex-wrap: wrap;
    padding: 12px;
    background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    border-radius: 8px;
    font-size: 1.1em;
    gap: 6px;
    border: 1px solid #ddd;
}

.selected-site-name {
    font-weight: bold;
    color: #1867C0;
}

.selected-site-details {
    color: #555;
}

.selected-site-alt {
    color: #777;
    font-weight: 500;
}
</style>
