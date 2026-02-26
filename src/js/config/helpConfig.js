/**
 * Configuration for contextual help linking to MkDocs (with i18n support).
 */

const BASE_URL = "http://127.0.0.1:8000/doc/";

// Map application route names to MkDocs markdown paths (without extension/language suffix)
const HELP_MAP = {
    // Home page
    'home': 'start',
    // Flights & Tracks
    'logbook-view': 'tracks/logbook',
    'import-gps': 'tracks/import',
    'external-track': 'tracks/externe',

    // Statistics
    'synthese-annee': 'stat/annuel',
    'synthese-globale': 'stat/global',

    // Routing
    'waypoints-view': 'wayp',
    'airspaces-view': 'airspace',
    'xcnav-view': 'xcnav',

    // Sites & Equipment
    'sites-view': 'sites',
    'equip-base': 'equip',

    // Utilities
    'settings-view': 'support/settings',
    'support-view': 'support/contact',
    'translation-view': 'support/traduction',

    // Fallback
    'default': 'start'
};

/**
 * Generates the full URL for the help documentation based on the current route and language.
 * Uses mkdocs-static-i18n logic: default language (fr) is at root, other languages in a subfolder (e.g. /en/).
 * @param {string} routeName - The Vue Router route name (e.g., 'logbook-view')
 * @param {string} langCode - The current application language code (e.g., 'fr', 'en')
 * @returns {string} The fully formed URL to the help page
 */
export function getHelpUrl(routeName, langCode = 'fr') {
    const path = HELP_MAP[routeName] || HELP_MAP['default'];

    // If the language is not French, point to the /en/ subfolder version of the documentation
    const finalLangCode = langCode === 'fr' ? '' : 'en/';

    return `${BASE_URL}${finalLangCode}${path}/`;
}
