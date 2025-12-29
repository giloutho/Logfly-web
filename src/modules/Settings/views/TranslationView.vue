<template>
    <div class="translation-view">
        <h1 class="text-h5 mb-4">{{ $gettext('Translation Editor') }}</h1>

        <v-alert v-if="loading" type="info" variant="tonal" class="mb-4">
            {{ $gettext('Loading translations...') }}
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

            <v-select v-model="selectedTargetLang" :items="languagesList" :label="$gettext('Target language')"
                density="compact" variant="outlined" hide-details clearable class="target-select" item-title="label"
                item-value="code" @update:model-value="onTargetLangChange"></v-select>

            <v-btn color="secondary" prepend-icon="mdi-folder-open" @click="loadPoFromFile" density="comfortable">
                Load
            </v-btn>

            <!-- Hidden file input for Load button -->
            <input ref="fileInput" type="file" accept=".po" style="display: none" @change="handleFileLoad">
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

        <v-data-table :headers="dynamicHeaders" :items="filteredTranslations" :search="search" :items-per-page="15"
            density="compact" class="elevation-1">
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

        <div class="mt-4 d-flex justify-end">
            <v-btn color="primary" prepend-icon="mdi-content-save" @click="exportTranslations" :disabled="!hasChanges">
                {{ $gettext('Export') }}
            </v-btn>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useGettext } from 'vue3-gettext';

const { $gettext } = useGettext();

// === Language reference table (from langues.csv) ===
const languagesList = [
    { code: 'bg', label: 'български' },
    { code: 'cs', label: 'čeština' },
    { code: 'da', label: 'dansk' },
    { code: 'de', label: 'Deutsch' },
    { code: 'el', label: 'ελληνικά' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'et', label: 'eesti' },
    { code: 'fi', label: 'suomi' },
    { code: 'fo', label: 'føroyskt' },
    { code: 'fr', label: 'Français' },
    { code: 'hr', label: 'hrvatski' },
    { code: 'hu', label: 'magyar' },
    { code: 'is', label: 'íslenska' },
    { code: 'it', label: 'Italiano' },
    { code: 'ja', label: '日本語' },
    { code: 'lt', label: 'lietuvių' },
    { code: 'lv', label: 'latviešu' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'no', label: 'norsk' },
    { code: 'pl', label: 'Polski' },
    { code: 'pt', label: 'Português' },
    { code: 'ro', label: 'română' },
    { code: 'ru', label: 'Русский' },
    { code: 'sk', label: 'slovenčina' },
    { code: 'sl', label: 'slovenščina' },
    { code: 'sq', label: 'shqip' },
    { code: 'sr', label: 'srpski' },
    { code: 'sv', label: 'svenska' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'uk', label: 'українська' },
    { code: 'zh', label: '中文' }
];

// Map code -> label for quick lookup
const languagesMap = Object.fromEntries(languagesList.map(l => [l.code, l.label]));

const translations = ref([]);
const loading = ref(false);
const error = ref('');
const search = ref('');
const fileInput = ref(null);

// v-select states
const availablePoFiles = ref([]);
const selectedContext = ref(null);
const selectedTargetLang = ref(null);
const filterUntranslated = ref(false);
const contextColumnTitle = ref('');
const targetColumnTitle = ref('');

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
    return translations.value.filter(t => !t.targetValue || t.targetValue.trim() === '');
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

        const msgidMatch = line.match(/^msgid\s+"(.*)"\s*$/);
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

        const msgidMatch = line.match(/^msgid\s+"(.*)"\s*$/);
        if (msgidMatch) {
            if (currentMsgid !== null && currentMsgstr) {
                translations[currentMsgid] = currentMsgstr;
            }
            currentMsgid = msgidMatch[1];
            currentMsgstr = '';
            inMultilineMsgstr = false;
            continue;
        }

        const msgstrMatch = line.match(/^msgstr\s+"(.*)"\s*$/);
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
 * Available PO files - static list since browsers cannot scan directories
 * Update this list when adding new translation files to public/
 */
async function scanPoFiles() {
    // Static list of available PO files in public/
    // Browsers cannot scan directories, and HEAD requests may not work reliably
    const knownPoFiles = [
        { code: 'en', filename: 'en.po' },
        { code: 'fr', filename: 'fr.po' }
    ];

    const found = [];

    for (const file of knownPoFiles) {
        try {
            // Verify the file actually exists with a quick fetch
            const response = await fetch('/' + file.filename, { method: 'HEAD' });
            if (response.ok) {
                found.push({
                    code: file.code,
                    label: languagesMap[file.code] || file.code,
                    filename: file.filename
                });
            }
        } catch {
            // If HEAD fails, try a regular fetch (some servers don't support HEAD)
            try {
                const response = await fetch('/' + file.filename);
                if (response.ok) {
                    found.push({
                        code: file.code,
                        label: languagesMap[file.code] || file.code,
                        filename: file.filename
                    });
                }
            } catch {
                console.warn(`Could not verify ${file.filename}`);
            }
        }
    }

    availablePoFiles.value = found;
    console.log('Available PO files:', found);
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
 * Load context PO file into column 2
 */
async function onContextChange(code) {
    if (!code) {
        // Clear context column
        contextColumnTitle.value = '';
        translations.value.forEach(t => t.context = '');
        return;
    }

    loading.value = true;
    try {
        const response = await fetch('/' + code + '.po');
        if (!response.ok) throw new Error('Failed to load ' + code + '.po');

        const content = await response.text();
        const poData = parsePo(content);

        contextColumnTitle.value = code;
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
 * Initialize target column for new translation
 */
function onTargetLangChange(code) {
    if (!code) {
        targetColumnTitle.value = '';
        translations.value.forEach(t => {
            t.targetValue = '';
            t.originalTarget = '';
        });
        return;
    }

    targetColumnTitle.value = code;
    // Clear all target values for new translation
    translations.value.forEach(t => {
        t.targetValue = '';
        t.originalTarget = '';
    });
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

        // Extract language code from filename (e.g., "de.po" -> "de")
        const code = file.name.replace('.po', '');
        targetColumnTitle.value = code;
        selectedTargetLang.value = code;

        translations.value.forEach(t => {
            t.targetValue = poData[t.key] || '';
            t.originalTarget = t.targetValue;
        });
    } catch (err) {
        error.value = 'Error reading file: ' + err.message;
    } finally {
        event.target.value = ''; // Reset input
    }
}

function toggleEdit(item) {
    item.isEditing = true;
}

function saveEdit(item) {
    item.isEditing = false;
}

function cancelEdit(item) {
    item.isEditing = false;
    item.targetValue = item.originalTarget;
}

/**
 * Export translations as PO file
 */
function exportTranslations() {
    const langCode = targetColumnTitle.value || 'new';

    let content = `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

`;

    for (const t of translations.value) {
        if (t.targetValue) {
            content += `msgid "${t.key}"\n`;
            content += `msgstr "${t.targetValue}"\n\n`;
        }
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = langCode + '.po';
    link.click();
    URL.revokeObjectURL(url);
}

onMounted(async () => {
    await loadKeys();
    await scanPoFiles();
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

.context-select,
.target-select {
    min-width: 180px;
    max-width: 220px;
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
</style>
