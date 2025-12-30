/**
 * Firebase Configuration
 * 
 * Les valeurs sont chargées depuis les variables d'environnement.
 * 
 * En développement : créez un fichier .env.local à la racine du projet
 * En production (Netlify) : configurez les variables dans le dashboard Netlify
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Charger la configuration depuis les variables d'environnement
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Vérifier que la configuration est présente
const isConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

// Initialize Firebase (only if configured)
let app = null;
let db = null;
let auth = null;

if (isConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
} else {
    console.warn('Firebase not configured. Set VITE_FIREBASE_* environment variables.');
}

export { db, auth };

/**
 * Sign in anonymously (invisible to user)
 * This is required to write to Firestore with security rules
 */
export async function ensureAuth() {
    if (!auth) {
        throw new Error('Firebase not configured');
    }

    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth);
            console.log('Firebase: Anonymous auth successful');
        } catch (error) {
            console.error('Firebase: Anonymous auth failed', error);
            throw error;
        }
    }
    return auth.currentUser;
}

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured() {
    return isConfigured && app !== null;
}

export default app;
