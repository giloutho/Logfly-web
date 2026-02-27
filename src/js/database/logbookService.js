import { get, set } from 'idb-keyval';
import { ref, shallowRef } from 'vue';

// État réactif global
export const isReady = ref(false);
export const isFallbackMode = ref(false); // Mode sans File System Access API
export const dirHandle = shallowRef(null);
export const currentFile = shallowRef(null);
export const availableFiles = ref([]);

/**
 * Initialisation : Récupère les handles depuis IndexedDB
 */
export async function initPersistence() {
  try {
    const savedDir = await get("dossier_parent");
    const savedFile = await get("fichier_base");

    if (savedDir && savedFile) {
      dirHandle.value = savedDir;
      currentFile.value = savedFile;
      const status = await savedDir.queryPermission({ mode: 'readwrite' });
      isReady.value = (status === 'granted');
    }
  } catch (err) {
    // On Android Chrome (and some other platforms), restoring
    // FileSystemFileHandle / DirectoryHandle from IndexedDB is not
    // allowed.  Silently clear the saved handles so the user gets the
    // normal file-picker flow instead.
    console.warn('initPersistence: unable to restore handles –', err.message);
    dirHandle.value = null;
    currentFile.value = null;
    isReady.value = false;
    await set("dossier_parent", null);
    await set("fichier_base", null);
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
  isFallbackMode.value = false;
}

/**
 * Fallback : Charge un fichier sans le persister dans IndexedDB (car pas de handle)
 */
export async function setFallbackFile(file) {
  currentFile.value = { name: file.name }; // Mock object
  dirHandle.value = null;
  isReady.value = true;
  isFallbackMode.value = true;

  // Nettoyer la persistance pour ne pas essayer de recharger un truc invalide
  await set("dossier_parent", null);
  await set("fichier_base", null);
}

/**
 * RÉACTIVATION : Le point clé pour que 'startIn' fonctionne
 */
export async function reactivateAccess() {
  if (isFallbackMode.value) return true; // Rien à réactiver en mode fallback
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
  // En mode fallback, l'autosave est impossible/désactivé
  if (isFallbackMode.value) {
    return false;
  }

  if (!currentFile.value || !isReady.value) {
    throw new Error("Accès au fichier non autorisé");
  }

  const writable = await currentFile.value.createWritable();
  await writable.write(data);
  await writable.close();
  return true;
}