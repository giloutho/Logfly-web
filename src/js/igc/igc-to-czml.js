/**
 * Convert IGC fixes to CZML format for Cesium animation
 * @param {Array} fixes - Array of IGC fix points with timestamp, latitude, longitude, gpsAltitude
 * @param {Object} options - Options for CZML generation
 * @returns {Array} CZML document array
 */
export function igcToCzml(fixes, options = {}) {
    if (!fixes || fixes.length === 0) {
        return null;
    }

    const {
        name = 'Flight Track',
        trailColor = [255, 50, 50, 255], // Red RGBA
        trailWidth = 3,
        multiplier = 10, // Animation speed
        billboardImage = null, // Optional paraglider icon URL
        billboardScale = 1.0
    } = options;

    // Get time bounds
    const startTime = new Date(fixes[0].timestamp).toISOString();
    const endTime = new Date(fixes[fixes.length - 1].timestamp).toISOString();
    const availability = `${startTime}/${endTime}`;

    // Build position array in cartographicDegrees format
    // Format: [ISO_TIME, LON, LAT, ALT, ISO_TIME, LON, LAT, ALT, ...]
    const positions = [];

    // Sample every N points for performance (keep ~1000 points max for smooth animation)
    const sampleRate = Math.max(1, Math.floor(fixes.length / 1000));

    for (let i = 0; i < fixes.length; i += sampleRate) {
        const fix = fixes[i];
        const isoTime = new Date(fix.timestamp).toISOString();
        positions.push(isoTime);
        positions.push(fix.longitude);
        positions.push(fix.latitude);
        positions.push(fix.gpsAltitude || fix.pressureAltitude || 0);
    }

    // Make sure we include the last point
    if ((fixes.length - 1) % sampleRate !== 0) {
        const lastFix = fixes[fixes.length - 1];
        const isoTime = new Date(lastFix.timestamp).toISOString();
        positions.push(isoTime);
        positions.push(lastFix.longitude);
        positions.push(lastFix.latitude);
        positions.push(lastFix.gpsAltitude || lastFix.pressureAltitude || 0);
    }

    // Build CZML document
    const czml = [
        // Document header with clock settings
        {
            id: 'document',
            name: name,
            version: '1.0',
            clock: {
                interval: availability,
                currentTime: startTime,
                multiplier: multiplier,
                range: 'LOOP_STOP',
                step: 'SYSTEM_CLOCK_MULTIPLIER'
            }
        },
        // Paraglider entity
        {
            id: 'paraglider',
            name: name,
            availability: availability,
            position: {
                interpolationAlgorithm: 'LAGRANGE',
                interpolationDegree: 1,
                epoch: startTime,
                cartographicDegrees: positions
            },
            // Billboard (paraglider icon)
            billboard: billboardImage ? {
                image: billboardImage,
                scale: billboardScale,
                verticalOrigin: 'BOTTOM',
                heightReference: 'NONE'
            } : undefined,
            // Point as fallback if no billboard
            point: !billboardImage ? {
                color: {
                    rgba: [255, 255, 0, 255] // Yellow
                },
                pixelSize: 12,
                outlineColor: {
                    rgba: [0, 0, 0, 255]
                },
                outlineWidth: 2
            } : undefined,
            // Label with altitude
            label: {
                text: '',
                font: '12pt sans-serif',
                style: 'FILL_AND_OUTLINE',
                fillColor: {
                    rgba: [255, 255, 255, 255]
                },
                outlineColor: {
                    rgba: [0, 0, 0, 255]
                },
                outlineWidth: 2,
                verticalOrigin: 'BOTTOM',
                pixelOffset: {
                    cartesian2: [0, -20]
                },
                show: false
            },
            // Path trail
            path: {
                material: {
                    solidColor: {
                        color: {
                            rgba: trailColor
                        }
                    }
                },
                width: trailWidth,
                leadTime: 0, // No path ahead
                trailTime: 1000000, // Very long trail behind (essentially infinite)
                resolution: 60
            }
        }
    ];

    // Remove undefined properties
    if (!czml[1].billboard) delete czml[1].billboard;
    if (!czml[1].point) delete czml[1].point;

    return czml;
}

/**
 * Get the fix index for a given timestamp
 * @param {Array} fixes - Array of IGC fixes
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {number} Index of the closest fix
 */
export function getFixIndexForTimestamp(fixes, timestamp) {
    if (!fixes || fixes.length === 0) return 0;

    // Binary search for efficiency
    let left = 0;
    let right = fixes.length - 1;

    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (fixes[mid].timestamp < timestamp) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    // Return the closest index
    if (left > 0) {
        const prevDiff = Math.abs(fixes[left - 1].timestamp - timestamp);
        const currDiff = Math.abs(fixes[left].timestamp - timestamp);
        if (prevDiff < currDiff) {
            return left - 1;
        }
    }

    return left;
}

/**
 * Get timestamp from a Cesium JulianDate
 * @param {Object} julianDate - Cesium JulianDate object
 * @returns {number} Unix timestamp in milliseconds
 */
export function julianDateToTimestamp(julianDate) {
    // Cesium JulianDate stores date as (dayNumber, secondsOfDay)
    // We need to convert to JavaScript Date
    if (window.Cesium && julianDate) {
        return window.Cesium.JulianDate.toDate(julianDate).getTime();
    }
    return 0;
}
