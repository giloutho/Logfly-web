import { getTileCoords, decodeImageData, getTilePixelCoords, getAltitudeFromPixelData } from './terrainUtils.js';
import { get, set } from 'idb-keyval';

// Cache mémoire pour la session en cours (évite les accès IDB/Network répétés pour la même tuile)
// Stocke les données RAW (Uint8Array)
const rawCache = new Map();

/**
 * Télécharge une tuile PNG ou la récupère depuis le cache (IDB ou mémoire)
 * Retourne le RAW buffer (PNG)
 */
async function downloadTile(x, y, zoom) {
    const tileKey = `tile/${zoom}/${x}/${y}`;

    // 1. Vérifier le cache mémoire (RAW)
    if (rawCache.has(tileKey)) {
        return rawCache.get(tileKey);
    }

    // 2. Vérifier le cache IndexedDB
    try {
        const cachedData = await get(tileKey);
        if (cachedData) {
            // Mettre en mémoire et retourner
            rawCache.set(tileKey, cachedData);
            return cachedData;
        }
    } catch (err) {
        console.warn('Erreur lecture cache IDB:', err);
    }

    // 3. Télécharger
    const tileUrl = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${x}/${y}.png`;
    try {
        const response = await fetch(tileUrl);
        if (!response.ok) {
            // console.error(`Erreur HTTP ${response.status} pour la tuile ${tileKey}`);
            return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        const tileData = new Uint8Array(arrayBuffer);

        // 4. Mettre en cache (Mémoire + IDB)
        rawCache.set(tileKey, tileData);
        // Ne pas attendre l'écriture IDB pour retourner
        set(tileKey, tileData).catch(err => console.warn('Erreur écriture cache IDB:', err));

        return tileData;
    } catch (error) {
        console.error(`Erreur réseau pour la tuile ${tileKey}:`, error.message);
        return null;
    }
}

/**
 * Fonction pour un seul point (Non optimisée pour grandes séries, garde pour compatibilité)
 */
async function getAltitude(lat, lon, zoom = 14) {
    // Note: cette fonction décode l'image pour un seul point, ce qui est OK pour usage unique
    // mais pas pour une trace.
    const tileData = await downloadTile(x, y, zoom);
    if (!tileData) return null;

    // Pour un seul point, on décode et on jette
    const pixels = await decodeImageData(tileData);
    const { x: px, y: py } = getTilePixelCoords(lat, lon, zoom);
    return getAltitudeFromPixelData(pixels, px, py);
}

/**
 * Traite plusieurs points de manière optimisée
 * 1. Groupe par tuile
 * 2. Télécharge les tuiles manquantes
 * 3. Décode les pixels (une fois par tuile)
 * 4. Lit les altitudes
 */
async function getAltitudesForPoints(points, zoom = 14) {
    console.time('AltitudesTotal');
    console.log(`Traitement de ${points.length} points...`);

    // Étape 1: Grouper les points par tuile
    const pointsByTile = new Map(); // Key: "z/x/y" -> { points: [], ... }

    points.forEach((point, index) => {
        const { x, y } = getTileCoords(point.latitude, point.longitude, zoom);
        const tileKey = `${zoom}/${x}/${y}`;

        let tileGroup = pointsByTile.get(tileKey);
        if (!tileGroup) {
            tileGroup = {
                key: tileKey,
                x, y, z: zoom,
                points: []
            };
            pointsByTile.set(tileKey, tileGroup);
        }
        tileGroup.points.push({
            index,
            lat: point.latitude,
            lon: point.longitude
        });
    });

    console.log(`${pointsByTile.size} tuiles uniques pour ${points.length} points.`);

    // Étape 2: Récupération et Décodage des tuiles
    // On conserve un cache des données DECODEES (pixels) localement à cette fonction ou globalement
    // Pour l'instant on utilise un Map local "pixelCache".
    // Si la trace repasse souvent sur les mêmes tuiles, elles seront traitées efficacement ici.

    const tileGroups = Array.from(pointsByTile.values());
    const pixelCache = new Map();

    // Fonction helper pour traiter une tuile : Télécharger (si besoin) -> Décoder
    const processTile = async (group) => {
        try {
            // 1. Get raw data (Memory -> IDB -> Network)
            const tileData = await downloadTile(group.x, group.y, group.z);

            if (!tileData) return; // Echec download

            // 2. Decode to pixels (Async - utilise createImageBitmap / Canvas)
            const pixels = await decodeImageData(tileData);
            pixelCache.set(group.key, pixels);

        } catch (e) {
            console.warn(`Failed to process tile ${group.key}`, e);
        }
    };

    // Paralléliser le traitement des tuiles
    // batchSize de 10
    const batchSize = 10;
    for (let i = 0; i < tileGroups.length; i += batchSize) {
        const batch = tileGroups.slice(i, i + batchSize);
        await Promise.all(batch.map(g => processTile(g)));
    }

    // Étape 3: Extraction des altitudes (RAPIDE car synchrone sur array)
    const results = new Array(points.length).fill(null);

    for (const group of tileGroups) {
        const pixels = pixelCache.get(group.key);
        if (!pixels) {
            // Tuile non disponible, points restent à null
            continue;
        }

        for (const p of group.points) {
            const { x: px, y: py } = getTilePixelCoords(p.lat, p.lon, group.z);
            const alt = getAltitudeFromPixelData(pixels, px, py);
            results[p.index] = alt;
        }
    }

    console.timeEnd('AltitudesTotal');
    return results;
}

/**
 * Vide le cache mémoire (IDB reste persistent)
 */
function clearMemoryCache() {
    rawCache.clear();
}

export { getAltitude, getAltitudesForPoints, clearMemoryCache };
