<template>
    <v-dialog v-model="show" max-width="500">
        <v-card>
            <v-card-title class="headline">{{ $gettext('Comment') }}</v-card-title>
            <v-card-text>
                <div class="comment-header mb-2 text-caption text-grey">
                    {{ flightDate }} — {{ flightSite }}
                </div>
                <v-textarea v-model="localComment" :label="$gettext('Your comment')" variant="outlined" rows="5"
                    auto-grow autofocus counter />
            </v-card-text>
            <v-card-actions class="justify-end">
                <v-btn variant="text" @click="onCancel">{{ $gettext('Cancel') }}</v-btn>
                <v-btn color="error" variant="text" v-if="localComment" @click="onClear">{{ $gettext('Delete')
                    }}</v-btn>
                <v-btn color="primary" @click="onSave">{{ $gettext('Save') }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useGettext } from 'vue3-gettext';

const { $gettext } = useGettext();

const props = defineProps({
    modelValue: Boolean,
    currentComment: {
        type: String,
        default: ''
    },
    flightDate: {
        type: String,
        default: ''
    },
    flightSite: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['update:modelValue', 'save']);

const show = ref(props.modelValue);
const localComment = ref(props.currentComment || '');

watch(() => props.modelValue, val => {
    show.value = val;
    if (val) {
        localComment.value = props.currentComment || '';
    }
});

watch(show, val => emit('update:modelValue', val));

function onCancel() {
    show.value = false;
}

function onClear() {
    localComment.value = '';
    emit('save', '');
    show.value = false;
}

function onSave() {
    emit('save', localComment.value.trim());
    show.value = false;
}
</script>

<style scoped>
.comment-header {
    font-style: italic;
}
</style>
