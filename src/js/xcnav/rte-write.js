/**
 * Route file writer for XcnavView
 * 
 * This module exports routes and markers to various file formats.
 * 
 * Supported export formats:
 * - GPX route (.gpx)
 * - GPX with markers (.gpx)
 * - GPX waypoints only (.gpx)
 * - SeeYou CUP (.cup)
 * - Google Earth KML (.kml)
 * - XCTrack task (.xctsk)
 * - GPSDump/OZI (.wpt)
 */

/**
 * Export route to specified format
 * @param {Object} options - Export options
 * @param {Array} options.route - Array of route points [{lat, lng, name?, altitude?}]
 * @param {Array} options.markers - Optional array of markers [{lat, lng, name?}]
 * @param {string} options.format - Export format ('gpx', 'gpx-markers', 'gpx-wpt', 'cup', 'kml', 'xctsk', 'wpt')
 * @param {string} options.name - Route/task name
 * @param {boolean} options.includeMarkers - Whether to include markers in export
 * @returns {Object} - { success: boolean, content: string, extension: string, mimeType: string, error?: string }
 */
export function exportRoute(options) {
    const {
        route = [],
        markers = [],
        format = 'gpx',
        name = 'LogflyRoute',
        includeMarkers = false
    } = options;

    if (!route || route.length < 2) {
        return { success: false, content: '', extension: '', mimeType: '', error: 'Route must have at least 2 points' };
    }

    try {
        let content = '';
        let extension = '';
        let mimeType = '';

        switch (format) {
            case 'gpx':
                content = exportGpxRoute(route, name);
                extension = 'gpx';
                mimeType = 'application/gpx+xml';
                break;
            case 'gpx-markers':
                content = exportGpxWithMarkers(route, markers, name, includeMarkers);
                extension = 'gpx';
                mimeType = 'application/gpx+xml';
                break;
            case 'gpx-wpt':
                content = exportGpxWaypoints(route, markers, name, includeMarkers);
                extension = 'gpx';
                mimeType = 'application/gpx+xml';
                break;
            case 'cup':
                content = exportCup(route, markers, name, includeMarkers);
                extension = 'cup';
                mimeType = 'text/plain';
                break;
            case 'kml':
                content = exportKml(route, markers, name, includeMarkers);
                extension = 'kml';
                mimeType = 'application/vnd.google-earth.kml+xml';
                break;
            case 'xctsk':
                content = exportXCTrack(route, name);
                extension = 'xctsk';
                mimeType = 'application/json';
                break;
            case 'wpt':
                content = exportOzi(route, markers, name, includeMarkers);
                extension = 'wpt';
                mimeType = 'text/plain';
                break;
            default:
                return { success: false, content: '', extension: '', mimeType: '', error: 'Unknown format' };
        }

        return { success: true, content, extension, mimeType };

    } catch (error) {
        console.error('[rte-write.js] Export error:', error);
        return { success: false, content: '', extension: '', mimeType: '', error: error.message };
    }
}

/**
 * Trigger download of the exported file
 * @param {string} content - File content
 * @param {string} fileName - File name without extension
 * @param {string} extension - File extension
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, fileName, extension, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// --- Export functions ---

/**
 * Export as GPX route only
 */
function exportGpxRoute(route, name) {
    const timestamp = new Date().toISOString();

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Logfly Web - logfly.org"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${timestamp}</time>
    <desc>Route created with Logfly Web</desc>
  </metadata>
  <rte>
    <name>${escapeXml(name)}</name>
`;

    route.forEach((point, index) => {
        const pointName = point.name || `RP${index + 1}`;
        const alt = point.altitude || 0;
        gpx += `    <rtept lat="${point.lat.toFixed(6)}" lon="${point.lng.toFixed(6)}">
      <ele>${alt}</ele>
      <name>${escapeXml(pointName)}</name>
    </rtept>\n`;
    });

    gpx += `  </rte>
</gpx>`;

    return gpx;
}

/**
 * Export as GPX with route and markers as waypoints
 */
function exportGpxWithMarkers(route, markers, name, includeMarkers) {
    const timestamp = new Date().toISOString();

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Logfly Web - logfly.org"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${timestamp}</time>
    <desc>Route and waypoints created with Logfly Web</desc>
  </metadata>
`;

    // Add markers as waypoints
    if (includeMarkers && markers && markers.length > 0) {
        markers.forEach((marker, index) => {
            if (marker) {
                const latlng = marker.getLatLng ? marker.getLatLng() : marker;
                const markerName = marker.name || `Marker${index + 1}`;
                gpx += `  <wpt lat="${latlng.lat.toFixed(6)}" lon="${latlng.lng.toFixed(6)}">
    <name>${escapeXml(markerName)}</name>
    <desc>Marker</desc>
  </wpt>\n`;
            }
        });
    }

    // Add route
    gpx += `  <rte>
    <name>${escapeXml(name)}</name>
`;

    route.forEach((point, index) => {
        const pointName = point.name || `RP${index + 1}`;
        const alt = point.altitude || 0;
        gpx += `    <rtept lat="${point.lat.toFixed(6)}" lon="${point.lng.toFixed(6)}">
      <ele>${alt}</ele>
      <name>${escapeXml(pointName)}</name>
    </rtept>\n`;
    });

    gpx += `  </rte>
</gpx>`;

    return gpx;
}

/**
 * Export route points as GPX waypoints (not as route)
 */
function exportGpxWaypoints(route, markers, name, includeMarkers) {
    const timestamp = new Date().toISOString();

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Logfly Web - logfly.org"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${timestamp}</time>
    <desc>Waypoints from Logfly Web route</desc>
  </metadata>
`;

    // Route points as waypoints
    route.forEach((point, index) => {
        const pointName = point.name || `WP${index + 1}`;
        const alt = point.altitude || 0;
        gpx += `  <wpt lat="${point.lat.toFixed(6)}" lon="${point.lng.toFixed(6)}">
    <ele>${alt}</ele>
    <name>${escapeXml(pointName)}</name>
    <desc>Route point ${index + 1}</desc>
  </wpt>\n`;
    });

    // Add markers if requested
    if (includeMarkers && markers && markers.length > 0) {
        markers.forEach((marker, index) => {
            if (marker) {
                const latlng = marker.getLatLng ? marker.getLatLng() : marker;
                const markerName = marker.name || `MK${index + 1}`;
                gpx += `  <wpt lat="${latlng.lat.toFixed(6)}" lon="${latlng.lng.toFixed(6)}">
    <name>${escapeXml(markerName)}</name>
    <desc>Marker</desc>
  </wpt>\n`;
            }
        });
    }

    gpx += `</gpx>`;
    return gpx;
}

/**
 * Export as SeeYou CUP format
 */
function exportCup(route, markers, name, includeMarkers) {
    let cup = 'name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc\n';

    // Add route points
    route.forEach((point, index) => {
        const pointName = point.name || `RP${index + 1}`;
        const code = pointName.substring(0, 6).toUpperCase();
        const lat = encodeCupLat(point.lat);
        const lon = encodeCupLon(point.lng);
        const elev = (point.altitude || 0) + 'm';

        cup += `"${pointName}","${code}",,"${lat}","${lon}",${elev},1,,,,"Route point"\n`;
    });

    // Add markers if requested
    if (includeMarkers && markers && markers.length > 0) {
        markers.forEach((marker, index) => {
            if (marker) {
                const latlng = marker.getLatLng ? marker.getLatLng() : marker;
                const markerName = marker.name || `MK${index + 1}`;
                const code = markerName.substring(0, 6).toUpperCase();
                const lat = encodeCupLat(latlng.lat);
                const lon = encodeCupLon(latlng.lng);

                cup += `"${markerName}","${code}",,"${lat}","${lon}",0m,1,,,,"Marker"\n`;
            }
        });
    }

    // Add task section
    cup += '\n-----Related Tasks-----\n';

    // Create task line with route points
    const taskWaypoints = route.map((point, index) => {
        const pointName = point.name || `RP${index + 1}`;
        return '"' + pointName.substring(0, 6).toUpperCase() + '"';
    }).join(',');

    cup += `"${name}",${taskWaypoints}\n`;

    return cup;
}

/**
 * Export as Google Earth KML format
 */
function exportKml(route, markers, name, includeMarkers) {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(name)}</name>
    <description>Route created with Logfly Web</description>
    
    <Style id="routeStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
    </Style>
    
    <Style id="pointStyle">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/wht-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Style id="markerStyle">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Folder>
      <name>Route Points</name>
`;

    // Add route points as placemarks
    route.forEach((point, index) => {
        const pointName = point.name || `RP${index + 1}`;
        const alt = point.altitude || 0;
        kml += `      <Placemark>
        <name>${escapeXml(pointName)}</name>
        <styleUrl>#pointStyle</styleUrl>
        <Point>
          <altitudeMode>clampToGround</altitudeMode>
          <coordinates>${point.lng.toFixed(6)},${point.lat.toFixed(6)},${alt}</coordinates>
        </Point>
      </Placemark>\n`;
    });

    kml += `    </Folder>
    
    <Placemark>
      <name>${escapeXml(name)} - Path</name>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <altitudeMode>clampToGround</altitudeMode>
        <coordinates>`;

    // Add coordinates for the path
    const coords = route.map(p => `${p.lng.toFixed(6)},${p.lat.toFixed(6)},${p.altitude || 0}`);
    kml += coords.join(' ');

    kml += `</coordinates>
      </LineString>
    </Placemark>
`;

    // Add markers if requested
    if (includeMarkers && markers && markers.length > 0) {
        kml += `    <Folder>
      <name>Markers</name>
`;
        markers.forEach((marker, index) => {
            if (marker) {
                const latlng = marker.getLatLng ? marker.getLatLng() : marker;
                const markerName = marker.name || `Marker${index + 1}`;
                kml += `      <Placemark>
        <name>${escapeXml(markerName)}</name>
        <styleUrl>#markerStyle</styleUrl>
        <Point>
          <altitudeMode>clampToGround</altitudeMode>
          <coordinates>${latlng.lng.toFixed(6)},${latlng.lat.toFixed(6)},0</coordinates>
        </Point>
      </Placemark>\n`;
            }
        });
        kml += `    </Folder>
`;
    }

    kml += `  </Document>
</kml>`;

    return kml;
}

/**
 * Export as XCTrack task format
 */
function exportXCTrack(route, name) {
    const task = {
        taskType: "OPEN_DISTANCE",
        version: 1,
        earthModel: "WGS84",
        turnpoints: []
    };

    route.forEach((point, index) => {
        const isFirst = index === 0;
        const isLast = index === route.length - 1;

        const turnpoint = {
            radius: isFirst || isLast ? 400 : 1000,
            waypoint: {
                name: point.name || `TP${index + 1}`,
                lat: point.lat,
                lon: point.lng,
                altSmoothed: point.altitude || 0
            }
        };

        // Set turnpoint type
        if (isFirst) {
            turnpoint.type = "TAKEOFF";
        } else if (isLast) {
            turnpoint.type = "GOAL";
        } else {
            turnpoint.type = "TURNPOINT";
        }

        task.turnpoints.push(turnpoint);
    });

    // Determine task type based on route structure
    if (route.length >= 3) {
        const firstPoint = route[0];
        const lastPoint = route[route.length - 1];
        const distance = calculateDistance(firstPoint.lat, firstPoint.lng, lastPoint.lat, lastPoint.lng);

        if (distance < 3) {  // Less than 3km - likely a closed circuit
            if (route.length === 4) {
                task.taskType = "TRIANGLE";
            } else {
                task.taskType = "OUT_AND_RETURN";
            }
        }
    }

    return JSON.stringify(task, null, 2);
}

/**
 * Export as OZI Explorer / GPSDump format
 */
function exportOzi(route, markers, name, includeMarkers) {
    let wpt = 'OziExplorer Waypoint File Version 1.1\n';
    wpt += 'WGS 84\n';
    wpt += 'Reserved 2\n';
    wpt += 'Reserved 3\n';

    let pointIndex = 1;

    // Add route points
    route.forEach((point, index) => {
        const pointName = (point.name || `RP${index + 1}`).substring(0, 10).padEnd(10);
        const lat = point.lat.toFixed(6);
        const lng = point.lng.toFixed(6);
        const altFeet = Math.round((point.altitude || 0) * 3.2808);

        wpt += `${pointIndex},${pointName}, ${lat}, ${lng},,0,1,3,0,65535,,0,${altFeet},6,0,17\n`;
        pointIndex++;
    });

    // Add markers if requested
    if (includeMarkers && markers && markers.length > 0) {
        markers.forEach((marker, index) => {
            if (marker) {
                const latlng = marker.getLatLng ? marker.getLatLng() : marker;
                const markerName = (marker.name || `MK${index + 1}`).substring(0, 10).padEnd(10);
                const lat = latlng.lat.toFixed(6);
                const lng = latlng.lng.toFixed(6);

                wpt += `${pointIndex},${markerName}, ${lat}, ${lng},,0,1,3,0,65535,,0,0,6,0,17\n`;
                pointIndex++;
            }
        });
    }

    return wpt;
}

// --- Helper functions ---

function escapeXml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function encodeCupLat(decLat) {
    const hemi = decLat >= 0 ? 'N' : 'S';
    const absLat = Math.abs(decLat);
    const deg = Math.floor(absLat);
    const min = (absLat - deg) * 60;

    return deg.toString().padStart(2, '0') + min.toFixed(3).padStart(6, '0') + hemi;
}

function encodeCupLon(decLon) {
    const hemi = decLon >= 0 ? 'E' : 'W';
    const absLon = Math.abs(decLon);
    const deg = Math.floor(absLon);
    const min = (absLon - deg) * 60;

    return deg.toString().padStart(3, '0') + min.toFixed(3).padStart(6, '0') + hemi;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Get available export formats
 */
export function getExportFormats(gettext) {
    return [
        { title: 'GPX (' + (gettext ? gettext('route') : 'route') + ')', value: 'gpx' },
        { title: 'GPX + ' + (gettext ? gettext('markers') : 'markers'), value: 'gpx-markers' },
        { title: 'GPX (' + (gettext ? gettext('waypoints') : 'waypoints') + ')', value: 'gpx-wpt' },
        { title: 'SeeYou CUP', value: 'cup' },
        { title: 'Google Earth KML', value: 'kml' },
        { title: 'XCTrack', value: 'xctsk' },
        { title: 'GPSDump/OZI', value: 'wpt' }
    ];
}
