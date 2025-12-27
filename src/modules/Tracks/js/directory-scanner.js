/**
 * Scanner de répertoire pour fichiers de traces GPS (IGC et GPX)
 */

import { parseGPX } from '@/js/gpx/gpx-parser.js';
import { gpxToIgc } from '@/js/gpx/gpx-to-igc.js';

/**
 * Explore récursivement un répertoire et retourne tous les fichiers IGC
 * @param {FileSystemDirectoryHandle} directoryHandle - Handle du répertoire à explorer
 * @returns {Promise<Array>} Array de {handle, path, name}
 * @deprecated Use scanDirectoryForTracks instead
 */
export async function scanDirectoryForIGC(directoryHandle, basePath = '') {
  const igcFiles = [];

  try {
    for await (const entry of directoryHandle.values()) {
      const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      try {
        if (entry.kind === 'file') {
          // Vérifier l'extension .igc (insensible à la casse)
          if (!entry.name.startsWith('._') && entry.name.toLowerCase().endsWith('.igc')) {
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
 * Explore récursivement un répertoire et retourne fichiers IGC et GPX séparément
 * @param {FileSystemDirectoryHandle} directoryHandle - Handle du répertoire à explorer
 * @param {string} basePath - Chemin de base pour les sous-dossiers
 * @returns {Promise<Object>} { igcFiles: [...], gpxFiles: [...] }
 */
export async function scanDirectoryForTracks(directoryHandle, basePath = '') {
  const igcFiles = [];
  const gpxFiles = [];

  try {
    for await (const entry of directoryHandle.values()) {
      const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      try {
        if (entry.kind === 'file') {
          // Ignorer les fichiers macOS cachés
          if (entry.name.startsWith('._')) continue;

          const lowerName = entry.name.toLowerCase();

          if (lowerName.endsWith('.igc')) {
            // Récupérer lastModified pour la détection de doublons
            const file = await entry.getFile();
            igcFiles.push({
              handle: entry,
              path: currentPath,
              name: entry.name,
              baseName: getBaseName(entry.name),
              lastModified: file.lastModified
            });
          } else if (lowerName.endsWith('.gpx')) {
            const file = await entry.getFile();
            gpxFiles.push({
              handle: entry,
              path: currentPath,
              name: entry.name,
              baseName: getBaseName(entry.name),
              lastModified: file.lastModified
            });
          }
        } else if (entry.kind === 'directory') {
          // Exploration récursive des sous-dossiers
          const subResult = await scanDirectoryForTracks(entry, currentPath);
          igcFiles.push(...subResult.igcFiles);
          gpxFiles.push(...subResult.gpxFiles);
        }
      } catch (entryError) {
        console.warn(`Impossible d'accéder à ${currentPath}:`, entryError.message);
      }
    }
  } catch (error) {
    console.error('Erreur lors du scan du répertoire:', error);
  }

  return { igcFiles, gpxFiles };
}

/**
 * Extrait le nom de base d'un fichier (sans extension)
 * @param {string} fileName 
 * @returns {string}
 */
function getBaseName(fileName) {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(0, lastDot).toLowerCase() : fileName.toLowerCase();
}

/**
 * Identifie les fichiers GPX qui sont des doublons de fichiers IGC
 * Un GPX est considéré doublon si :
 * - Il a le même nom de base qu'un IGC
 * - OU son lastModified est à moins de toleranceMs d'un IGC
 * @param {Array} igcFiles - Liste des fichiers IGC
 * @param {Array} gpxFiles - Liste des fichiers GPX
 * @param {number} toleranceMs - Tolérance en ms pour la comparaison lastModified (défaut: 10000ms = 10s)
 * @returns {Object} { uniqueGpxFiles: [...], duplicateGpxFiles: [...] }
 */
export function identifyGpxDuplicates(igcFiles, gpxFiles, toleranceMs = 10000) {
  const uniqueGpxFiles = [];
  const duplicateGpxFiles = [];

  // Créer un Set des noms de base IGC pour recherche rapide
  const igcBaseNames = new Set(igcFiles.map(f => f.baseName));

  // Créer un tableau des lastModified IGC pour comparaison
  const igcLastModifieds = igcFiles.map(f => f.lastModified);

  for (const gpxFile of gpxFiles) {
    let isDuplicate = false;
    let reason = '';

    // Vérification 1: même nom de base
    if (igcBaseNames.has(gpxFile.baseName)) {
      isDuplicate = true;
      reason = 'same_basename';
    }

    // Vérification 2: lastModified proche (si pas déjà détecté)
    if (!isDuplicate) {
      for (const igcTime of igcLastModifieds) {
        if (Math.abs(gpxFile.lastModified - igcTime) <= toleranceMs) {
          isDuplicate = true;
          reason = 'close_timestamp';
          break;
        }
      }
    }

    if (isDuplicate) {
      duplicateGpxFiles.push({ ...gpxFile, duplicateReason: reason });
    } else {
      uniqueGpxFiles.push(gpxFile);
    }
  }

  return { uniqueGpxFiles, duplicateGpxFiles };
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

/**
 * Traite tous les fichiers de traces (IGC et GPX) avec détection des doublons
 * Les fichiers IGC sont traités en priorité, les GPX doublons sont ignorés
 * Les GPX uniques sont convertis en IGC avant traitement
 * 
 * @param {Array} igcFiles - Array de fichiers IGC
 * @param {Array} gpxFiles - Array de fichiers GPX
 * @param {Function} parseIgcFunction - Fonction de parsing IGC
 * @param {Function} checkExistsFunction - Fonction de vérification d'existence
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} { flights: [...], stats: { ... } }
 */
export async function processTrackFiles(igcFiles, gpxFiles, parseIgcFunction, checkExistsFunction, db) {
  const processedFlights = [];
  const stats = {
    igcCount: igcFiles.length,
    gpxTotal: gpxFiles.length,
    gpxDuplicates: 0,
    gpxConverted: 0,
    errors: 0
  };

  // 1. Traiter tous les fichiers IGC d'abord (format prioritaire)
  for (const fileInfo of igcFiles) {
    try {
      const content = await readFileContent(fileInfo.handle);
      const flight = parseIgcFunction(content, fileInfo.name);

      flight.filePath = fileInfo.path;
      flight.fileHandle = fileInfo.handle;
      flight.sourceFormat = 'igc';
      flight.existsInDB = checkExistsFunction(db, flight);
      flight.toStore = !flight.existsInDB && flight.isValid;

      processedFlights.push(flight);
    } catch (error) {
      console.error(`Erreur traitement IGC ${fileInfo.name}:`, error);
      stats.errors++;
      processedFlights.push({
        fileName: fileInfo.name,
        filePath: fileInfo.path,
        sourceFormat: 'igc',
        error: error.message,
        isValid: false,
        toStore: false
      });
    }
  }

  // 2. Identifier les GPX doublons
  const { uniqueGpxFiles, duplicateGpxFiles } = identifyGpxDuplicates(igcFiles, gpxFiles);
  stats.gpxDuplicates = duplicateGpxFiles.length;

  // Log duplicates for debugging
  if (duplicateGpxFiles.length > 0) {
    console.log(`GPX doublons ignorés (${duplicateGpxFiles.length}):`,
      duplicateGpxFiles.map(f => `${f.name} (${f.duplicateReason})`));
  }

  // 3. Convertir et traiter les GPX uniques
  for (const fileInfo of uniqueGpxFiles) {
    try {
      const gpxContent = await readFileContent(fileInfo.handle);

      // Parser le GPX
      const gpxData = parseGPX(gpxContent);
      if (!gpxData.success) {
        throw new Error(gpxData.message);
      }

      // Convertir en IGC
      const igcResult = gpxToIgc(gpxData);
      if (!igcResult.success) {
        throw new Error(igcResult.message);
      }

      // Parser l'IGC généré
      const flight = parseIgcFunction(igcResult.igcString, fileInfo.name);

      flight.filePath = fileInfo.path;
      flight.fileHandle = fileInfo.handle;
      flight.sourceFormat = 'gpx';
      flight.originalGpxContent = gpxContent;
      flight.existsInDB = checkExistsFunction(db, flight);
      flight.toStore = !flight.existsInDB && flight.isValid;

      processedFlights.push(flight);
      stats.gpxConverted++;
    } catch (error) {
      console.error(`Erreur traitement GPX ${fileInfo.name}:`, error);
      stats.errors++;
      processedFlights.push({
        fileName: fileInfo.name,
        filePath: fileInfo.path,
        sourceFormat: 'gpx',
        error: error.message,
        isValid: false,
        toStore: false
      });
    }
  }

  // 4. Trier par date et heure (plus récent en premier)
  processedFlights.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    if (!a.takeoffTime || !b.takeoffTime) return 0;
    return b.takeoffTime.localeCompare(a.takeoffTime);
  });

  return { flights: processedFlights, stats };
}
