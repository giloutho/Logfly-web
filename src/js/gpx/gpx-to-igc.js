/**
 * GPX to IGC conversion
 * Adapted from logfly609/src/process-main/gpx/gpx-to-igc.js
 * Converts parsed GPX data to IGC format string
 */

/**
 * Convert parsed GPX data to IGC format
 * @param {Object} gpxData - Parsed GPX data from parseGPX()
 * @param {Object} options - Optional parameters
 * @param {string} options.pilot - Pilot name for IGC header
 * @param {string} options.glider - Glider type for IGC header
 * @returns {Object} Result with igcString, nbPoints, success
 */
export function gpxToIgc(gpxData, options = {}) {
    const result = {
        success: false,
        message: '',
        igcString: '',
        nbPoints: 0,
        nbTracks: 0
    };

    const CrLf = '\r\n';
    const pilot = options.pilot || '';
    const glider = options.glider || '';

    if (!gpxData || !gpxData.success || !gpxData.tracks || gpxData.tracks.length === 0) {
        result.message = 'Invalid or empty GPX data';
        return result;
    }

    try {
        let stringIGC = '';
        let nbPt = 0;
        const tracks = gpxData.tracks;

        // Get start time from first point of first track
        const firstTrack = tracks[0];
        if (firstTrack.points.length === 0) {
            result.message = 'No track points available';
            return result;
        }

        const firstPoint = firstTrack.points[0];
        if (!firstPoint.time) {
            result.message = 'Track points have no timestamp - cannot generate valid IGC';
            return result;
        }

        // Generate date in IGC format (DDMMYY)
        const startTime = firstPoint.time;
        const startDate = String(startTime.getUTCDate()).padStart(2, '0') +
            String(startTime.getUTCMonth() + 1).padStart(2, '0') +
            String(startTime.getUTCFullYear()).slice(-2);

        // IGC Header
        stringIGC += 'AXLF' + CrLf;  // Manufacturer code (XLF = Logfly)
        stringIGC += 'HFDTE' + startDate + CrLf;
        stringIGC += 'HFPLTPILOT:' + pilot + CrLf;
        stringIGC += 'HFGTYGLIDERTYPE:' + glider + CrLf;
        stringIGC += 'HFGIDGLIDERID:' + CrLf;
        stringIGC += 'HODTM100GPSDATUM: WGS-84' + CrLf;
        stringIGC += 'HOCIDCOMPETITIONID:' + CrLf;
        stringIGC += 'HOCCLCOMPETITION CLASS:' + CrLf;
        stringIGC += 'HOSITSite:' + CrLf;

        // Process all tracks
        for (const track of tracks) {
            for (const pt of track.points) {
                if (!pt.time) continue;  // Skip points without time

                nbPt++;
                const utcTime = formatUTCTime(pt.time);
                const igcLat = latitudeToIGC(pt.lat);
                const igcLon = longitudeToIGC(pt.lon);

                // Elevation: use 0 if not available, round up if decimal
                const intAlt = pt.ele !== null ? Math.ceil(pt.ele) : 0;
                const strAlt = Math.max(0, intAlt).toString().padStart(5, '0');

                // B record: time + lat + lon + validity + pressure alt + GPS alt
                const bRecord = 'B' + utcTime + igcLat + igcLon + 'A00000' + strAlt;
                stringIGC += bRecord + CrLf;
            }
        }

        // IGC Footer
        stringIGC += 'LXLF Logfly Web' + CrLf;
        const genDate = new Date();
        const strGenDate = String(genDate.getDate()).padStart(2, '0') + '-' +
            String(genDate.getMonth() + 1).padStart(2, '0') + '-' +
            genDate.getFullYear();
        const strGenTime = String(genDate.getHours()).padStart(2, '0') + ':' +
            String(genDate.getMinutes()).padStart(2, '0') + ':' +
            String(genDate.getSeconds()).padStart(2, '0');
        stringIGC += 'LXLF generated ' + strGenDate + ' ' + strGenTime + CrLf;

        result.igcString = stringIGC;
        result.nbPoints = nbPt;
        result.nbTracks = tracks.length;
        result.success = nbPt > 0;
        result.message = result.success
            ? `Converted ${nbPt} points from ${tracks.length} track(s)`
            : 'No valid points converted';

    } catch (error) {
        result.message = `IGC conversion error: ${error.message}`;
    }

    return result;
}

/**
 * Format a Date to IGC UTC time format (HHMMSS)
 * @param {Date} date 
 * @returns {string}
 */
function formatUTCTime(date) {
    return String(date.getUTCHours()).padStart(2, '0') +
        String(date.getUTCMinutes()).padStart(2, '0') +
        String(date.getUTCSeconds()).padStart(2, '0');
}

/**
 * Convert decimal latitude to IGC format
 * Format: DDMMMMM[N|S] (degrees, minutes with 3 decimal places)
 * @param {number} lat - Decimal latitude
 * @returns {string}
 */
function latitudeToIGC(lat) {
    try {
        const absLat = Math.abs(lat);
        const degrees = Math.floor(absLat);
        const minutes = (absLat - degrees) * 60;
        const minutesFixed = (Math.round(minutes * 1000) / 1000).toFixed(3);
        const [minInt, minDec] = minutesFixed.split('.');

        const igcLat = degrees.toString().padStart(2, '0') +
            minInt.padStart(2, '0') +
            minDec +
            (lat < 0 ? 'S' : 'N');
        return igcLat;
    } catch (error) {
        return '';
    }
}

/**
 * Convert decimal longitude to IGC format
 * Format: DDDMMMMM[E|W] (degrees, minutes with 3 decimal places)
 * @param {number} lon - Decimal longitude
 * @returns {string}
 */
function longitudeToIGC(lon) {
    try {
        const absLon = Math.abs(lon);
        const degrees = Math.floor(absLon);
        const minutes = (absLon - degrees) * 60;
        const minutesFixed = (Math.round(minutes * 1000) / 1000).toFixed(3);
        const [minInt, minDec] = minutesFixed.split('.');

        const igcLon = degrees.toString().padStart(3, '0') +
            minInt.padStart(2, '0') +
            minDec +
            (lon < 0 ? 'W' : 'E');
        return igcLon;
    } catch (error) {
        return '';
    }
}

/**
 * Convenience function to convert GPX content string directly to IGC
 * @param {string} gpxContent - Raw GPX XML string
 * @param {Object} options - Options passed to gpxToIgc
 * @returns {Promise<Object>} Result with igcString, success, message
 */
export async function convertGpxContentToIgc(gpxContent, options = {}) {
    // Import parseGPX dynamically to avoid circular dependency
    const { parseGPX } = await import('./gpx-parser.js');

    const gpxData = parseGPX(gpxContent);
    if (!gpxData.success) {
        return {
            success: false,
            message: gpxData.message,
            igcString: ''
        };
    }

    return gpxToIgc(gpxData, options);
}
