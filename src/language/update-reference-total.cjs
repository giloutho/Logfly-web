/**
 * Script pour mettre à jour le total de référence sur Firebase
 * 
 * Ce script compte le nombre de clés dans messages.pot et met à jour
 * le document config/reference sur Firebase.
 * 
 * Usage: node update-reference-total.cjs
 * 
 * Prérequis: Avoir configuré les variables d'environnement Firebase
 * dans un fichier .env.local ou les avoir définies dans l'environnement.
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
const envPath = path.join(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim();
        }
    });
}

// Chemin du fichier messages.pot
const potFilePath = path.join(__dirname, 'messages.pot');

/**
 * Compte le nombre de msgid dans un fichier POT
 */
function countMsgids(content) {
    const lines = content.split('\n');
    let count = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        const msgidMatch = trimmed.match(/^msgid\s+"(.+)"$/);
        if (msgidMatch) {
            count++;
        }
    }

    return count;
}

async function main() {
    console.log('=== Mise à jour du total de référence sur Firebase ===\n');

    // Vérifier que les variables Firebase sont définies
    const requiredVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_PROJECT_ID'
    ];

    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        console.error('❌ Variables d\'environnement manquantes:', missing.join(', '));
        console.error('   Assurez-vous d\'avoir un fichier .env.local à la racine du projet.');
        process.exit(1);
    }

    // Charger et compter les clés dans messages.pot
    console.log('1. Lecture de messages.pot...');
    if (!fs.existsSync(potFilePath)) {
        console.error('❌ Fichier messages.pot non trouvé:', potFilePath);
        process.exit(1);
    }

    const potContent = fs.readFileSync(potFilePath, 'utf-8');
    const totalKeys = countMsgids(potContent);
    console.log(`   -> ${totalKeys} clés trouvées`);

    // Initialiser Firebase (dynamiquement pour éviter les problèmes ESM)
    console.log('2. Connexion à Firebase...');

    const { initializeApp } = await import('firebase/app');
    const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { getAuth, signInAnonymously } = await import('firebase/auth');

    const firebaseConfig = {
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    // Authentification anonyme
    console.log('3. Authentification...');
    await signInAnonymously(auth);
    console.log('   -> Authentifié');

    // Mise à jour du document config/reference
    console.log('4. Mise à jour sur Firebase...');
    const docRef = doc(db, 'config', 'reference');
    await setDoc(docRef, {
        totalKeys: totalKeys,
        updatedAt: serverTimestamp()
    });

    console.log(`   -> ✅ Total de référence mis à jour: ${totalKeys} clés`);
    console.log('\n=== Terminé ===');

    process.exit(0);
}

main().catch(err => {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
});
