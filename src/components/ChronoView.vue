<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500"
        scrollable location="top start" origin="top start" class="chrono-dialog">
        <v-card>
            <v-card-title class="pa-0">
                <v-toolbar color="primary" density="compact" height="40">
                    <v-toolbar-title class="text-subtitle-1">Chronologie du vol</v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-btn icon size="small" @click="$emit('update:modelValue', false)">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                </v-toolbar>
            </v-card-title>
            <v-card-text class="pa-0" style="height: 500px;">
                <v-table density="compact" fixed-header height="100%">
                    <thead>
                        <tr>
                            <th class="text-left">{{ $gettext('Time') }}</th>
                            <th class="text-left">{{ $gettext('Elapsed') }}</th>
                            <th class="text-left">{{ $gettext('Alt') }}</th>
                            <th class="text-left">{{ $gettext('Type') }}</th>
                            <th class="text-left">{{ $gettext('Infos') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in chronology" :key="index" :class="getRowClass(item, index)"
                            @click="onRowClick(item)" class="clickable-row">
                            <td>{{ item.time }}</td>
                            <td>{{ item.elapsed || '00:00' }}</td>
                            <td>{{ item.alt }}</td>
                            <td>
                                <span class="chrono-link" :class="getLinkClass(item.category)">
                                    <v-icon size="small" class="mr-1">{{ getIcon(item.category) }}</v-icon>
                                    {{ getLabel(item.category) }}
                                </span>
                            </td>
                            <td class="text-grey-darken-1">{{ getInfo(item) }}</td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useGettext } from "vue3-gettext";

const { $gettext } = useGettext()

const props = defineProps({
    modelValue: Boolean,
    anaResult: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['update:modelValue', 'jump-to', 'jump-to-takeoff', 'jump-to-landing'])

const chronology = computed(() => {
    if (!props.anaResult || !props.anaResult.course) return []
    return props.anaResult.course
})

const maxThermalGain = computed(() => {
    const thermals = chronology.value.filter(item => item.category === 'T')
    return thermals.length > 0 ? Math.max(...thermals.map(item => Number(item.data1) || 0)) : -1
})

const maxGlideDist = computed(() => {
    const glides = chronology.value.filter(item => item.category === 'G')
    return glides.length > 0 ? Math.max(...glides.map(item => Number(item.data1) || 0)) : -1
})

function getRowClass(item, index) {
    if (item.category === 'T' && Number(item.data1) === maxThermalGain.value && maxThermalGain.value > 0) {
        return 'best-thermal'
    }
    if (item.category === 'G' && Number(item.data1) === maxGlideDist.value && maxGlideDist.value > 0) {
        return 'best-glide'
    }
    return index % 2 === 0 ? 'bg-grey-lighten-4' : 'bg-white'
}

function getIcon(category) {
    switch (category) {
        case 'K': return 'mdi-airplane-takeoff'
        case 'T': return 'mdi-cloud-upload'
        case 'G': return 'mdi-arrow-right'
        case 'L': return 'mdi-flag-checkered'
        default: return ''
    }
}

function getLabel(category) {
    switch (category) {
        case 'K': return $gettext('Take off')
        case 'T': return $gettext('Thermal')
        case 'G': return $gettext('Glide')
        case 'L': return $gettext('Landing')
        default: return ''
    }
}

function getLinkClass(category) {
    switch (category) {
        case 'K': return 'text-primary'
        case 'T': return 'text-success'
        case 'G': return 'text-orange'
        case 'L': return 'text-primary'
        default: return ''
    }
}

function getInfo(item) {
    switch (item.category) {
        case 'T':
            return `[+${item.data1}m ${(Math.round(item.data2 * 100) / 100).toFixed(2)}m/s]`
        case 'G':
            return `[+${item.data1}km ${item.data2}km/h]`
        default:
            return ''
    }
}

function onRowClick(item) {
    console.log('ChronoView: onRowClick', item)
    if (item.category === 'K') {
        console.log('ChronoView: emitting jump-to-takeoff')
        emit('jump-to-takeoff')
    } else if (item.category === 'L') {
        console.log('ChronoView: emitting jump-to-landing')
        emit('jump-to-landing')
    } else if (item.coords) {
        console.log('ChronoView: emitting jump-to', item.coords)
        emit('jump-to', item.coords)
    } else {
        console.warn('ChronoView: Item has no coords and no special category', item)
    }
}
</script>

<style scoped>
.chrono-dialog {
    margin: 60px 0 0 10px !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
}

.chrono-link {
    text-decoration: none;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
}

.text-success {
    color: #43a047 !important;
}

.text-orange {
    color: #fb8c00 !important;
}

.clickable-row {
    cursor: pointer;
    font-size: 0.85rem;
}

.clickable-row td {
    height: 32px !important;
    padding: 0 8px !important;
}

.clickable-row:hover {
    background-color: #f5f5f5 !important;
}

.best-thermal td {
    background-color: #d4f8d7 !important;
    /* Vert très clair */
    font-weight: bold !important;
}

.best-glide td {
    background-color: #f5dfbb !important;
    /* Orange très clair */
    font-weight: bold !important;
}

/* Reduire la taille des en-têtes */
:deep(th) {
    font-size: 0.8rem !important;
    height: 32px !important;
    padding: 0 8px !important;
}
</style>
