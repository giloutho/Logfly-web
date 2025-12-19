<template>
    <v-dialog v-model="show" max-width="600">
        <v-card>
            <v-card-title class="headline">{{ $gettext('Add photo') }}</v-card-title>
            <v-card-text>
                <div class="d-flex flex-column align-center">
                    <v-file-input v-model="file" :label="$gettext('Select a photo')" accept="image/jpeg,image/jpg"
                        prepend-icon="mdi-camera" variant="outlined" density="compact" class="w-100 mb-4"
                        @update:modelValue="onFileSelected" v-if="!previewUrl"></v-file-input>

                    <div v-if="previewUrl" class="preview-container mb-4">
                        <img :src="previewUrl" class="preview-image" alt="Preview" />
                        <v-btn icon="mdi-close" class="close-preview-btn" size="x-small" color="error"
                            @click="clearSelection"></v-btn>
                    </div>

                    <div v-if="error" class="text-error text-caption">
                        {{ error }}
                    </div>
                </div>
            </v-card-text>
            <v-card-actions class="justify-end">
                <v-btn variant="text" @click="onCancel">{{ $gettext('Cancel') }}</v-btn>
                <v-btn color="primary" @click="onOk" :disabled="!photoBuffer">{{ $gettext('OK') }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useGettext } from "vue3-gettext";

const { $gettext } = useGettext();

const props = defineProps({
    modelValue: Boolean
});

const emit = defineEmits(['update:modelValue', 'save']);

const show = ref(props.modelValue);
const file = ref(null);
const previewUrl = ref(null);
const photoBase64 = ref(null);
const error = ref('');

watch(() => props.modelValue, val => {
    show.value = val;
    if (val) {
        // Reset state on open if needed, currently keeping state potentially
        // If you want to reset every time:
        // clearSelection();
    }
});
watch(show, val => {
    if (!val) {
        clearSelection();
    }
    emit('update:modelValue', val);
});

function onCancel() {
    show.value = false;
}

function clearSelection() {
    file.value = null;
    if (previewUrl.value) {
        // No need to revoke if we use dataURL for preview, but if we used blob url we should.
        // In processImage we use FileReader dataURL, but in resizeAndBuffer we use toDataURL.
        // Actually resizeAndBuffer sets previewUrl to a data URL string, so revoke not needed for that.
        // But if we change logic... keeping it simple.
    }
    previewUrl.value = null;
    photoBase64.value = null;
    error.value = null;
}

function onFileSelected(files) {
    // v-file-input returns an array (Vue 3 / Vuetify 3) or single file depending on props
    // With defaults it returns array or file object. Let's check.
    // We used v-model="file".

    if (!files) {
        clearSelection();
        return;
    }

    const selectedFile = Array.isArray(files) ? files[0] : files;
    if (!selectedFile) return;

    processImage(selectedFile);
}

function processImage(fileObj) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            resizeAndBuffer(img);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(fileObj);
}

function resizeAndBuffer(img) {
    const canvas = document.createElement('canvas');
    const MAX_SIZE = 1024; // standard size
    let width = img.width;
    let height = img.height;

    if (width > height) {
        if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
        }
    } else {
        if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
        }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // Get Data URL (Base64)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    // Show thumbnail
    previewUrl.value = dataUrl;

    // Extract Base64 data for DB (remove "data:image/jpeg;base64,")
    const base64Data = dataUrl.split(',')[1];
    photoBase64.value = base64Data;
}

function onOk() {
    if (photoBase64.value) {
        emit('save', photoBase64.value);
        show.value = false;
    }
}
</script>

<style scoped>
.preview-container {
    position: relative;
    display: inline-block;
    border: 1px solid #ccc;
    padding: 4px;
    border-radius: 4px;
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
