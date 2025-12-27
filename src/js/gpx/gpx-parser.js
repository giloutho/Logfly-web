/**
 * GPX Parser for browser environment
 * Uses native DOMParser to extract track points from GPX files
 */

/**
 * Parse a GPX file and extract track data
 * @param {string} gpxContent - GPX XML content as string
 * @returns {Object} Parsed GPX data with tracks, points, and metadata
 */
export function parseGPX(gpxContent) {
    const result = {
        success: false,
        message: '',
        tracks: [],
        metadata: {},
        totalPoints: 0
    };

    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxContent, 'application/xml');

        // Check for parsing errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            result.message = 'Invalid GPX XML format';
            return result;
        }

        // Extract metadata
        const metadata = xmlDoc.querySelector('metadata');
        if (metadata) {
            const nameEl = metadata.querySelector('name');
            const timeEl = metadata.querySelector('time');
            if (nameEl) result.metadata.name = nameEl.textContent;
            if (timeEl) result.metadata.time = new Date(timeEl.textContent);
        }

        // Extract tracks (trk elements)
        const trkElements = xmlDoc.querySelectorAll('trk');

        if (trkElements.length === 0) {
            result.message = 'No tracks found in GPX file';
            return result;
        }

        for (const trk of trkElements) {
            const track = {
                name: '',
                points: []
            };

            const nameEl = trk.querySelector('name');
            if (nameEl) track.name = nameEl.textContent;

            // Extract track segments (trkseg)
            const trksegs = trk.querySelectorAll('trkseg');

            for (const trkseg of trksegs) {
                // Extract track points (trkpt)
                const trkpts = trkseg.querySelectorAll('trkpt');

                for (const trkpt of trkpts) {
                    const lat = parseFloat(trkpt.getAttribute('lat'));
                    const lon = parseFloat(trkpt.getAttribute('lon'));

                    if (isNaN(lat) || isNaN(lon)) continue;

                    const point = {
                        lat: lat,
                        lon: lon,
                        ele: null,
                        time: null
                    };

                    const eleEl = trkpt.querySelector('ele');
                    const timeEl = trkpt.querySelector('time');

                    if (eleEl) {
                        point.ele = parseFloat(eleEl.textContent);
                    }
                    if (timeEl) {
                        point.time = new Date(timeEl.textContent);
                    }

                    track.points.push(point);
                    result.totalPoints++;
                }
            }

            if (track.points.length > 0) {
                result.tracks.push(track);
            }
        }

        if (result.tracks.length === 0 || result.totalPoints === 0) {
            result.message = 'No valid track points found in GPX file';
            return result;
        }

        result.success = true;
        result.message = `Successfully parsed ${result.tracks.length} track(s) with ${result.totalPoints} points`;

    } catch (error) {
        result.message = `GPX parsing error: ${error.message}`;
    }

    return result;
}

/**
 * Extract flight date from GPX data
 * @param {Object} gpxData - Parsed GPX data from parseGPX
 * @returns {Date|null} Flight date or null if not available
 */
export function getFlightDate(gpxData) {
    if (!gpxData.success || gpxData.tracks.length === 0) {
        return null;
    }

    // Try to get date from first track point
    const firstTrack = gpxData.tracks[0];
    if (firstTrack.points.length > 0 && firstTrack.points[0].time) {
        return firstTrack.points[0].time;
    }

    // Fallback to metadata time
    if (gpxData.metadata.time) {
        return gpxData.metadata.time;
    }

    return null;
}
