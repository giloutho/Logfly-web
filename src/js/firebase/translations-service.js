/**
 * Firebase Translations Service
 * 
 * Service pour gérer les fichiers de traduction PO sur Firebase Firestore
 */

import { db, ensureAuth, isFirebaseConfigured } from './config.js';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'translations';

/**
 * Parse PO content to count translations
 * @param {string} content - PO file content
 * @returns {{ total: number, translated: number }}
 */
function countTranslations(content) {
    const lines = content.split('\n');
    let total = 0;
    let translated = 0;
    let currentMsgid = null;
    let currentMsgstr = '';
    let inMsgstr = false;

    for (const line of lines) {
        const trimmed = line.trim();

        const msgidMatch = trimmed.match(/^msgid\s+"(.*)"$/);
        if (msgidMatch) {
            // Save previous entry
            if (currentMsgid !== null) {
                total++;
                if (currentMsgstr.trim()) {
                    translated++;
                }
            }
            currentMsgid = msgidMatch[1];
            currentMsgstr = '';
            inMsgstr = false;
            continue;
        }

        const msgstrMatch = trimmed.match(/^msgstr\s+"(.*)"$/);
        if (msgstrMatch) {
            currentMsgstr = msgstrMatch[1];
            inMsgstr = true;
            continue;
        }

        // Multi-line msgstr
        if (inMsgstr && trimmed.startsWith('"') && trimmed.endsWith('"')) {
            currentMsgstr += trimmed.slice(1, -1);
        }
    }

    // Don't forget last entry
    if (currentMsgid !== null && currentMsgid !== '') {
        total++;
        if (currentMsgstr.trim()) {
            translated++;
        }
    }

    return { total, translated };
}

/**
 * Get the reference total (number of keys in messages.pot)
 * @returns {Promise<number>}
 */
export async function getReferenceTotal() {
    try {
        const docRef = doc(db, 'config', 'reference');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data().totalKeys || 0;
        }
        return 0;
    } catch (error) {
        console.error('Error fetching reference total:', error);
        return 0;
    }
}

/**
 * Set the reference total (developer function)
 * @param {number} totalKeys - Number of keys in messages.pot
 * @returns {Promise<void>}
 */
export async function setReferenceTotal(totalKeys) {
    try {
        await ensureAuth();
        const docRef = doc(db, 'config', 'reference');
        await setDoc(docRef, {
            totalKeys: totalKeys,
            updatedAt: serverTimestamp()
        });
        console.log(`Reference total set to ${totalKeys}`);
    } catch (error) {
        console.error('Error setting reference total:', error);
        throw error;
    }
}

/**
 * Get all available translations from Firestore
 * Recalculates progress based on reference total
 * @returns {Promise<Array<{ lang: string, label: string, progress: number, updatedAt: Date }>>}
 */
export async function getAvailableTranslations() {
    try {
        // Get reference total first
        const referenceTotal = await getReferenceTotal();

        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        const translations = [];

        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const translated = data.translated || 0;

            // Recalculate progress using reference total if available
            const total = referenceTotal > 0 ? referenceTotal : (data.total || 0);
            const progress = total > 0 ? Math.round((translated / total) * 100) : 0;

            translations.push({
                lang: docSnapshot.id,
                label: data.label || docSnapshot.id,
                progress: progress,
                total: total,
                translated: translated,
                updatedAt: data.updatedAt?.toDate() || null
            });
        });

        // Sort by language code
        translations.sort((a, b) => a.lang.localeCompare(b.lang));

        return translations;
    } catch (error) {
        console.error('Error fetching translations:', error);
        throw error;
    }
}

/**
 * Get a specific translation file content
 * @param {string} lang - Language code (e.g., 'de', 'it')
 * @returns {Promise<string|null>} - PO file content or null if not found
 */
export async function getTranslation(lang) {
    try {
        const docRef = doc(db, COLLECTION_NAME, lang);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data().content || null;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching translation for ${lang}:`, error);
        throw error;
    }
}

/**
 * Save a translation file to Firestore
 * @param {string} lang - Language code
 * @param {string} label - Language label (e.g., 'Deutsch')
 * @param {string} content - PO file content
 * @param {number} totalKeys - Total number of keys
 * @returns {Promise<void>}
 */
export async function saveTranslation(lang, label, content, totalKeys) {
    try {
        // Ensure user is authenticated (anonymous)
        await ensureAuth();

        const { total, translated } = countTranslations(content);
        const progress = total > 0 ? Math.round((translated / total) * 100) : 0;

        const docRef = doc(db, COLLECTION_NAME, lang);
        await setDoc(docRef, {
            label: label,
            content: content,
            total: totalKeys || total,
            translated: translated,
            progress: progress,
            updatedAt: serverTimestamp()
        });

        console.log(`Translation ${lang} saved successfully (${progress}% complete)`);
    } catch (error) {
        console.error(`Error saving translation for ${lang}:`, error);
        throw error;
    }
}

/**
 * Check if Firebase is properly configured
 * @returns {Promise<boolean>}
 */
export async function checkFirebaseConnection() {
    // First check if Firebase is configured via environment variables
    if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured (missing VITE_FIREBASE_* variables)');
        return false;
    }

    try {
        await ensureAuth();
        return true;
    } catch (error) {
        console.error('Firebase connection check failed:', error);
        return false;
    }
}
