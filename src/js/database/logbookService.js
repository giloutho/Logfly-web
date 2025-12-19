import { get, set } from 'idb-keyval';
import { ref, shallowRef } from 'vue';

// État réactif global
export const isReady = ref(false);
export const dirHandle = shallowRef(null);
export const currentFile = shallowRef(null);
export const availableFiles = ref([]);

/**
 * Initialisation : Récupère les handles depuis IndexedDB
 */
export async function initPersistence() {
  const savedDir = await get("dossier_parent");
  const savedFile = await get("fichier_base");
  
  if (savedDir && savedFile) {
    dirHandle.value = savedDir;
    currentFile.value = savedFile;
    const status = await savedDir.queryPermission({ mode: 'readwrite' });
    isReady.value = (status === 'granted');
  }
}

/**
 * Sélection du dossier et scan des fichiers SQLite
 */
export async function pickFolder() {
  const handle = await window.showDirectoryPicker();
  dirHandle.value = handle;
  
  const files = [];
  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.db')) {
      files.push(entry);
    }
  }
  availableFiles.value = files;
}

/**
 * Validation finale et stockage
 */
export async function confirmFile(fileHandle) {
  currentFile.value = fileHandle;
  await set("dossier_parent", dirHandle.value);
  await set("fichier_base", fileHandle);
  isReady.value = true;
}

/**
 * RÉACTIVATION : Le point clé pour que 'startIn' fonctionne
 */
export async function reactivateAccess() {
if (!dirHandle.value) return false;
  
  try {
    // Cette ligne est le "Sésame" : elle réveille le dossier A dans la mémoire du navigateur
    const status = await dirHandle.value.requestPermission({ mode: 'readwrite' });
    
    if (status === 'granted') {
      isReady.value = true;
      return true;
    }
  } catch (err) {
    console.error("Réactivation impossible :", err);
  }
  return false;
}

/**
 * BACKUP : Sauvegarde avec choix de l'utilisateur (forcée dans le dossier initial)
 */
export async function backupDatabase(data) {
  // On force la permission juste avant pour que startIn soit honoré
  await reactivateAccess(); 

  const saveHandle = await window.showSaveFilePicker({
    suggestedName: `backup_${currentFile.value.name}`,
    startIn: dirHandle.value // Forçage du dossier initial
  });

  const writable = await saveHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

/**
 * AUTO-SAVE : Écriture directe sans dialogue
 */
export async function autoSave(data) {
if (!currentFile.value || !isReady.value) {
    throw new Error("Accès au fichier non autorisé");
  }
  
  const writable = await currentFile.value.createWritable();
  await writable.write(data);
  await writable.close();
  return true;
}