/**
 * Converts parsed IGC data to GPX format
 * 
 * @param {Object} igcData - Parsed IGC data with fixes array
 * @param {Array} igcData.fixes - Array of fix points [{timestamp, latitude, longitude, gpsAltitude, ...}]
 * @param {Object} [igcData.info] - Optional metadata (pilot, glider, date)
 * @returns {string} GPX XML string
 */
export function igcToGpx(igcData) {
    if (!igcData || !igcData.fixes || igcData.fixes.length === 0) {
        throw new Error('Invalid IGC data: no fixes found');
    }

    const fixes = igcData.fixes;
    const info = igcData.info || {};

    // Build track name from metadata or use default
    const trackName = info.date
        ? `Flight ${info.date}`
        : 'IGC Flight';

    // GPX header
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Logfly"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(trackName)}</name>
    <desc>Converted from IGC by Logfly</desc>
  </metadata>
  <trk>
    <name>${escapeXml(trackName)}</name>
    <trkseg>
`;

    // Add track points
    for (const fix of fixes) {
        const lat = fix.latitude;
        const lon = fix.longitude;
        const ele = fix.gpsAltitude || fix.pressureAltitude || 0;
        const time = fix.timestamp ? new Date(fix.timestamp).toISOString() : '';

        gpx += `      <trkpt lat="${lat}" lon="${lon}">
        <ele>${ele}</ele>`;
        if (time) {
            gpx += `
        <time>${time}</time>`;
        }
        gpx += `
      </trkpt>
`;
    }

    // GPX footer
    gpx += `    </trkseg>
  </trk>
</gpx>`;

    return gpx;
}

/**
 * Escapes special XML characters
 */
function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Creates a Blob URL for GPX content
 * @param {string} gpxContent - GPX XML string
 * @returns {string} Blob URL that can be used as a file source
 */
export function createGpxBlobUrl(gpxContent) {
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    return URL.createObjectURL(blob);
}
