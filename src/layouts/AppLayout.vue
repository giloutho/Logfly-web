<style>
.app-container {
    height: 100vh;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: hidden;
}

.content-area {
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: auto;
}
</style>
<template>
    <v-app class="app-container">
        <TheNavbar :isDirty="isDirty" :dbPath="dbPath" :version="appVersion" @save="onSave" />
        <v-main class="content-area">
            <router-view @db-updated="onDbUpdated" />
        </v-main>
        <OpenLogbook @db-opened="onDbOpened" @file-handle="onFileHandle" @close="onCloseLogbook" />
    </v-app>
</template>

<script setup>
import TheNavbar from '@/components/TheNavbar.vue'
import OpenLogbook from '@/components/OpenLogbook.vue';
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useDatabaseStore } from '@/stores/database';
import { useRouter } from 'vue-router';
import { saveDatabase } from '@/js/database/sql-manager.js';

const appVersion = '7.0.3'; // À actualiser à chaque build pour production
const databaseStore = useDatabaseStore();
// Utilisez storeToRefs pour garder la réactivité sur isDirty
const { isDirty } = storeToRefs(databaseStore);
const router = useRouter();
const dbPath = computed(() => databaseStore.dbName || '');
const fileHandle = ref(null); // Stocke le handle du fichier pour la sauvegarde

function onDbUpdated() {
    isDirty.value = true;
}

// Gestionnaire d'événement beforeunload pour prévenir la fermeture sans sauvegarde
function handleBeforeUnload(event) {
    // Si l'autosave a fonctionné, isDirty est déjà false ici
    if (isDirty.value) {
        const message = 'Des modifications non sauvegardées seront perdues...';
        event.preventDefault();
        event.returnValue = message;
        return message;
    }
}

// Ajouter l'écouteur au montage du composant
onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
});

// Retirer l'écouteur au démontage du composant
onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
});

async function onSave() {
    try {
        if ('showSaveFilePicker' in window) {
            const options = {
                suggestedName: databaseStore.dbName || 'carnet.db',
                types: [
                    {
                        description: 'SQLite Database',
                        accept: {
                            'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3']
                        }
                    }
                ]
            };

            if (fileHandle.value) {
                options.startIn = fileHandle.value;
            }

            const handle = await window.showSaveFilePicker(options);
            const writable = await handle.createWritable();
            const data = databaseStore.db.export();
            await writable.write(data);
            await writable.close();

            fileHandle.value = handle;
            isDirty.value = false;
        } else {
            const filename = databaseStore.dbName || 'carnet.db';
            saveDatabase(databaseStore.db, filename);
            isDirty.value = false;
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('Erreur lors de la sauvegarde :', e.message);
        }
    }
}

function onDbOpened(name) {
    // La mutation du store s'occupe déjà de dbName, rien à faire ici
}

function onFileHandle(handle) {
    fileHandle.value = handle;
}

function onCloseLogbook() {
    // Naviguer vers la page d'accueil (TheWelcome)
    router.push({ name: 'home' });
}
</script>