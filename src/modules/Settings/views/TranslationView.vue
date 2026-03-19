<template>
    <div class="translation-view">
        <!-- Selection Dialog -->
        <v-dialog v-model="showSelectionDialog" persistent max-width="600">
            <v-card>
                <v-card-title class="text-h5 d-flex align-center">
                    <v-icon class="mr-2">mdi-translate</v-icon>
                    {{ $gettext('Translation Editor') }}
                </v-card-title>

                <v-card-text>
                    <!-- Firebase connection status -->
                    <v-alert v-if="firebaseError" type="warning" variant="tonal" class="mb-4" density="compact">
                        <div class="d-flex align-center">
                            <v-icon class="mr-2">mdi-cloud-off-outline</v-icon>
                            {{ firebaseError }}
                        </div>
                    </v-alert>

                    <!-- Available translations (incomplete only) -->
                    <div v-if="incompleteTranslations.length > 0" class="mb-4">
                        <div class="text-subtitle-2 mb-2">{{ $gettext('Continue a translation') }}</div>
                        <v-list density="compact" class="translation-list">
                            <v-list-item v-for="trans in incompleteTranslations" :key="trans.lang"
                                @click="loadFromServer(trans.lang)" class="translation-item">
                                <template v-slot:prepend>
                                    <span class="lang-flag mr-3">{{ getFlagEmoji(trans.lang) }}</span>
                                </template>
                                <v-list-item-title>{{ trans.label }}</v-list-item-title>
                                <v-list-item-subtitle>
                                    {{ trans.translated }} / {{ trans.total }} ({{ trans.progress }}%)
                                </v-list-item-subtitle>
                                <template v-slot:append>
                                    <v-progress-circular :model-value="trans.progress" :size="32" :width="3"
                                        :color="getProgressColor(trans.progress)">
                                    </v-progress-circular>
                                </template>
                            </v-list-item>
                        </v-list>
                    </div>

                    <v-divider v-if="incompleteTranslations.length > 0" class="mb-4"></v-divider>

                    <!-- New translation -->
                    <div class="text-subtitle-2 mb-2">{{ $gettext('New translation') }}</div>
                    <div class="d-flex align-center gap-3">
                        <v-select v-model="newTranslationLang" :items="availableNewLanguages"
                            :label="$gettext('Select a language')" density="compact" variant="outlined" hide-details
                            item-title="label" item-value="code" class="flex-grow-1">
                        </v-select>
                        <v-btn color="primary" :disabled="!newTranslationLang" @click="startNewTranslation">
                            {{ $gettext('Start') }}
                        </v-btn>
                    </div>

                    <!-- Load from file option -->
                    <div class="mt-4">
                        <v-btn variant="outlined" prepend-icon="mdi-folder-open" @click="loadPoFromFile" block>
                            {{ $gettext('Load from file') }}
                        </v-btn>
                        <input ref="fileInput" type="file" accept=".po" style="display: none" @change="handleFileLoad">
                    </div>
                </v-card-text>

                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="closeDialog">{{ $gettext('Cancel') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <h1 class="text-h5 mb-4">{{ $gettext('Translation Editor') }}</h1>

        <v-alert v-if="loading" type="info" variant="tonal" class="mb-4">
            {{ $gettext('Loading translations') }}...
        </v-alert>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
            {{ error }}
        </v-alert>

        <!-- Controls bar -->
        <div class="controls-bar mb-4">
            <v-text-field v-model="search" :label="$gettext('Search')" prepend-inner-icon="mdi-magnify" single-line
                hide-details clearable density="compact" variant="outlined" class="search-field"></v-text-field>

            <v-select v-model="selectedContext" :items="availablePoFiles" :label="$gettext('Already translated')"
                density="compact" variant="outlined" hide-details clearable class="context-select" item-title="label"
                item-value="code" @update:model-value="onContextChange"></v-select>

            <v-chip v-if="selectedTargetLang" color="primary" variant="flat" class="target-chip">
                {{ getFlagEmoji(selectedTargetLang) }} {{ targetColumnTitle }}
            </v-chip>

            <v-btn color="secondary" prepend-icon="mdi-swap-horizontal" @click="showSelectionDialog = true"
                density="comfortable">
                {{ $gettext('Change') }}
            </v-btn>
        </div>

        <!-- Progress counter with filter button -->
        <div v-if="selectedTargetLang" class="progress-bar mb-3">
            <v-btn prepend-icon="mdi-filter" :color="filterUntranslated ? 'error' : 'default'" size="small"
                :variant="filterUntranslated ? 'flat' : 'outlined'" @click="filterUntranslated = !filterUntranslated"
                class="mr-2">
                {{ $gettext('Untranslated') }}
            </v-btn>
            <v-chip color="primary" variant="tonal" size="small">
                {{ translatedCount }} / {{ totalCount }} ({{ translatedPercent }}%)
            </v-chip>
        </div>

        <v-data-table :headers="dynamicHeaders" :items="filteredTranslations" :search="search" :items-per-page="10"
            :items-per-page-options="[{ value: 10, title: '10' }]" density="compact" class="elevation-1">
            <template v-slot:item.key="{ item }">
                <span class="text-caption">{{ item.key }}</span>
            </template>

            <template v-slot:item.context="{ item }">
                <span :class="{ 'text-grey': !item.context }">
                    {{ item.context || '—' }}
                </span>
            </template>

            <template v-slot:item.target="{ item }">
                <div class="d-flex align-center">
                    <template v-if="item.isEditing">
                        <v-text-field v-model="item.targetValue" density="compact" variant="outlined" hide-details
                            single-line class="edit-field mr-2" @keyup.enter="saveEdit(item)"
                            @keyup.escape="cancelEdit(item)" autofocus></v-text-field>
                        <v-btn icon size="small" color="success" variant="text" @click="saveEdit(item)">
                            <v-icon>mdi-check</v-icon>
                        </v-btn>
                        <v-btn icon size="small" color="error" variant="text" @click="cancelEdit(item)">
                            <v-icon>mdi-close</v-icon>
                        </v-btn>
                    </template>
                    <template v-else>
                        <span class="mr-2" :class="{ 'text-grey': !item.targetValue }">
                            {{ item.targetValue || '—' }}
                        </span>
                        <v-btn icon size="small" variant="text" @click="toggleEdit(item)">
                            <v-icon>mdi-pencil</v-icon>
                        </v-btn>
                    </template>
                </div>
            </template>
        </v-data-table>

        <div class="mt-4 d-flex justify-end gap-2">
            <v-btn color="secondary" variant="outlined" prepend-icon="mdi-download" @click="exportToFile"
                :disabled="!hasChanges">
                {{ $gettext('Download') }}
            </v-btn>
            <v-btn color="primary" prepend-icon="mdi-cloud-upload" @click="saveToServer" :disabled="!hasChanges"
                :loading="saving">
                {{ $gettext('Save to server') }}
            </v-btn>
        </div>

        <!-- Success snackbar -->
        <v-snackbar v-model="showSnackbar" :color="snackbarColor" :timeout="3000">
            {{ snackbarMessage }}
        </v-snackbar>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useGettext } from 'vue3-gettext';
import {
    getAvailableTranslations,
    getTranslation,
    saveTranslation,
    checkFirebaseConnection
} from '@/js/firebase/translations-service.js';

const { $gettext } = useGettext();

// === Language reference table (from langues.csv) ===
const languagesList = [
    { code: 'bg', label: 'български', flag: '🇧🇬' },
    { code: 'cs', label: 'čeština', flag: '🇨🇿' },
    { code: 'da', label: 'dansk', flag: '🇩🇰' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'el', label: 'ελληνικά', flag: '🇬🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'et', label: 'eesti', flag: '🇪🇪' },
    { code: 'fi', label: 'suomi', flag: '🇫🇮' },
    { code: 'fo', label: 'føroyskt', flag: '🇫🇴' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'hr', label: 'hrvatski', flag: '🇭🇷' },
    { code: 'hu', label: 'magyar', flag: '🇭🇺' },
    { code: 'is', label: 'íslenska', flag: '🇮🇸' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'lt', label: 'lietuvių', flag: '🇱🇹' },
    { code: 'lv', label: 'latviešu', flag: '🇱🇻' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'no', label: 'norsk', flag: '🇳🇴' },
    { code: 'pl', label: 'Polski', flag: '🇵🇱' },
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'ro', label: 'română', flag: '🇷🇴' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'sk', label: 'slovenčina', flag: '🇸🇰' },
    { code: 'sl', label: 'slovenščina', flag: '🇸🇮' },
    { code: 'sq', label: 'shqip', flag: '🇦🇱' },
    { code: 'sr', label: 'srpski', flag: '🇷🇸' },
    { code: 'sv', label: 'svenska', flag: '🇸🇪' },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'uk', label: 'українська', flag: '🇺🇦' },
    { code: 'zh', label: '中文', flag: '🇨🇳' }
];

// Map code -> language info for quick lookup
const languagesMap = Object.fromEntries(languagesList.map(l => [l.code, l]));

const translations = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const search = ref('');
const fileInput = ref(null);

// Dialog state
const showSelectionDialog = ref(true);
const serverTranslations = ref([]);
const firebaseError = ref('');
const newTranslationLang = ref(null);

// v-select states
const availablePoFiles = ref([]);
const selectedContext = ref(null);
const selectedTargetLang = ref(null);
const filterUntranslated = ref(false);
const contextColumnTitle = ref('');
const targetColumnTitle = ref('');

// Snackbar
const showSnackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('success');

// Languages available for new translations (exclude already started ones)
const availableNewLanguages = computed(() => {
    const existingCodes = new Set(serverTranslations.value.map(t => t.lang));
    return languagesList.filter(l => !existingCodes.has(l.code));
});

// Incomplete translations (< 100%) - can be continued
const incompleteTranslations = computed(() => {
    return serverTranslations.value.filter(t => t.progress < 100);
});

// Completed translations (100%) - available as context reference
const completedTranslations = computed(() => {
    return serverTranslations.value.filter(t => t.progress >= 100);
});

// Get flag emoji for a language code
function getFlagEmoji(code) {
    return languagesMap[code]?.flag || '🏳️';
}

// Get progress color based on percentage
function getProgressColor(progress) {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'warning';
    return 'error';
}

// Dynamic headers based on selections
const dynamicHeaders = computed(() => {
    const headers = [
        { title: 'Key', key: 'key', width: '40%' }
    ];

    if (selectedContext.value) {
        headers.push({
            title: contextColumnTitle.value || selectedContext.value,
            key: 'context',
            width: '25%'
        });
    }

    if (selectedTargetLang.value) {
        headers.push({
            title: targetColumnTitle.value || selectedTargetLang.value,
            key: 'target',
            width: '35%',
            sortable: false
        });
    }

    return headers;
});

// Progress counter
const totalCount = computed(() => translations.value.length);
const translatedCount = computed(() => translations.value.filter(t => t.targetValue && t.targetValue.trim() !== '').length);
const translatedPercent = computed(() => {
    if (totalCount.value === 0) return 0;
    return Math.round((translatedCount.value / totalCount.value) * 100);
});

// Filtered translations based on filterUntranslated toggle
const filteredTranslations = computed(() => {
    if (!filterUntranslated.value) {
        return translations.value;
    }
    return translations.value.filter(t => {
        return !t.targetValue || t.targetValue.trim() === '' || t.isEditing;
    });
});

const hasChanges = computed(() => {
    return translations.value.some(t => t.targetValue && t.targetValue.trim() !== '');
});

/**
 * Parse POT file to extract msgid values
 */
function parsePot(content) {
    const entries = [];
    const lines = content.split('\n');
    let id = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        const msgidMatch = line.match(/^msgid\s+"(.*)"$/);
        if (msgidMatch) {
            const value = msgidMatch[1];
            if (value) { // Skip empty msgid (header)
                entries.push({
                    id: id++,
                    key: value,
                    context: '',
                    targetValue: '',
                    originalTarget: '',
                    isEditing: false
                });
            }
        }
    }

    return entries;
}

/**
 * Parse PO file to extract msgid/msgstr pairs
 */
function parsePo(content) {
    const translations = {};
    const lines = content.split('\n');
    let currentMsgid = null;
    let inMultilineMsgstr = false;
    let currentMsgstr = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        const msgidMatch = line.match(/^msgid\s+"(.*)"$/);
        if (msgidMatch) {
            if (currentMsgid !== null && currentMsgstr) {
                translations[currentMsgid] = currentMsgstr;
            }
            currentMsgid = msgidMatch[1];
            currentMsgstr = '';
            inMultilineMsgstr = false;
            continue;
        }

        const msgstrMatch = line.match(/^msgstr\s+"(.*)"$/);
        if (msgstrMatch) {
            currentMsgstr = msgstrMatch[1];
            inMultilineMsgstr = true;
            continue;
        }

        if (inMultilineMsgstr && line.startsWith('"') && line.endsWith('"')) {
            currentMsgstr += line.slice(1, -1);
        }
    }

    if (currentMsgid !== null && currentMsgstr) {
        translations[currentMsgid] = currentMsgstr;
    }

    return translations;
}

/**
 * Generate PO file content from translations
 */
function generatePoContent() {
    const langCode = selectedTargetLang.value || 'new';
    const langLabel = languagesMap[langCode]?.label || langCode;

    let content = `msgid ""
msgstr ""
"Project-Id-Version: Logfly\\n"
"Language: ${langCode}\\n"
"Language-Team: ${langLabel}\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"

`;

    for (const t of translations.value) {
        content += `msgid "${t.key}"\n`;
        content += `msgstr "${t.targetValue || ''}"\n\n`;
    }

    return content;
}

/**
 * Load available translations from Firebase
 * Completed translations (100%) are available as context reference
 */
async function loadServerTranslations() {
    try {
        const isConnected = await checkFirebaseConnection();
        if (!isConnected) {
            firebaseError.value = $gettext('Firebase not configured. Using local mode only.');
            return;
        }

        serverTranslations.value = await getAvailableTranslations();
        firebaseError.value = '';

        // Completed translations (100%) are available as context reference (excluding English - source language)
        availablePoFiles.value = serverTranslations.value
            .filter(t => t.progress >= 100 && t.lang !== 'en')
            .map(t => ({
                code: t.lang,
                label: `${languagesMap[t.lang]?.label || t.lang} ✓`,
                filename: null,
                isFromServer: true
            }));

    } catch (err) {
        console.error('Error loading server translations:', err);
        firebaseError.value = $gettext('Could not connect to server');
    }
}

/**
 * Load POT file (keys only)
 */
async function loadKeys() {
    loading.value = true;
    error.value = '';

    try {
        const response = await fetch('/messages.pot');
        if (!response.ok) throw new Error('Failed to load messages.pot');

        const content = await response.text();
        translations.value = parsePot(content);
    } catch (err) {
        error.value = err.message;
        console.error('Error loading keys:', err);
    } finally {
        loading.value = false;
    }
}

/**
 * Load translation from Firebase server
 */
async function loadFromServer(lang) {
    loading.value = true;
    error.value = '';

    try {
        const content = await getTranslation(lang);
        if (content) {
            const poData = parsePo(content);

            selectedTargetLang.value = lang;
            targetColumnTitle.value = languagesMap[lang]?.label || lang;

            translations.value.forEach(t => {
                t.targetValue = poData[t.key] || '';
                t.originalTarget = t.targetValue;
            });
        }

        showSelectionDialog.value = false;
    } catch (err) {
        error.value = 'Error loading from server: ' + err.message;
    } finally {
        loading.value = false;
    }
}

/**
 * Start a new translation
 */
function startNewTranslation() {
    if (!newTranslationLang.value) return;

    selectedTargetLang.value = newTranslationLang.value;
    targetColumnTitle.value = languagesMap[newTranslationLang.value]?.label || newTranslationLang.value;

    translations.value.forEach(t => {
        t.targetValue = '';
        t.originalTarget = '';
    });

    showSelectionDialog.value = false;
    newTranslationLang.value = null;
}

/**
 * Close dialog without selecting
 */
function closeDialog() {
    showSelectionDialog.value = false;
}

/**
 * Load context PO file into column 2
 */
async function onContextChange(code) {
    if (!code) {
        contextColumnTitle.value = '';
        translations.value.forEach(t => t.context = '');
        return;
    }

    loading.value = true;
    try {
        // Check if this is a server-based translation
        const selectedFile = availablePoFiles.value.find(f => f.code === code);
        let content;

        if (selectedFile?.isFromServer) {
            // Load from Firebase
            content = await getTranslation(code);
            if (!content) throw new Error('Translation not found on server');
        } else {
            // Load from local file
            const response = await fetch('/' + code + '.po');
            if (!response.ok) throw new Error('Failed to load ' + code + '.po');
            content = await response.text();
        }

        const poData = parsePo(content);

        contextColumnTitle.value = languagesMap[code]?.label || code;
        translations.value.forEach(t => {
            t.context = poData[t.key] || '';
        });
    } catch (err) {
        error.value = err.message;
    } finally {
        loading.value = false;
    }
}

/**
 * Load PO file from user's computer
 */
function loadPoFromFile() {
    fileInput.value?.click();
}

async function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const content = await file.text();
        const poData = parsePo(content);

        const code = file.name.replace('.po', '');
        targetColumnTitle.value = languagesMap[code]?.label || code;
        selectedTargetLang.value = code;

        translations.value.forEach(t => {
            t.targetValue = poData[t.key] || '';
            t.originalTarget = t.targetValue;
        });

        showSelectionDialog.value = false;
    } catch (err) {
        error.value = 'Error reading file: ' + err.message;
    } finally {
        event.target.value = '';
    }
}

function toggleEdit(item) {
    item.isEditing = true;
}

function saveEdit(item) {
    item.originalTarget = item.targetValue;
    item.isEditing = false;
}

function cancelEdit(item) {
    item.targetValue = item.originalTarget;
    item.isEditing = false;
}

/**
 * Export translations as PO file (download to computer)
 */
function exportToFile() {
    const langCode = selectedTargetLang.value || 'new';
    const content = generatePoContent();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = langCode + '.po';
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Save translations to Firebase server
 */
async function saveToServer() {
    if (!selectedTargetLang.value) {
        error.value = 'No target language selected';
        return;
    }

    saving.value = true;
    error.value = '';

    try {
        const content = generatePoContent();
        const lang = selectedTargetLang.value;
        const label = languagesMap[lang]?.label || lang;

        await saveTranslation(lang, label, content, totalCount.value);

        // Refresh the server translations list
        await loadServerTranslations();

        snackbarMessage.value = $gettext('Translation saved successfully!');
        snackbarColor.value = 'success';
        showSnackbar.value = true;
    } catch (err) {
        error.value = 'Error saving to server: ' + err.message;
        snackbarMessage.value = $gettext('Error saving translation');
        snackbarColor.value = 'error';
        showSnackbar.value = true;
    } finally {
        saving.value = false;
    }
}

onMounted(async () => {
    await loadKeys();
    await loadServerTranslations();
});
</script>

<style scoped>
.translation-view {
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

.controls-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
}

.search-field {
    min-width: 200px;
    max-width: 300px;
}

.context-select {
    min-width: 180px;
    max-width: 220px;
}

.target-chip {
    font-size: 1rem;
}

.progress-bar {
    display: flex;
    justify-content: flex-end;
}

.edit-field {
    min-width: 200px;
}

.text-caption {
    font-size: 0.85em;
}

.translation-list {
    border: 1px solid rgba(var(--v-border-color), 0.12);
    border-radius: 8px;
    max-height: 300px;
    overflow-y: auto;
}

.translation-item {
    cursor: pointer;
    transition: background-color 0.2s;
}

.translation-item:hover {
    background-color: rgba(var(--v-theme-primary), 0.08);
}

.lang-flag {
    font-size: 1.5rem;
}

.gap-2 {
    gap: 8px;
}

.gap-3 {
    gap: 12px;
}
</style>
