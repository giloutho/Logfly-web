/**
 * Waypoint file writer for web environment
 * Adapted from logfly609/src/utils/geo/wayp-write.js
 * 
 * Supported export formats:
 * - OZI Explorer (.wpt)
 * - SeeYou CUP (.cup)
 * - CompeGPS (.wpt)
 * - GPX (.gpx)
 * - KML (.kml)
 */

/**
 * Export waypoints to file
 * @param {Array} waypoints - Array of waypoint objects
 * @param {string} format - Export format: 'ozi', 'cup', 'compe', 'gpx', 'kml'
 * @param {string} fileName - Base filename (without extension)
 */
export function exportWaypoints(waypoints, format, fileName = 'waypoints') {
    if (!waypoints || waypoints.length === 0) {
        return { success: false, error: 'No waypoints to export' };
    }

    let content = '';
    let extension = '';
    let mimeType = 'text/plain';

    switch (format.toLowerCase()) {
        case 'ozi':
            content = generateOzi(waypoints);
            extension = '.wpt';
            break;
        case 'cup':
            content = generateCup(waypoints);
            extension = '.cup';
            break;
        case 'compe':
            content = generateCompe(waypoints);
            extension = '.wpt';
            break;
        case 'gpx':
            content = generateGpx(waypoints);
            extension = '.gpx';
            mimeType = 'application/gpx+xml';
            break;
        case 'kml':
            content = generateKml(waypoints);
            extension = '.kml';
            mimeType = 'application/vnd.google-earth.kml+xml';
            break;
        default:
            return { success: false, error: 'Unknown export format' };
    }

    // Download file
    downloadFile(content, fileName + extension, mimeType);

    return { success: true };
}

/**
 * Generate OZI Explorer format
 */
function generateOzi(waypoints) {
    // Delphi TDateTime
    const date = new Date();
    const seconds = (date.getTime() - new Date("12-30-1899").getTime()) / 1000;
    const delphiDate = seconds / 60 / 60 / 24;
    const delphiDate7dig = (Math.round(delphiDate * 10000000) / 10000000).toFixed(7);

    const field6to10 = ' 0, 1, 3,         0,     65535';
    const field12to14 = ' 0, 0,    0';
    const field16to18 = '6,0,17';

    let oziText = 'OziExplorer Waypoint File Version 1.0\r\n';
    oziText += 'WGS 84\r\n';
    oziText += 'Reserved 2\r\n';
    oziText += 'Reserved 3\r\n';

    waypoints.forEach((wp, i) => {
        const orderNumber = (i + 1).toString().padStart(4, ' ');
        let shortName = wp.shortName.substring(0, 6).padEnd(14, ' ');
        const lat6digit = parseFloat(wp.latitude).toFixed(6).padStart(11, ' ');
        const long6digit = parseFloat(wp.longitude).toFixed(6).padStart(11, ' ');
        let longName = (wp.longName || wp.shortName).substring(0, 40).padEnd(40, ' ');
        const altiFeet = Math.round(wp.altitude * 3.280839895).toString().padStart(5, ' ');

        oziText += `${orderNumber},${shortName},${lat6digit},${long6digit},${delphiDate7dig},${field6to10},${longName},${field12to14},${altiFeet},${field16to18}\r\n`;
    });

    return oziText;
}

/**
 * Generate SeeYou CUP format
 */
function generateCup(waypoints) {
    let cupText = 'name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc\r\n';

    waypoints.forEach(wp => {
        const sName = wp.longName || wp.shortName;
        const sCode = wp.shortName;
        const cupLat = encodeCupLat(wp.latitude);
        const cupLong = encodeCupLong(wp.longitude);
        const elev = wp.altitude + 'm';

        // Style: 1=Standard, 2=Airfield grass, 3=Outlanding, 4=Airfield solid, 5=TakeOff, 6=Landing
        let style = 1;
        if (wp.type === 'T') style = 5;
        else if (wp.type === 'L') style = 6;

        cupText += `"${sName}",${sCode},,${cupLat},${cupLong},${elev},${style},,,,\r\n`;
    });

    return cupText;
}

/**
 * Generate CompeGPS format
 */
function generateCompe(waypoints) {
    let compeText = 'G  WGS 84\r\n';
    compeText += 'U  1\r\n';

    waypoints.forEach(wp => {
        const sName = wp.longName || wp.shortName;
        const sCode = wp.shortName;
        const compLat = encodeCompLat(parseFloat(wp.latitude));
        const compLong = encodeCompLong(parseFloat(wp.longitude));
        const sAlt = parseFloat(wp.altitude).toFixed(6);

        compeText += `W  ${sCode} A ${compLat} ${compLong} 27-MAR-62 00:00:00 ${sAlt} ${sName}\r\n`;
    });

    return compeText;
}

/**
 * Generate GPX format
 */
function generateGpx(waypoints) {
    const creationDate = new Date().toISOString();

    let gpxText = '<?xml version="1.0" encoding="UTF-8"?>\r\n';
    gpxText += '<gpx xmlns="http://www.topografix.com/GPX/1/1"\r\n';
    gpxText += '     creator="Logfly"\r\n';
    gpxText += '     version="1.1"\r\n';
    gpxText += '     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\r\n';
    gpxText += '     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\r\n';
    gpxText += '  <metadata>\r\n';
    gpxText += `    <time>${creationDate}</time>\r\n`;
    gpxText += '  </metadata>\r\n';

    waypoints.forEach(wp => {
        const lat = parseFloat(wp.latitude).toFixed(6);
        const lon = parseFloat(wp.longitude).toFixed(6);
        const ele = parseFloat(wp.altitude).toFixed(1);
        const name = escapeXml(wp.shortName);
        const desc = escapeXml(wp.longName || wp.shortName);

        gpxText += `  <wpt lat="${lat}" lon="${lon}">\r\n`;
        gpxText += `    <ele>${ele}</ele>\r\n`;
        gpxText += `    <name>${name}</name>\r\n`;
        gpxText += `    <cmt>${desc}</cmt>\r\n`;
        gpxText += `    <desc>${desc}</desc>\r\n`;
        gpxText += '  </wpt>\r\n';
    });

    gpxText += '</gpx>';

    return gpxText;
}

/**
 * Generate KML format
 */
function generateKml(waypoints) {
    let kmlText = '<?xml version="1.0" encoding="UTF-8"?>\r\n';
    kmlText += '<kml xmlns="http://www.opengis.net/kml/2.2"\r\n';
    kmlText += '     xmlns:gx="http://www.google.com/kml/ext/2.2">\r\n';
    kmlText += '  <Document>\r\n';
    kmlText += '    <name>Waypoints</name>\r\n';
    kmlText += '    <description>Created by Logfly</description>\r\n';

    // Icon styles
    kmlText += '    <Style id="waypoint_n">\r\n';
    kmlText += '      <IconStyle>\r\n';
    kmlText += '        <Icon>\r\n';
    kmlText += '          <href>http://maps.google.com/mapfiles/kml/pal4/icon61.png</href>\r\n';
    kmlText += '        </Icon>\r\n';
    kmlText += '      </IconStyle>\r\n';
    kmlText += '    </Style>\r\n';
    kmlText += '    <StyleMap id="waypoint">\r\n';
    kmlText += '      <Pair>\r\n';
    kmlText += '        <key>normal</key>\r\n';
    kmlText += '        <styleUrl>#waypoint_n</styleUrl>\r\n';
    kmlText += '      </Pair>\r\n';
    kmlText += '    </StyleMap>\r\n';
    kmlText += '    <Folder>\r\n';
    kmlText += '      <name>Waypoints</name>\r\n';

    waypoints.forEach(wp => {
        const lat = parseFloat(wp.latitude).toFixed(6);
        const lon = parseFloat(wp.longitude).toFixed(6);
        const alt = parseFloat(wp.altitude).toFixed(2);
        const name = escapeXml(wp.shortName);

        kmlText += '      <Placemark>\r\n';
        kmlText += `        <name>${name}</name>\r\n`;
        kmlText += '        <styleUrl>#waypoint</styleUrl>\r\n';
        kmlText += '        <Point>\r\n';
        kmlText += `          <coordinates>${lon},${lat},${alt}</coordinates>\r\n`;
        kmlText += '        </Point>\r\n';
        kmlText += '      </Placemark>\r\n';
    });

    kmlText += '    </Folder>\r\n';
    kmlText += '  </Document>\r\n';
    kmlText += '</kml>';

    return kmlText;
}

// --- Helper functions ---

function encodeCupLat(degrees) {
    let iSign = 1;
    if (degrees < 0) {
        degrees = -degrees;
        iSign = -1;
    }
    const latDegres = Math.floor(degrees);
    const sLatDegres = latDegres.toString().padStart(2, '0');
    const dMinutesPart = (degrees - latDegres) * 60;
    const hemisphere = iSign === 1 ? 'N' : 'S';

    return sLatDegres + dMinutesPart.toFixed(3) + hemisphere;
}

function encodeCupLong(degrees) {
    let iSign = 1;
    if (degrees < 0) {
        degrees = -degrees;
        iSign = -1;
    }
    const longDegres = Math.floor(degrees);
    const sLongDegres = longDegres.toString().padStart(3, '0');
    const dMinutesPart = (degrees - longDegres) * 60;
    const meridian = iSign === 1 ? 'E' : 'W';

    return sLongDegres + dMinutesPart.toFixed(3) + meridian;
}

function encodeCompLat(degrees) {
    let iSign = 1;
    if (degrees < 0) {
        iSign = -1;
        degrees = degrees * -1;
    }
    const strLat = degrees.toFixed(10).padStart(13, '0');
    const hemisphere = iSign === 1 ? 'N' : 'S';

    return strLat + String.fromCharCode(186) + hemisphere;
}

function encodeCompLong(degrees) {
    let iSign = 1;
    if (degrees < 0) {
        iSign = -1;
        degrees = degrees * -1;
    }
    const strLong = degrees.toFixed(10).padStart(14, '0');
    const meridian = iSign === 1 ? 'E' : 'W';

    return strLong + String.fromCharCode(186) + meridian;
}

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Get available export formats
 */
export function getExportFormats() {
    return [
        { value: 'ozi', title: 'Ozi Explorer (.wpt)' },
        { value: 'cup', title: 'SeeYou CUP (.cup)' },
        { value: 'compe', title: 'CompeGPS (.wpt)' },
        { value: 'gpx', title: 'GPX (.gpx)' },
        { value: 'kml', title: 'Google Earth KML (.kml)' }
    ];
}
