<template>
    <v-dialog v-model="dialog" max-width="400" persistent>
        <v-card class="tag-dialog">
            <v-card-title class="text-h6 text-center pa-4">
                {{ title }}
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="pa-4">
                <div class="text-center mb-4 subtitle-2">
                    {{ $gettext('Click on the colored button') }}
                </div>

                <div v-for="tag in tags" :key="tag.Tag_ID" class="tag-row">
                    <v-btn icon size="small" :color="tag.Tag_Color" class="mr-3" @click="selectTag(tag.Tag_ID)">
                        <v-icon v-if="currentTagId === tag.Tag_ID" color="white" size="x-small">mdi-check</v-icon>
                    </v-btn>
                    <v-text-field v-model="tag.Tag_Label" density="compact" variant="outlined"
                        hide-details></v-text-field>
                </div>

                <div class="mt-6 text-center" v-if="currentTagId">
                    <v-btn color="error" variant="text" @click="clearTag">
                        {{ $gettext('No tag') }}
                    </v-btn>
                </div>
                <div class="mt-2 text-center" v-else>
                    <span class="text-grey">{{ $gettext('No tag selected') }}</span>
                </div>

            </v-card-text>
            <v-divider></v-divider>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="red-darken-1" variant="text" @click="close">
                    {{ $gettext('Cancel') }}
                </v-btn>
                <v-btn color="green-darken-1" variant="elevated" @click="save">
                    {{ $gettext('Ok') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useGettext } from "vue3-gettext"
import { useDatabaseStore } from '@/stores/database'

const { $gettext } = useGettext()
const databaseStore = useDatabaseStore()

const props = defineProps({
    modelValue: Boolean,
    currentTag: {
        type: [Number, String], // Can be null, or ID
        default: null
    },
    flightDate: String,
    flightSite: String
})

const emit = defineEmits(['update:modelValue', 'save'])

const dialog = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const tags = ref([])
const currentTagId = ref(null)

const title = computed(() => {
    if (props.flightDate && props.flightSite) {
        return `${props.flightDate} ${props.flightSite}`
    }
    return $gettext('Tag selection')
})

function loadTags() {
    // Load tags from DB
    if (!databaseStore.hasOpenDatabase) return
    const res = databaseStore.query("SELECT Tag_ID, Tag_Label, Tag_Color FROM Tag ORDER BY Tag_ID")
    if (res.success && res.data && res.data[0]) {
        tags.value = res.data[0].values.map(r => ({
            Tag_ID: r[0],
            Tag_Label: r[1],
            Tag_Color: r[2]
        }))
    }
}

watch(() => props.modelValue, (val) => {
    if (val) {
        loadTags()
        currentTagId.value = props.currentTag
    }
})

function selectTag(id) {
    currentTagId.value = id
}

function clearTag() {
    currentTagId.value = null
}

function close() {
    dialog.value = false
}

function save() {
    // 1. Save all labels
    tags.value.forEach(tag => {
        databaseStore.query(`UPDATE Tag SET Tag_Label = '${tag.Tag_Label.replace(/'/g, "''")}' WHERE Tag_ID = ${tag.Tag_ID}`)
    })

    // 2. Emit selected tag
    emit('save', currentTagId.value)
    close()
}

</script>

<style scoped>
.tag-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
}
</style>
