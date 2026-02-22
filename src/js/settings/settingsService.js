import { get, set } from 'idb-keyval';
import { ref } from 'vue';

const SETTINGS_KEY = 'logfly_settings';

/**
 * Default settings values
 */
const defaultSettings = {
    startPage: 'home',       // 'home' | 'logbook' | 'import'
    language: '',             // '' = browser detection, otherwise language code
    pilotName: '',
    gliderName: '',
    defaultMapLayer: 'OpenStreetMap',
    league: 'FFVL',          // 'FFVL' | 'XContest'
    leagueId: '',
    leaguePass: '',
};

// Reactive state holding the current settings
export const settings = ref({ ...defaultSettings });

/**
 * Load settings from IndexedDB
 * Falls back to defaults for any missing keys
 */
export async function loadSettings() {
    try {
        const saved = await get(SETTINGS_KEY);
        if (saved && typeof saved === 'object') {
            settings.value = { ...defaultSettings, ...saved };
        } else {
            settings.value = { ...defaultSettings };
        }
    } catch (err) {
        console.error('Error loading settings:', err);
        settings.value = { ...defaultSettings };
    }
    return settings.value;
}

/**
 * Save settings to IndexedDB
 * @param {Object} newSettings - The settings object to persist
 */
export async function saveSettings(newSettings) {
    try {
        settings.value = { ...newSettings };
        await set(SETTINGS_KEY, { ...newSettings });
        return true;
    } catch (err) {
        console.error('Error saving settings:', err);
        return false;
    }
}

/**
 * Get a single setting value (from the reactive ref, no async needed)
 * @param {string} key
 * @returns {*}
 */
export function getSetting(key) {
    return settings.value[key];
}

/**
 * List of available map layers (keys from tiles.js createBaseMaps)
 */
export const availableMapLayers = [
    'OpenStreetMap',
    'OpenTopoMap',
    'IGN',
    'Satellite',
    'Mtk',
    'Esri Topo',
    'Outdoor',
];

/**
 * Start page options with route names
 */
export const startPageOptions = [
    { value: 'home', route: 'home' },
    { value: 'logbook', route: 'logbook-view' },
    { value: 'import', route: 'import-gps' },
];
