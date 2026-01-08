/**
 * Waypoint file reader for web environment
 * Adapted from logfly609/src/utils/geo/wayp-read.js
 * 
 * Supported formats:
 * - OZI Explorer (.wpt)
 * - SeeYou CUP (.cup)
 * - CompeGPS (.wpt)
 * - GPX (.gpx)
 * - KML (.kml)
 * - XCTrack (.xctsk)
 */

/**
 * Read and parse a waypoint file content
 * @param {string} content - The file content as string
 * @param {string} fileName - The file name (used for format detection)
 * @returns {Object} - { success: boolean, waypoints: Array, format: string, error?: string }
 */
export function readWaypointFile(content, fileName) {
    let fileType = null;
    let arrWayp = [];

    try {
        if (!content || content.trim() === '') {
            return { success: false, waypoints: [], format: null, error: 'Empty file' };
        }

        // Detect file format
        if (content.indexOf("OziExplorer") > -1) {
            fileType = "OZI";
        } else if (content.indexOf("<kml xmlns") > -1) {
            fileType = "KML";
        } else if (content.indexOf("<?xml version=\"1.0\"") > -1 || content.indexOf("version=\"1.1\"") > -1) {
            // Check if it's GPX
            if (content.indexOf("<gpx") > -1) {
                fileType = "GPX";
            }
        } else if (content.indexOf("rwdir") > -1 || content.indexOf("Rwdir") > -1) {
            fileType = "CUP";
        } else if (testCompeGPS(content)) {
            fileType = "COM";
        } else if (testXCTrack(content)) {
            fileType = "XCTRACK";
        }

        if (fileType == null) {
            // Try to guess from extension
            const ext = fileName.split('.').pop().toLowerCase();
            switch (ext) {
                case 'cup':
                    fileType = 'CUP';
                    break;
                case 'wpt':
                    fileType = 'OZI'; // Could also be CompeGPS
                    break;
                case 'gpx':
                    fileType = 'GPX';
                    break;
                case 'kml':
                    fileType = 'KML';
                    break;
                case 'xctsk':
                    fileType = 'XCTRACK';
                    break;
            }
        }

        if (fileType == null) {
            return { success: false, waypoints: [], format: null, error: 'File format not recognized' };
        }

        const lines = content.split('\n');

        switch (fileType) {
            case 'OZI':
                arrWayp = readOzi(lines);
                break;
            case 'CUP':
                arrWayp = readCup(lines);
                break;
            case 'COM':
                arrWayp = readCompe(lines);
                break;
            case 'GPX':
                arrWayp = readGpx(content);
                break;
            case 'KML':
                arrWayp = readKml(content);
                break;
            case 'XCTRACK':
                arrWayp = readXCTrack(content);
                break;
        }

        return { success: true, waypoints: arrWayp, format: fileType };

    } catch (error) {
        console.error('[wayp-read.js] Error while decoding:', error);
        return { success: false, waypoints: [], format: fileType, error: error.message };
    }
}

/**
 * Read OZI Explorer format
 */
function readOzi(lines) {
    const arrOzi = [];
    let idxPoint = 0;

    // First 4 lines are header
    for (let i = 4; i < lines.length; i++) {
        const element = lines[i];
        const partPoint = element.split(",");

        if (partPoint.length > 14) {
            // Field 2: Name
            const wName = partPoint[1].trim();

            // Field 15: Altitude in feet (-777 if not valid)
            let piecePoint = partPoint[14];
            let wAlt = 0;
            piecePoint = piecePoint.replace(/[^0-9-]/g, "");
            if (piecePoint && piecePoint !== '' && piecePoint !== '-777') {
                wAlt = Math.round(parseInt(piecePoint) / 3.2808);
                if (wAlt < 0) wAlt = 0;
            }

            // Try to extract altitude from name if alt is 0 and name is 6 chars
            if (wAlt === 0 && wName.length === 6) {
                try {
                    wAlt = parseInt(wName.substring(4)) || 0;
                } catch (e) {
                    wAlt = 0;
                }
            }

            // Field 11: Description
            const wDesc = partPoint[10].trim();
            // Field 3: Latitude
            const wLat = parseFloat(partPoint[2].trim());
            // Field 4: Longitude
            const wLong = parseFloat(partPoint[3].trim());

            if (wLat !== 0 && wLong !== 0) {
                arrOzi.push({
                    id: idxPoint,
                    shortName: wName,
                    longName: wDesc || wName,
                    altitude: wAlt,
                    latitude: wLat,
                    longitude: wLong,
                    type: 'S', // Standard
                    selected: true
                });
                idxPoint++;
            }
        }
    }

    return arrOzi;
}

/**
 * Read SeeYou CUP format
 */
function readCup(lines) {
    const arrCup = [];
    let idxName = -1;
    let idxAlt = -1;
    let idxDesc = -1;
    let idxLat = -1;
    let idxLon = -1;

    // Parse header line
    const headerLine = lines[0].toLowerCase();
    const partHeader = headerLine.split(",");

    for (let j = 0; j < partHeader.length; j++) {
        const col = partHeader[j].trim();
        switch (col) {
            case 'code':
                idxName = j;
                break;
            case 'elev':
                idxAlt = j;
                break;
            case 'name':
                idxDesc = j;
                break;
            case 'lat':
                idxLat = j;
                break;
            case 'lon':
                idxLon = j;
                break;
        }
    }

    if (idxName === -1 || idxAlt === -1 || idxDesc === -1 || idxLat === -1 || idxLon === -1) {
        console.warn('Invalid CUP header line');
        return arrCup;
    }

    let idxPoint = 0;
    for (let i = 1; i < lines.length; i++) {
        // Stop at task section
        if (lines[i].toLowerCase().indexOf("task") > -1) {
            break;
        }

        const element = lines[i];
        if (element.trim() !== '') {
            const partPoint = element.split(",");
            if (partPoint.length > Math.max(idxName, idxAlt, idxDesc, idxLat, idxLon)) {
                const wName = partPoint[idxName].replace(/"/g, "").trim();
                const wDesc = partPoint[idxDesc].replace(/"/g, "").trim();

                // Elevation decoding
                let wAlt = 0;
                const altStr = partPoint[idxAlt];
                const altParsed = parseInt(altStr);
                if (!isNaN(altParsed)) {
                    if (altStr.indexOf("ft") > -1) {
                        wAlt = Math.round(altParsed * 0.3048);
                    } else {
                        wAlt = altParsed;
                    }
                }

                const wLat = decodeCupLat(partPoint[idxLat]);
                const wLong = decodeCupLon(partPoint[idxLon]);

                if (wLat !== null && wLong !== null) {
                    arrCup.push({
                        id: idxPoint,
                        shortName: wName,
                        longName: wDesc || wName,
                        altitude: wAlt,
                        latitude: wLat,
                        longitude: wLong,
                        type: 'S',
                        selected: true
                    });
                    idxPoint++;
                }
            }
        }
    }

    return arrCup;
}

/**
 * Read CompeGPS format
 */
function readCompe(lines) {
    const regexp = "W\\s{2}([a-zA-Z0-9_\\s]{2,})\\s{1}A\\s(\\d+\\.\\d*)\\W([N|S])\\s(\\d+\\.\\d*)\\W([E|W])";
    const regexpFull = regexp + "\\s\\d{1,2}-\\w{3}-\\d{2,4}\\s\\d{2}:\\d{2}:\\d{2}\\s" + "(\\d+\\.?\\d*)\\s(.*)";
    const myRegexp = new RegExp(regexpFull, "g");
    const arrComp = [];
    let idxPoint = 0;

    for (let i = 2; i < lines.length; i++) {
        const element = lines[i];
        if (element.match(regexp)) {
            myRegexp.lastIndex = 0;
            const matches = myRegexp.exec(element);
            if (matches && matches.length > 6) {
                const wName = matches[1].trim();
                const wDesc = matches[7] ? matches[7].trim() : wName;
                const wAlt = parseInt(matches[6]) || 0;

                let wLat = parseFloat(matches[2]);
                if (matches[3] === 'S') wLat = wLat * -1;

                let wLong = parseFloat(matches[4]);
                if (matches[5] === 'W') wLong = wLong * -1;

                if (wLat !== 0 && wLong !== 0) {
                    arrComp.push({
                        id: idxPoint,
                        shortName: wName,
                        longName: wDesc,
                        altitude: wAlt,
                        latitude: parseFloat(wLat.toFixed(5)),
                        longitude: parseFloat(wLong.toFixed(5)),
                        type: 'S',
                        selected: true
                    });
                    idxPoint++;
                }
            }
        }
    }

    return arrComp;
}

/**
 * Read GPX format using DOMParser
 */
function readGpx(content) {
    const arrGpx = [];

    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const waypoints = xmlDoc.getElementsByTagName("wpt");

        for (let i = 0; i < waypoints.length; i++) {
            const wpt = waypoints[i];
            const lat = parseFloat(wpt.getAttribute("lat"));
            const lon = parseFloat(wpt.getAttribute("lon"));

            const nameEl = wpt.getElementsByTagName("name")[0];
            const eleEl = wpt.getElementsByTagName("ele")[0];
            const descEl = wpt.getElementsByTagName("desc")[0];

            const name = nameEl ? nameEl.textContent : `WPT${i + 1}`;
            const alt = eleEl ? parseInt(eleEl.textContent) : 0;
            const desc = descEl ? descEl.textContent : name;

            arrGpx.push({
                id: i,
                shortName: name.substring(0, 6).toUpperCase(),
                longName: desc || name,
                altitude: alt,
                latitude: lat,
                longitude: lon,
                type: 'S',
                selected: true
            });
        }
    } catch (error) {
        console.error('Error parsing GPX:', error);
    }

    return arrGpx;
}

/**
 * Read KML format using DOMParser
 */
function readKml(content) {
    const arrKml = [];

    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const placemarks = xmlDoc.getElementsByTagName("Placemark");

        let idxPoint = 0;
        for (let i = 0; i < placemarks.length; i++) {
            const placemark = placemarks[i];
            const pointEl = placemark.getElementsByTagName("Point")[0];

            if (pointEl) {
                const coordsEl = pointEl.getElementsByTagName("coordinates")[0];
                if (coordsEl) {
                    const coords = coordsEl.textContent.trim().split(",");
                    if (coords.length >= 2) {
                        const lon = parseFloat(coords[0]);
                        const lat = parseFloat(coords[1]);
                        const alt = coords.length >= 3 ? parseInt(coords[2]) : 0;

                        const nameEl = placemark.getElementsByTagName("name")[0];
                        const name = nameEl ? nameEl.textContent : `WPT${idxPoint + 1}`;

                        arrKml.push({
                            id: idxPoint,
                            shortName: name.substring(0, 6).toUpperCase(),
                            longName: name,
                            altitude: alt,
                            latitude: lat,
                            longitude: lon,
                            type: 'S',
                            selected: true
                        });
                        idxPoint++;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error parsing KML:', error);
    }

    return arrKml;
}

/**
 * Read XCTrack task format
 */
function readXCTrack(content) {
    const arrXCTrack = [];

    try {
        const xctrackData = JSON.parse(content);
        if (!xctrackData.taskType || !xctrackData.turnpoints) {
            return arrXCTrack;
        }

        xctrackData.turnpoints.forEach((turnpoint, index) => {
            arrXCTrack.push({
                id: index,
                shortName: turnpoint.waypoint.name.substring(0, 6).toUpperCase(),
                longName: turnpoint.waypoint.name,
                altitude: turnpoint.waypoint.altSmoothed || 0,
                latitude: turnpoint.waypoint.lat,
                longitude: turnpoint.waypoint.lon,
                type: 'S',
                selected: true
            });
        });
    } catch (error) {
        console.error('Error parsing XCTrack:', error);
    }

    return arrXCTrack;
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
        return data.taskType && data.turnpoints;
    } catch (e) {
        return false;
    }
}

function decodeCupLat(sLat) {
    try {
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
