/**
 * Scanner de répertoire pour fichiers IGC
 */

/**
 * Explore récursivement un répertoire et retourne tous les fichiers IGC
 * @param {FileSystemDirectoryHandle} directoryHandle - Handle du répertoire à explorer
 * @returns {Promise<Array>} Array de {handle, path, name}
 */
export async function scanDirectoryForIGC(directoryHandle, basePath = '') {
  const igcFiles = [];
  
  try {
    for await (const entry of directoryHandle.values()) {
      const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      try {
        if (entry.kind === 'file') {
          // Vérifier l'extension .igc (insensible à la casse)
          if ( !entry.name.startsWith('._') && entry.name.toLowerCase().endsWith('.igc')) {
            igcFiles.push({
              handle: entry,
              path: currentPath,
              name: entry.name
            });
          }
        } else if (entry.kind === 'directory') {
          // Exploration récursive des sous-dossiers
          const subFiles = await scanDirectoryForIGC(entry, currentPath);
          igcFiles.push(...subFiles);
        }
      } catch (entryError) {
        // Ignorer les erreurs d'accès à ce fichier/dossier spécifique
        console.warn(`Impossible d'accéder à ${currentPath}:`, entryError.message);
      }
    }
  } catch (error) {
    console.error('Erreur lors du scan du répertoire:', error);
  }
  
  return igcFiles;
}

/**
 * Lit le contenu d'un fichier depuis son handle
 * @param {FileSystemFileHandle} fileHandle - Handle du fichier
 * @returns {Promise<string>} Contenu du fichier
 */
export async function readFileContent(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const content = await file.text();
    return content;
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier:', error);
    throw error;
  }
}

/**
 * Traite tous les fichiers IGC trouvés
 * @param {Array} igcFiles - Array de fichiers IGC
 * @param {Function} parseFunction - Fonction de parsing IGC
 * @param {Function} checkExistsFunction - Fonction de vérification d'existence
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Array>} Array d'objets vols parsés avec statut
 */
export async function processIGCFiles(igcFiles, parseFunction, checkExistsFunction, db) {
  const processedFlights = [];
  
  for (const fileInfo of igcFiles) {
    try {
      // Lire le contenu du fichier
      const content = await readFileContent(fileInfo.handle);
      
      // Parser le fichier IGC
      const flight = parseFunction(content, fileInfo.name);
      
      // Ajouter les infos du fichier
      flight.filePath = fileInfo.path;
      flight.fileHandle = fileInfo.handle;
      
      // Vérifier si le vol existe déjà
      flight.existsInDB = checkExistsFunction(db, flight);
      
      // Par défaut, cocher pour import si pas déjà en base et valide
      flight.toStore = !flight.existsInDB && flight.isValid;
      
      processedFlights.push(flight);
    } catch (error) {
      console.error(`Erreur lors du traitement de ${fileInfo.name}:`, error);
      // Ajouter quand même avec erreur
      processedFlights.push({
        fileName: fileInfo.name,
        filePath: fileInfo.path,
        fileHandle: fileInfo.handle,
        error: error.message,
        isValid: false,
        toStore: false
      });
    }
  }
  
  // Trier par date et heure (plus récent en premier)
  processedFlights.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    if (!a.takeoffTime || !b.takeoffTime) return 0;
    return b.takeoffTime.localeCompare(a.takeoffTime);
  });
  
  return processedFlights;
}
