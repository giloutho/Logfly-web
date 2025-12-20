// terrainUtils.js

/**
 * Convertit les coordonnées latitude/longitude en coordonnées de tuile (x, y) pour un niveau de zoom donné.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {number} zoom - Niveau de zoom.
 * @returns {Object} - Coordonnées de la tuile { x, y }.
 */
function getTileCoords(lat, lon, zoom) {
    // Le nombre total de tuiles dans une dimension (2^zoom)
    const n = Math.pow(2, zoom);

    // 1. Calculer la position X (longitude)
    // Map la longitude de -180 à 180 vers 0 à n
    // Ajoute 180 pour s'assurer que la valeur est positive, divise par 360, puis multiplie par n.
    let tileX = Math.floor(n * ((lon + 180) / 360));

    // 2. Calculer la position Y (latitude)
    // Convertir la latitude en radians
    const latRad = lat * (Math.PI / 180);

    // Formule de projection de Mercator pour Y
    // Calcule la coordonnée y sur l'échelle de 0 à 1 (normalisée)
    let sinLat = Math.sin(latRad);
    let normalizedY = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);

    // Map la coordonnée y normalisée de 0 à n
    let tileY = Math.floor(n * normalizedY);

    // S'assurer que les valeurs X et Y restent dans les limites [0, n-1]
    tileX = Math.min(tileX, n - 1);
    tileY = Math.min(tileY, n - 1);
    tileX = Math.max(0, tileX);
    tileY = Math.max(0, tileY);

    return {
        x: tileX,
        y: tileY,
        z: zoom
    };
}

/**
 * Decode les données d'une image (PNG/JPG) en un tableau de pixels (Uint8ClampedArray).
 * Optimisé pour être appelé une seule fois par tuile.
 * @param {Uint8Array|ArrayBuffer} tileData 
 * @returns {Promise<Uint8ClampedArray>}
 */
function decodeImageData(tileData) {
    return new Promise((resolve, reject) => {
        let blob;
        if (tileData instanceof Uint8Array) {
            blob = new Blob([tileData], { type: 'image/png' });
        } else if (tileData instanceof ArrayBuffer) {
            blob = new Blob([new Uint8Array(tileData)], { type: 'image/png' });
        } else {
            reject(new Error('tileData doit être Uint8Array ou ArrayBuffer'));
            return;
        }

        const img = new window.Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            // Utiliser un canvas offscreen (ou element créé dynamiquement)
            // Note: OffscreenCanvas est plus performant mais support limité selon navigateurs/contexte
            // On reste sur un canvas standard pour compatibilité max, c'est très rapide.
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            // willReadFrequently hint chrome to optimize for read

            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            try {
                // Récupérer TOUS les pixels d'un coup
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                resolve(imageData.data);
            } catch (e) {
                reject(e);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Erreur décodage image'));
        };

        img.src = url;
    });
}

/**
 * Calcule les coordonnées locale (px, py) dans une tuile de 256x256
 */
function getTilePixelCoords(lat, lon, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lon + 180) / 360 * n * 256) % 256;
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n * 256) % 256;
    return { x, y };
}

/**
 * Lit l'altitude depuis un tableau de pixels déjà décodé.
 * Opération synchrone ultra-rapide.
 */
function getAltitudeFromPixelData(pixelData, x, y) {
    if (!pixelData) return null;

    // Index dans le tableau Uint8ClampedArray (r, g, b, a pour chaque pixel)
    // y * width * 4 + x * 4
    const index = (y * 256 + x) * 4;

    // Protection débordement
    if (index < 0 || index >= pixelData.length) return null;

    const r = pixelData[index];
    const g = pixelData[index + 1];
    const b = pixelData[index + 2];

    // Formule Mapzen Terrarium
    // (Red * 256 + Green + Blue / 256) - 32768
    return (r * 256 + g + b / 256) - 32768;
}

// Garder l'ancienne fonction pour compatibilité si besoin, mais déconseillé pour performance
function getAltitudeFromTileSync(tileData, lat, lon, zoom) {
    return decodeImageData(tileData).then(pixels => {
        const { x, y } = getTilePixelCoords(lat, lon, zoom);
        return getAltitudeFromPixelData(pixels, x, y);
    });
}

export { getTileCoords, decodeImageData, getTilePixelCoords, getAltitudeFromPixelData, getAltitudeFromTileSync };

