<template>
    <v-dialog v-model="show" max-width="600">
        <v-card>
            <v-card-title class="headline d-flex align-center justify-space-between">
                <span>{{ $gettext('Photo') }}</span>
                <v-btn icon="mdi-close" variant="text" size="small" @click="show = false" />
            </v-card-title>
            <v-card-text>
                <div class="d-flex flex-column align-center">

                    <!-- Existing photo display when hasPhoto is true and no new selection -->
                    <div v-if="hasPhoto && !previewUrl && currentPhotoUrl" class="preview-container mb-4">
                        <img :src="currentPhotoUrl" class="preview-image" alt="Current photo" />
                        <p class="text-caption text-center text-grey mt-2">{{ $gettext('Current photo') }}</p>
                    </div>

                    <!-- File picker: shown only when no photo exists yet or user wants to replace -->
                    <v-file-input v-if="!hasPhoto || showFilePicker" v-model="file"
                        :label="hasPhoto ? $gettext('Select a replacement photo') : $gettext('Select a photo')"
                        accept="image/jpeg,image/jpg" prepend-icon="mdi-camera" variant="outlined" density="compact"
                        class="w-100 mb-4" @update:modelValue="onFileSelected" />

                    <!-- New photo preview after selection -->
                    <div v-if="previewUrl" class="preview-container mb-4">
                        <img :src="previewUrl" class="preview-image" alt="Preview" />
                        <v-btn icon="mdi-close" class="close-preview-btn" size="x-small" color="error"
                            @click="clearSelection" />
                        <p class="text-caption text-center text-grey mt-2">{{ $gettext('New photo') }}</p>
                    </div>

                    <!-- Button to replace current photo -->
                    <v-btn v-if="hasPhoto && !showFilePicker && !previewUrl" variant="outlined" color="primary"
                        class="mb-2" prepend-icon="mdi-image-edit-outline" @click="showFilePicker = true">
                        {{ $gettext('Replace photo') }}
                    </v-btn>

                    <div v-if="error" class="text-error text-caption">{{ error }}</div>
                </div>
            </v-card-text>
            <v-card-actions class="justify-end">
                <v-btn variant="text" @click="onCancel">{{ $gettext('Cancel') }}</v-btn>
                <!-- Delete button: only if there's an existing photo -->
                <v-btn v-if="hasPhoto" color="error" variant="tonal" prepend-icon="mdi-delete" @click="onDelete">
                    {{ $gettext('Delete') }}
                </v-btn>
                <!-- Save button: only enabled when new photo selected -->
                <v-btn color="primary" @click="onOk" :disabled="!photoBase64">
                    {{ $gettext('OK') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useGettext } from "vue3-gettext";

const { $gettext } = useGettext();

const props = defineProps({
    modelValue: Boolean,
    hasPhoto: {
        type: Boolean,
        default: false
    },
    currentPhotoUrl: {
        type: String,
        default: null
    }
});

const emit = defineEmits(['update:modelValue', 'save', 'delete']);

const show = ref(props.modelValue);
const file = ref(null);
const previewUrl = ref(null);
const photoBase64 = ref(null);
const error = ref('');
const showFilePicker = ref(false);

watch(() => props.modelValue, val => {
    show.value = val;
    if (val) {
        // Reset new-photo state but keep hasPhoto/currentPhotoUrl (from props)
        clearSelection();
        showFilePicker.value = false;
    }
});
watch(show, val => {
    if (!val) clearSelection();
    emit('update:modelValue', val);
});

function onCancel() {
    show.value = false;
}

function clearSelection() {
    file.value = null;
    previewUrl.value = null;
    photoBase64.value = null;
    error.value = null;
}

function onFileSelected(files) {
    if (!files) { clearSelection(); return; }
    const selectedFile = Array.isArray(files) ? files[0] : files;
    if (!selectedFile) return;
    processImage(selectedFile);
}

function processImage(fileObj) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resizeAndBuffer(img);
        img.src = e.target.result;
    };
    reader.readAsDataURL(fileObj);
}

function resizeAndBuffer(img) {
    const canvas = document.createElement('canvas');
    const MAX_SIZE = 1024;
    let width = img.width;
    let height = img.height;
    if (width > height) {
        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
    } else {
        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
    }
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    previewUrl.value = dataUrl;
    photoBase64.value = dataUrl.split(',')[1];
}

function onOk() {
    if (photoBase64.value) {
        emit('save', photoBase64.value);
        show.value = false;
    }
}

function onDelete() {
    emit('delete');
    show.value = false;
}
</script>

<style scoped>
.preview-container {
    position: relative;
    display: inline-block;
    border: 1px solid #ccc;
    padding: 4px;
    border-radius: 4px;
    text-align: center;
}

.preview-image {
    max-width: 100%;
    max-height: 300px;
    display: block;
}

.close-preview-btn {
    position: absolute;
    top: -10px;
    right: -10px;
    background-color: white;
}
</style>
