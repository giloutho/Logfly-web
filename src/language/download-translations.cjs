/**
 * Script pour télécharger tous les fichiers PO depuis Firebase
 * 
 * Ce script récupère toutes les traductions stockées sur Firebase
 * et les sauvegarde dans le dossier src/language/ au format .po
 * 
 * Usage: node download-translations.cjs
 * 
 * Ensuite, lancez: npm run gettext:compile
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

// Dossier de destination
const outputDir = __dirname;

async function main() {
    console.log('=== Téléchargement des traductions depuis Firebase ===\n');

    // Vérifier les variables Firebase
    const requiredVars = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID'];
    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        console.error('❌ Variables d\'environnement manquantes:', missing.join(', '));
        process.exit(1);
    }

    // Initialiser Firebase
    console.log('1. Connexion à Firebase...');

    const { initializeApp } = await import('firebase/app');
    const { getFirestore, collection, getDocs } = await import('firebase/firestore');
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

    // Authentification
    console.log('2. Authentification...');
    await signInAnonymously(auth);
    console.log('   -> Authentifié');

    // Récupérer toutes les traductions
    console.log('3. Récupération des traductions...');
    const querySnapshot = await getDocs(collection(db, 'translations'));

    const translations = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.content) {
            translations.push({
                lang: doc.id,
                label: data.label || doc.id,
                content: data.content,
                progress: data.progress || 0,
                translated: data.translated || 0
            });
        }
    });

    console.log(`   -> ${translations.length} traductions trouvées`);

    if (translations.length === 0) {
        console.log('\n⚠️  Aucune traduction à télécharger.');
        process.exit(0);
    }

    // Sauvegarder chaque fichier PO
    console.log('4. Sauvegarde des fichiers...\n');

    for (const trans of translations) {
        const filename = `${trans.lang}.po`;
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, trans.content, 'utf-8');

        const status = trans.progress >= 100 ? '✅' : `${trans.progress}%`;
        console.log(`   ${status} ${filename} (${trans.translated} traductions)`);
    }

    console.log('\n=== Téléchargement terminé ===');
    console.log(`\nFichiers sauvegardés dans: ${outputDir}`);
    console.log('\nPour compiler les traductions:');
    console.log('  npm run gettext:compile');

    process.exit(0);
}

main().catch(err => {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
});
