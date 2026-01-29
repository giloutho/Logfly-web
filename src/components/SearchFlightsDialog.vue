<template>
    <v-dialog v-model="show" max-width="500" persistent>
        <v-card class="search-dialog">
            <v-card-title class="headline d-flex align-center bg-primary">
                <v-icon class="mr-2">mdi-magnify</v-icon>
                {{ $gettext('Advanced search') }}
            </v-card-title>

            <v-card-text class="pa-4">
                <!-- Row 1: Date début / Heure début -->
                <v-row dense class="mb-2">
                    <v-col cols="5">
                        <div class="field-label">{{ $gettext('Start date') }}</div>
                        <v-text-field v-model="form.dateStart" type="date" variant="outlined" density="compact"
                            hide-details clearable class="date-field" />
                    </v-col>
                    <v-col cols="4">
                        <div class="field-label">{{ $gettext('Start time') }}</div>
                        <v-text-field v-model="form.timeStart" type="time" variant="outlined" density="compact"
                            hide-details clearable class="time-field" />
                    </v-col>
                </v-row>

                <!-- Row 2: Date fin / Heure fin -->
                <v-row dense class="mb-2">
                    <v-col cols="5">
                        <div class="field-label">{{ $gettext('End date') }}</div>
                        <v-text-field v-model="form.dateEnd" type="date" variant="outlined" density="compact"
                            hide-details clearable class="date-field" />
                    </v-col>
                    <v-col cols="4">
                        <div class="field-label">{{ $gettext('End time') }}</div>
                        <v-text-field v-model="form.timeEnd" type="time" variant="outlined" density="compact"
                            hide-details clearable class="time-field" />
                    </v-col>
                </v-row>

                <!-- Row 3: Durée min / Durée max -->
                <v-row dense class="mb-2">
                    <v-col cols="6">
                        <div class="field-label">{{ $gettext('Min duration') }}</div>
                        <div class="duration-inputs">
                            <v-text-field v-model.number="form.durationMinHours" type="number" variant="outlined"
                                density="compact" hide-details min="0" max="23" suffix="h" class="duration-field"
                                clearable />
                            <v-text-field v-model.number="form.durationMinMinutes" type="number" variant="outlined"
                                density="compact" hide-details min="0" max="59" suffix="mn" class="duration-field"
                                clearable />
                        </div>
                    </v-col>
                    <v-col cols="6">
                        <div class="field-label">{{ $gettext('Max duration') }}</div>
                        <div class="duration-inputs">
                            <v-text-field v-model.number="form.durationMaxHours" type="number" variant="outlined"
                                density="compact" hide-details min="0" max="23" suffix="h" class="duration-field"
                                clearable />
                            <v-text-field v-model.number="form.durationMaxMinutes" type="number" variant="outlined"
                                density="compact" hide-details min="0" max="59" suffix="mn" class="duration-field"
                                clearable />
                        </div>
                    </v-col>
                </v-row>

                <!-- Row 4: Engin -->
                <v-row dense class="mb-2">
                    <v-col cols="12">
                        <div class="field-label">{{ $gettext('Glider') }}</div>
                        <v-text-field v-model="form.glider" variant="outlined" density="compact" hide-details clearable
                            :placeholder="$gettext('Search in glider name')" />
                    </v-col>
                </v-row>

                <!-- Row 5: Site -->
                <v-row dense class="mb-2">
                    <v-col cols="12">
                        <div class="field-label">{{ $gettext('Site') }}</div>
                        <v-text-field v-model="form.site" variant="outlined" density="compact" hide-details clearable
                            :placeholder="$gettext('Search in site name')" />
                    </v-col>
                </v-row>

                <!-- Row 6: Pays -->
                <v-row dense class="mb-2">
                    <v-col cols="12">
                        <div class="field-label">{{ $gettext('Country') }}</div>
                        <v-text-field v-model="form.country" variant="outlined" density="compact" hide-details clearable
                            :placeholder="$gettext('Search in country')" />
                    </v-col>
                </v-row>

                <!-- Row 7: Commentaire -->
                <v-row dense class="mb-2">
                    <v-col cols="12">
                        <div class="field-label">{{ $gettext('Comment') }}</div>
                        <v-text-field v-model="form.comment" variant="outlined" density="compact" hide-details clearable
                            :placeholder="$gettext('Search in comments')" />
                    </v-col>
                </v-row>

                <!-- Row 8: Photo checkbox -->
                <v-row dense class="mb-2">
                    <v-col cols="12">
                        <v-checkbox v-model="form.hasPhoto" :label="$gettext('Has photo')" hide-details
                            density="compact" />
                    </v-col>
                </v-row>

                <!-- Status message -->
                <v-alert v-if="statusMessage" :type="statusType" variant="tonal" density="compact" class="mt-2">
                    {{ statusMessage }}
                </v-alert>
            </v-card-text>

            <v-card-actions class="justify-space-between pa-4">
                <v-btn color="grey" variant="text" @click="resetForm">
                    <v-icon start>mdi-refresh</v-icon>
                    {{ $gettext('Reset') }}
                </v-btn>
                <div>
                    <v-btn color="error" variant="flat" class="mr-2" @click="onCancel">
                        {{ $gettext('Cancel') }}
                    </v-btn>
                    <v-btn color="primary" variant="flat" @click="onSearch">
                        <v-icon start>mdi-magnify</v-icon>
                        {{ $gettext('Search') }}
                    </v-btn>
                </div>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { useGettext } from 'vue3-gettext';

const { $gettext } = useGettext();

const props = defineProps({
    modelValue: Boolean
});

const emit = defineEmits(['update:modelValue', 'search']);

const show = ref(props.modelValue);
const statusMessage = ref('');
const statusType = ref('info');

// Form data
const form = reactive({
    dateStart: null,
    timeStart: null,
    dateEnd: null,
    timeEnd: null,
    durationMinHours: null,
    durationMinMinutes: null,
    durationMaxHours: null,
    durationMaxMinutes: null,
    glider: '',
    site: '',
    country: '',
    comment: '',
    hasPhoto: false
});

// Sync dialog visibility
watch(() => props.modelValue, val => {
    show.value = val;
    if (val) {
        statusMessage.value = '';
    }
});
watch(show, val => emit('update:modelValue', val));

/**
 * Build SQL WHERE clauses from form data
 */
function buildSqlCriteria() {
    const conditions = [];

    // Date/Time range (V_Date is in format 'YYYY-MM-DD HH:MM:SS')
    if (form.dateStart || form.timeStart) {
        const date = form.dateStart || '1900-01-01';
        const time = form.timeStart ? form.timeStart + ':00' : '00:00:00';
        const sqlDateTimeStart = `${date} ${time}`;
        conditions.push(`V_Date >= '${sqlDateTimeStart}'`);
    }

    if (form.dateEnd || form.timeEnd) {
        const date = form.dateEnd || '2100-12-31';
        const time = form.timeEnd ? form.timeEnd + ':59' : '23:59:59';
        const sqlDateTimeEnd = `${date} ${time}`;
        conditions.push(`V_Date <= '${sqlDateTimeEnd}'`);
    }

    // Duration range (V_Duree is in seconds)
    const durationMinSeconds = ((form.durationMinHours || 0) * 3600) + ((form.durationMinMinutes || 0) * 60);
    if (durationMinSeconds > 0) {
        conditions.push(`V_Duree >= ${durationMinSeconds}`);
    }

    const durationMaxSeconds = ((form.durationMaxHours || 0) * 3600) + ((form.durationMaxMinutes || 0) * 60);
    if (durationMaxSeconds > 0) {
        conditions.push(`V_Duree <= ${durationMaxSeconds}`);
    }

    // LIKE searches
    if (form.glider && form.glider.trim()) {
        const escaped = form.glider.replace(/'/g, "''");
        conditions.push(`V_Engin LIKE '%${escaped}%'`);
    }

    if (form.site && form.site.trim()) {
        const escaped = form.site.replace(/'/g, "''");
        conditions.push(`V_Site LIKE '%${escaped}%'`);
    }

    if (form.country && form.country.trim()) {
        const escaped = form.country.replace(/'/g, "''");
        conditions.push(`V_Pays LIKE '%${escaped}%'`);
    }

    if (form.comment && form.comment.trim()) {
        const escaped = form.comment.replace(/'/g, "''");
        conditions.push(`V_Commentaire LIKE '%${escaped}%'`);
    }

    // Photo filter
    if (form.hasPhoto) {
        conditions.push(`V_Photos IS NOT NULL AND V_Photos != ''`);
    }

    return conditions;
}

function onSearch() {
    const conditions = buildSqlCriteria();

    if (conditions.length === 0) {
        statusMessage.value = $gettext('Please enter at least one search criterion');
        statusType.value = 'warning';
        return;
    }

    // Build WHERE clause
    const whereClause = conditions.join(' AND ');

    // Emit search event with the WHERE clause
    emit('search', whereClause);
    show.value = false;
}

function resetForm() {
    form.dateStart = null;
    form.timeStart = null;
    form.dateEnd = null;
    form.timeEnd = null;
    form.durationMinHours = null;
    form.durationMinMinutes = null;
    form.durationMaxHours = null;
    form.durationMaxMinutes = null;
    form.glider = '';
    form.site = '';
    form.country = '';
    form.comment = '';
    form.hasPhoto = false;
    statusMessage.value = '';
}

function onCancel() {
    show.value = false;
}
</script>

<style scoped>
.search-dialog {
    border-radius: 12px;
}

.headline {
    color: white;
}

.field-label {
    font-size: 0.85em;
    font-weight: 600;
    color: #555;
    margin-bottom: 4px;
}

.duration-inputs {
    display: flex;
    gap: 8px;
}

.duration-field {
    flex: 1;
    max-width: 100px;
}

.duration-field :deep(input) {
    text-align: center;
}

.date-field {
    max-width: 170px;
}

.time-field {
    max-width: 120px;
}
</style>
