/**
 * Route file reader for XcnavView
 * 
 * This module reads route files and extracts both route points and waypoints.
 * Unlike waypoint files, route files contain ordered sequences of points
 * that define a flight route.
 * 
 * Supported formats:
 * - GPX (.gpx) - Route (<rte>) and waypoints
 * - SeeYou CUP (.cup) - Waypoints with task definition
 * - KML (.kml) - LineString paths
 * - XCTrack (.xctsk) - XCTrack task format
 * - OZI Explorer (.wpt) - Waypoint files treated as routes
 */

/**
 * Read and parse a route file content
 * @param {string} content - The file content as string
 * @param {string} fileName - The file name (used for format detection)
 * @returns {Object} - { success: boolean, route: Array, waypoints: Array, format: string, error?: string }
 *                     route: Array of {lat, lng, name?, altitude?}
 *                     waypoints: Array of additional waypoints (not part of route)
 */
export function readRouteFile(content, fileName) {
    let fileType = null;
    let routePoints = [];
    let waypoints = [];

    try {
        if (!content || content.trim() === '') {
            return { success: false, route: [], waypoints: [], format: null, error: 'Empty file' };
        }

        // Detect file format
        fileType = detectFileType(content, fileName);

        if (fileType == null) {
            return { success: false, route: [], waypoints: [], format: null, error: 'File format not recognized' };
        }

        switch (fileType) {
            case 'GPX':
                const gpxResult = readGpxRoute(content);
                routePoints = gpxResult.route;
                waypoints = gpxResult.waypoints;
                break;
            case 'CUP':
                routePoints = readCupRoute(content);
                break;
            case 'KML':
                const kmlResult = readKmlRoute(content);
                routePoints = kmlResult.route;
                waypoints = kmlResult.markers;
                break;
            case 'XCTRACK':
                routePoints = readXCTrackRoute(content);
                break;
            case 'OZI':
                const lines = content.split('\n');
                routePoints = readOziRoute(lines);
                break;
            case 'COM':
                const comLines = content.split('\n');
                routePoints = readCompeRoute(comLines);
                break;
        }

        return {
            success: true,
            route: routePoints,
            waypoints: waypoints,
            format: fileType
        };

    } catch (error) {
        console.error('[rte-read.js] Error while parsing route:', error);
        return { success: false, route: [], waypoints: [], format: fileType, error: error.message };
    }
}

/**
 * Detect file type from content or extension
 */
function detectFileType(content, fileName) {
    // Check content first
    if (content.indexOf("OziExplorer") > -1) {
        return "OZI";
    } else if (content.indexOf("<kml xmlns") > -1 || content.indexOf("<kml ") > -1) {
        return "KML";
    } else if ((content.indexOf("<?xml") > -1 || content.indexOf("version=") > -1) && content.indexOf("<gpx") > -1) {
        return "GPX";
    } else if (content.indexOf("rwdir") > -1 || content.indexOf("Rwdir") > -1) {
        return "CUP";
    } else if (testCompeGPS(content)) {
        return "COM";
    } else if (testXCTrack(content)) {
        return "XCTRACK";
    }

    // Try to guess from extension
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
        case 'cup':
            return 'CUP';
        case 'wpt':
            return 'OZI';
        case 'gpx':
            return 'GPX';
        case 'kml':
            return 'KML';
        case 'xctsk':
            return 'XCTRACK';
    }

    return null;
}

/**
 * Read GPX route (handles both <rte> and <trk> elements)
 * Also extracts waypoints
 */
function readGpxRoute(content) {
    const route = [];
    const waypoints = [];

    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");

        // First, try to read <rte> elements (routes)
        const routes = xmlDoc.getElementsByTagName("rte");
        for (let r = 0; r < routes.length; r++) {
            const rtePts = routes[r].getElementsByTagName("rtept");
            for (let i = 0; i < rtePts.length; i++) {
                const pt = rtePts[i];
                const lat = parseFloat(pt.getAttribute("lat"));
                const lon = parseFloat(pt.getAttribute("lon"));

                const nameEl = pt.getElementsByTagName("name")[0];
                const eleEl = pt.getElementsByTagName("ele")[0];

                route.push({
                    lat: lat,
                    lng: lon,
                    name: nameEl ? nameEl.textContent : `RP${route.length + 1}`,
                    altitude: eleEl ? parseInt(eleEl.textContent) : 0
                });
            }
        }

        // If no route found, try <trk> elements (tracks as reference)
        // But for route planning, we typically use simplified track points
        if (route.length === 0) {
            const tracks = xmlDoc.getElementsByTagName("trk");
            for (let t = 0; t < tracks.length; t++) {
                const trkSegs = tracks[t].getElementsByTagName("trkseg");
                for (let s = 0; s < trkSegs.length; s++) {
                    const trkPts = trkSegs[s].getElementsByTagName("trkpt");

                    // For long tracks, sample every Nth point
                    const sampleRate = trkPts.length > 100 ? Math.ceil(trkPts.length / 50) : 1;

                    for (let i = 0; i < trkPts.length; i += sampleRate) {
                        const pt = trkPts[i];
                        const lat = parseFloat(pt.getAttribute("lat"));
                        const lon = parseFloat(pt.getAttribute("lon"));
                        const eleEl = pt.getElementsByTagName("ele")[0];

                        route.push({
                            lat: lat,
                            lng: lon,
                            altitude: eleEl ? parseInt(eleEl.textContent) : 0
                        });
                    }

                    // Always include the last point
                    if (trkPts.length > 0 && route.length > 0) {
                        const lastPt = trkPts[trkPts.length - 1];
                        const lastRoute = route[route.length - 1];
                        const lastLat = parseFloat(lastPt.getAttribute("lat"));
                        const lastLng = parseFloat(lastPt.getAttribute("lon"));

                        if (lastRoute.lat !== lastLat || lastRoute.lng !== lastLng) {
                            const eleEl = lastPt.getElementsByTagName("ele")[0];
                            route.push({
                                lat: lastLat,
                                lng: lastLng,
                                altitude: eleEl ? parseInt(eleEl.textContent) : 0
                            });
                        }
                    }
                }
            }
        }

        // Also read standalone waypoints
        const wpts = xmlDoc.getElementsByTagName("wpt");
        for (let i = 0; i < wpts.length; i++) {
            const wpt = wpts[i];
            const lat = parseFloat(wpt.getAttribute("lat"));
            const lon = parseFloat(wpt.getAttribute("lon"));

            const nameEl = wpt.getElementsByTagName("name")[0];
            const eleEl = wpt.getElementsByTagName("ele")[0];
            const descEl = wpt.getElementsByTagName("desc")[0];

            waypoints.push({
                lat: lat,
                lng: lon,
                name: nameEl ? nameEl.textContent : `WPT${i + 1}`,
                altitude: eleEl ? parseInt(eleEl.textContent) : 0,
                description: descEl ? descEl.textContent : ''
            });
        }

    } catch (error) {
        console.error('Error parsing GPX route:', error);
    }

    return { route, waypoints };
}

/**
 * Read CUP route (SeeYou format)
 * CUP files can have a task section with waypoint references
 */
function readCupRoute(content) {
    const route = [];
    const lines = content.split('\n');
    const waypoints = new Map(); // Store waypoints by name for lookup

    let inTaskSection = false;
    let taskDefinition = null;

    // First, parse all waypoints
    let idxName = -1, idxAlt = -1, idxDesc = -1, idxLat = -1, idxLon = -1;

    // Parse header
    const headerLine = lines[0].toLowerCase();
    const partHeader = headerLine.split(",");

    for (let j = 0; j < partHeader.length; j++) {
        const col = partHeader[j].trim().replace(/"/g, '');
        switch (col) {
            case 'code': idxName = j; break;
            case 'elev': idxAlt = j; break;
            case 'name': idxDesc = j; break;
            case 'lat': idxLat = j; break;
            case 'lon': idxLon = j; break;
        }
    }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check for task section
        if (line.toLowerCase().indexOf("-----related tasks-----") > -1) {
            inTaskSection = true;
            continue;
        }

        if (inTaskSection) {
            // Parse task line (format: "TaskName",wayp1,wayp2,wayp3...)
            if (line.startsWith('"') && !taskDefinition) {
                const taskParts = line.split(',');
                taskDefinition = taskParts.slice(1).map(p => p.replace(/"/g, '').trim());
            }
        } else if (line && idxName !== -1) {
            // Parse waypoint line
            const parts = line.split(",");
            if (parts.length > Math.max(idxName, idxLat, idxLon)) {
                const name = parts[idxName].replace(/"/g, "").trim();
                const lat = decodeCupLat(parts[idxLat]);
                const lng = decodeCupLon(parts[idxLon]);

                let alt = 0;
                if (idxAlt !== -1 && parts[idxAlt]) {
                    const altStr = parts[idxAlt];
                    alt = parseInt(altStr) || 0;
                    if (altStr.indexOf("ft") > -1) {
                        alt = Math.round(alt * 0.3048);
                    }
                }

                if (lat !== null && lng !== null) {
                    waypoints.set(name.toUpperCase(), { lat, lng, name, altitude: alt });
                }
            }
        }
    }

    // If we have a task definition, use it to order waypoints
    if (taskDefinition && taskDefinition.length > 0) {
        for (const wpName of taskDefinition) {
            const key = wpName.toUpperCase();
            if (waypoints.has(key)) {
                route.push(waypoints.get(key));
            }
        }
    }

    // If no task definition, use waypoints in order they appear
    if (route.length === 0) {
        waypoints.forEach((wp) => {
            route.push(wp);
        });
    }

    return route;
}

/**
 * Read KML route (LineString or ordered Placemarks)
 * Also extracts markers from 'Markers' folder
 */
function readKmlRoute(content) {
    const route = [];
    const markers = [];

    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");

        // First, try to find LineString (path)
        const lineStrings = xmlDoc.getElementsByTagName("LineString");
        for (let l = 0; l < lineStrings.length; l++) {
            const coordsEl = lineStrings[l].getElementsByTagName("coordinates")[0];
            if (coordsEl) {
                const coordsText = coordsEl.textContent.trim();
                const coordPairs = coordsText.split(/\s+/);

                for (const pair of coordPairs) {
                    const coords = pair.split(",");
                    if (coords.length >= 2) {
                        const lng = parseFloat(coords[0]);
                        const lat = parseFloat(coords[1]);
                        const alt = coords.length >= 3 ? parseInt(coords[2]) : 0;

                        if (!isNaN(lat) && !isNaN(lng)) {
                            route.push({ lat, lng, altitude: alt });
                        }
                    }
                }
            }
        }

        // Process Folders to find route points and markers separately
        const folders = xmlDoc.getElementsByTagName("Folder");
        for (let f = 0; f < folders.length; f++) {
            const folder = folders[f];
            const folderNameEl = folder.getElementsByTagName("name")[0];
            const folderName = folderNameEl ? folderNameEl.textContent.toLowerCase() : '';

            const placemarks = folder.getElementsByTagName("Placemark");
            for (let i = 0; i < placemarks.length; i++) {
                const pm = placemarks[i];
                const pointEl = pm.getElementsByTagName("Point")[0];

                if (pointEl) {
                    const coordsEl = pointEl.getElementsByTagName("coordinates")[0];
                    if (coordsEl) {
                        const coords = coordsEl.textContent.trim().split(",");
                        if (coords.length >= 2) {
                            const lng = parseFloat(coords[0]);
                            const lat = parseFloat(coords[1]);
                            const alt = coords.length >= 3 ? parseInt(coords[2]) : 0;

                            const nameEl = pm.getElementsByTagName("name")[0];
                            const name = nameEl ? nameEl.textContent : undefined;

                            const point = {
                                lat,
                                lng,
                                name,
                                altitude: alt
                            };

                            // Check if this is in the Markers folder
                            if (folderName === 'markers' || folderName.includes('marker')) {
                                markers.push(point);
                            } else if (folderName === 'route points' || folderName.includes('route')) {
                                // Skip route points if we already have them from LineString
                                if (route.length === 0) {
                                    route.push(point);
                                }
                            }
                        }
                    }
                }
            }
        }

        // If no LineString and no route from folders, try all Placemarks with Points
        if (route.length === 0) {
            const placemarks = xmlDoc.getElementsByTagName("Placemark");
            for (let i = 0; i < placemarks.length; i++) {
                const pm = placemarks[i];
                const pointEl = pm.getElementsByTagName("Point")[0];

                // Skip if already processed as marker
                if (pointEl) {
                    const coordsEl = pointEl.getElementsByTagName("coordinates")[0];
                    if (coordsEl) {
                        const coords = coordsEl.textContent.trim().split(",");
                        if (coords.length >= 2) {
                            const lng = parseFloat(coords[0]);
                            const lat = parseFloat(coords[1]);
                            const alt = coords.length >= 3 ? parseInt(coords[2]) : 0;

                            const nameEl = pm.getElementsByTagName("name")[0];
                            const name = nameEl ? nameEl.textContent : undefined;

                            // Check if style is marker style (red circle)
                            const styleUrl = pm.getElementsByTagName("styleUrl")[0];
                            const isMarker = styleUrl && styleUrl.textContent.includes('markerStyle');

                            if (isMarker) {
                                // Check if not already in markers list
                                const alreadyMarker = markers.some(m => m.lat === lat && m.lng === lng);
                                if (!alreadyMarker) {
                                    markers.push({ lat, lng, name, altitude: alt });
                                }
                            } else {
                                route.push({
                                    lat,
                                    lng,
                                    name,
                                    altitude: alt
                                });
                            }
                        }
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error parsing KML route:', error);
    }

    return { route, markers };
}

/**
 * Read XCTrack task format
 */
function readXCTrackRoute(content) {
    const route = [];

    try {
        const xctrackData = JSON.parse(content);

        if (!xctrackData.turnpoints) {
            return route;
        }

        for (const turnpoint of xctrackData.turnpoints) {
            const wp = turnpoint.waypoint;
            if (wp) {
                route.push({
                    lat: wp.lat,
                    lng: wp.lon,
                    name: wp.name || undefined,
                    altitude: wp.altSmoothed || 0,
                    radius: turnpoint.radius || undefined,
                    type: turnpoint.type || undefined
                });
            }
        }

    } catch (error) {
        console.error('Error parsing XCTrack route:', error);
    }

    return route;
}

/**
 * Read OZI Explorer waypoints as route
 */
function readOziRoute(lines) {
    const route = [];

    // First 4 lines are header
    for (let i = 4; i < lines.length; i++) {
        const element = lines[i];
        const parts = element.split(",");

        if (parts.length > 14) {
            const name = parts[1].trim();
            const lat = parseFloat(parts[2].trim());
            const lng = parseFloat(parts[3].trim());

            // Field 15: Altitude in feet (-777 if not valid)
            let alt = 0;
            const altStr = parts[14].replace(/[^0-9-]/g, "");
            if (altStr && altStr !== '' && altStr !== '-777') {
                alt = Math.round(parseInt(altStr) / 3.2808);
                if (alt < 0) alt = 0;
            }

            if (lat !== 0 && lng !== 0) {
                route.push({
                    lat,
                    lng,
                    name,
                    altitude: alt
                });
            }
        }
    }

    return route;
}

/**
 * Read CompeGPS format as route
 */
function readCompeRoute(lines) {
    const regexp = "W\\s{2}([a-zA-Z0-9_\\s]{2,})\\s{1}A\\s(\\d+\\.\\d*)\\W([N|S])\\s(\\d+\\.\\d*)\\W([E|W])";
    const regexpFull = regexp + "\\s\\d{1,2}-\\w{3}-\\d{2,4}\\s\\d{2}:\\d{2}:\\d{2}\\s" + "(\\d+\\.?\\d*)\\s(.*)";
    const myRegexp = new RegExp(regexpFull, "g");
    const route = [];

    for (let i = 2; i < lines.length; i++) {
        const element = lines[i];
        if (element.match(regexp)) {
            myRegexp.lastIndex = 0;
            const matches = myRegexp.exec(element);
            if (matches && matches.length > 6) {
                const name = matches[1].trim();
                const alt = parseInt(matches[6]) || 0;

                let lat = parseFloat(matches[2]);
                if (matches[3] === 'S') lat = lat * -1;

                let lng = parseFloat(matches[4]);
                if (matches[5] === 'W') lng = lng * -1;

                if (lat !== 0 && lng !== 0) {
                    route.push({
                        lat: parseFloat(lat.toFixed(5)),
                        lng: parseFloat(lng.toFixed(5)),
                        name,
                        altitude: alt
                    });
                }
            }
        }
    }

    return route;
}

// --- Helper functions ---

function testCompeGPS(content) {
    try {
        const lines = content.split('\n');
        if (lines.length > 2) {
            const line1 = lines[0].replace(/\s/g, '');
            if (line1.indexOf('GWGS84') > -1) {
                const line2 = lines[1].replace(/\s/g, '');
                if (line2.indexOf('U1') > -1) {
                    return true;
                }
            }
        }
    } catch (e) {
        return false;
    }
    return false;
}

function testXCTrack(content) {
    try {
        const data = JSON.parse(content);
        return data.taskType !== undefined || data.turnpoints !== undefined;
    } catch (e) {
        return false;
    }
}

function decodeCupLat(sLat) {
    try {
        if (!sLat) return null;
        sLat = sLat.replace(/"/g, '').trim();

        // Format: 4553.445N (degrees, minutes with decimals, hemisphere)
        const sDeg = sLat.substring(0, 2);
        const sMn = sLat.substring(2, 8);
        const sHem = sLat.substring(8).trim();

        const degParsed = parseInt(sDeg);
        const minParsed = parseFloat(sMn);

        if (!isNaN(degParsed) && !isNaN(minParsed)) {
            let calcLatitude = degParsed + ((minParsed * 60) / 3600);
            if (sHem === 'S') calcLatitude = calcLatitude * -1;
            return parseFloat(calcLatitude.toFixed(5));
        }
    } catch (e) {
        console.warn('Error decoding CUP latitude:', sLat);
    }
    return null;
}

function decodeCupLon(sLong) {
    try {
        if (!sLong) return null;
        sLong = sLong.replace(/"/g, '').trim();

        // Format: 00627.076E (degrees, minutes with decimals, hemisphere)
        const sDeg = sLong.substring(0, 3);
        const sMn = sLong.substring(3, 9);
        const sMer = sLong.substring(9).trim();

        const degParsed = parseInt(sDeg);
        const minParsed = parseFloat(sMn);

        if (!isNaN(degParsed) && !isNaN(minParsed)) {
            let calcLongitude = degParsed + ((minParsed * 60) / 3600);
            if (sMer === 'W') calcLongitude = calcLongitude * -1;
            return parseFloat(calcLongitude.toFixed(5));
        }
    } catch (e) {
        console.warn('Error decoding CUP longitude:', sLong);
    }
    return null;
}

/**
 * Get format label for display
 */
export function getFormatLabel(format) {
    const labels = {
        'GPX': 'GPX',
        'CUP': 'SeeYou CUP',
        'KML': 'Google Earth KML',
        'XCTRACK': 'XCTrack',
        'OZI': 'OZI Explorer',
        'COM': 'CompeGPS'
    };
    return labels[format] || format;
}
