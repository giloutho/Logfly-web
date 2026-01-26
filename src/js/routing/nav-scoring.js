/**
 * nav-scoring.js
 * 
 * Module for scoring drawn routes using igc-xc-score library.
 * Creates a "virtual IGC flight" from route points to calculate scores.
 * 
 * Adapted from logfly609/src/utils/nav-scoring.js for web environment.
 */

const MINI_IGC_POINTS = 5;

// Cache for the scoring module
let scoringModule = null;

/**
 * Get the scoring module (lazy loading)
 */
async function getScoringModule() {
    if (!scoringModule) {
        scoringModule = await import('igc-xc-score');
    }
    return scoringModule;
}

/**
 * Calculate scoring for a drawn route
 * 
 * @param {Object} args - Scoring arguments
 * @param {Array} args.route - Array of route points [{lat, lng}, ...]
 * @param {number} args.speed - Average speed in km/h (default: 20)
 * @param {string} args.league - Scoring league ('FFVL', 'XContest', 'FAI/OLC', 'XCLeague')
 * @returns {Object} Scoring result with geojson for visualization
 */
export async function navScoring(args) {
    const { route, speed = 20, league = 'XContest' } = args;

    if (!route || route.length < 2) {
        return {
            success: false,
            message: 'Route must have at least 2 points'
        };
    }

    try {
        const result = await calculateRouteScore(route, speed, league);
        return result;
    } catch (error) {
        console.error('[nav-scoring.js] Error:', error);
        return {
            success: false,
            message: error.message || 'Scoring calculation failed'
        };
    }
}

/**
 * Calculate the score for a route
 */
async function calculateRouteScore(route, speed, league) {
    const { scoringRules, solver } = await getScoringModule();

    // Check if league exists
    const rule = scoringRules[league];
    if (!rule) {
        return {
            success: false,
            message: `Unknown league: ${league}`
        };
    }

    // Create virtual flight from route points
    const flight = createVirtualFlight(route, speed);

    try {
        // Run the solver
        const result = solver(flight, rule, { noflight: true }).next().value;

        if (!result.optimal) {
            return {
                success: false,
                message: 'No optimal solution found'
            };
        }

        // Process the result
        const scoringResult = processResult(result, league);
        return {
            success: true,
            ...scoringResult
        };
    } catch (error) {
        console.error('[nav-scoring.js] Solver error:', error);
        return {
            success: false,
            message: 'Scoring calculation error'
        };
    }
}

/**
 * Create a virtual IGC flight from route points
 * 
 * @param {Array} route - Array of route points [{lat, lng}, ...]
 * @param {number} speed - Average speed in km/h
 * @returns {Object} Virtual flight object compatible with igc-xc-score
 */
function createVirtualFlight(route, speed) {
    const todayDate = new Date().toISOString().split('T')[0];
    let currentTimestamp = Date.now();

    const fixes = [];

    // First point
    fixes.push(createFixPoint(currentTimestamp, route[0].lat, route[0].lng));

    // Subsequent points
    for (let i = 1; i < route.length; i++) {
        const point1 = route[i - 1];
        const point2 = route[i];

        // Calculate distance between points
        const dist = calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);

        // Calculate time to travel this segment
        const travelTimeMs = calculateTravelTime(dist, speed);
        currentTimestamp += travelTimeMs;

        fixes.push(createFixPoint(currentTimestamp, point2.lat, point2.lng));
    }

    // Ensure minimum number of points for scoring
    while (fixes.length < MINI_IGC_POINTS) {
        const lastFix = fixes[fixes.length - 1];
        fixes.push({
            ...lastFix,
            timestamp: lastFix.timestamp + 60000, // Add 1 minute
            latitude: lastFix.latitude + 0.000001
        });
    }

    return {
        date: todayDate,
        fixes: fixes
    };
}

/**
 * Create a fix point for the virtual IGC
 */
function createFixPoint(timestamp, lat, lng) {
    const time = new Date(timestamp).toISOString().split('T')[1].split('.')[0];

    return {
        timestamp: timestamp,
        time: time,
        latitude: Number(parseFloat(lat).toFixed(6)),  // Must be numeric, not string
        longitude: Number(parseFloat(lng).toFixed(6)), // Must be numeric, not string
        valid: true,
        pressureAltitude: null,
        gpsAltitude: 500, // Arbitrary altitude
        extensions: {},
        fixAccuracy: null,
        enl: null
    };
}

/**
 * Calculate travel time between two points
 * 
 * @param {number} distance - Distance in km
 * @param {number} speed - Speed in km/h
 * @returns {number} Travel time in milliseconds
 */
function calculateTravelTime(distance, speed) {
    const timeInHours = distance / speed;
    const timeInMs = timeInHours * 3600000; // Convert hours to milliseconds
    return Math.round(timeInMs);
}

/**
 * Calculate distance between two points using Haversine formula
 * 
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Process the scoring result into a structured format with GeoJSON
 * 
 * @param {Object} result - Raw result from igc-xc-score solver
 * @param {string} league - Scoring league
 * @returns {Object} Processed scoring result
 */
function processResult(result, league) {
    const geojsonRaw = result.geojson();
    const data = JSON.parse(JSON.stringify(geojsonRaw));
    const arrData = Object.values(data);

    // Build GeoJSON for map display
    const scoringGeoJSON = {
        type: "FeatureCollection",
        name: "EPSG:3857",
        league: league,
        score: arrData[1]?.score || 0,
        bound: arrData[1]?.bound || 0,
        course: result.opt.scoring.name,
        code: arrData[1]?.code || '',
        distance: result.scoreInfo?.distance || 0,
        multiplier: result.opt.scoring.multiplier,
        legs: result.scoreInfo?.legs || [],
        features: []
    };

    // Process features (points and lines)
    if (arrData[2] && Array.isArray(arrData[2])) {
        for (const element of arrData[2]) {
            const feature = processFeature(element);
            if (feature) {
                scoringGeoJSON.features.push(feature);
            }
        }
    }

    return {
        type: result.opt.scoring.name,
        code: result.opt.scoring.code,
        multiplier: result.opt.scoring.multiplier,
        distance: result.scoreInfo?.distance || 0,
        score: result.scoreInfo?.score || (result.scoreInfo?.distance * result.opt.scoring.multiplier) || 0,
        geojson: scoringGeoJSON
    };
}

/**
 * Process a single GeoJSON feature from the scoring result
 */
function processFeature(element) {
    if (!element || !element.geometry) return null;

    const elemType = element.geometry.type;
    const elemId = element.properties?.id || '';

    // Skip launch and land points
    if (elemId.includes('launch') || elemId.includes('land')) {
        return null;
    }

    const feature = {
        type: "Feature",
        id: element.id,
        properties: {},
        geometry: {}
    };

    switch (elemType) {
        case "Point":
            feature.properties = {
                id: elemId,
                r: element.properties.r,
                timestamp: element.properties.timestamp
            };

            // Format popup content
            if (element.properties.timestamp) {
                const date = new Date(element.properties.timestamp);
                const timeStr = date.toISOString().slice(11, 19);
                feature.properties.popupContent = `${String(elemId).toUpperCase()}<br/>${timeStr}`;
            } else {
                feature.properties.popupContent = String(elemId).toUpperCase();
            }

            feature.geometry = {
                type: "Point",
                coordinates: [element.geometry.coordinates[0], element.geometry.coordinates[1]]
            };
            break;

        case "LineString":
            const dist = element.properties.d ? (Math.round(element.properties.d * 100) / 100).toFixed(2) : '0.00';
            feature.properties = {
                id: elemId,
                d: element.properties.d,
                popupContent: `${dist} km`
            };
            feature.geometry = {
                type: "LineString",
                coordinates: element.geometry.coordinates
            };
            break;

        case "Polygon":
            // FAI sectors are polygons
            feature.properties = {
                id: elemId,
                ...element.properties
            };
            feature.geometry = {
                type: "Polygon",
                coordinates: element.geometry.coordinates
            };
            break;

        default:
            return null;
    }

    return feature;
}

/**
 * Get available leagues
 */
export function getAvailableLeagues() {
    return [
        { value: 'FFVL', title: 'FFVL (France)' },
        { value: 'XContest', title: 'XContest' },
        { value: 'FAI/OLC', title: 'FAI/OLC' },
        { value: 'XCLeague', title: 'XCLeague (UK)' }
    ];
}

/**
 * Get scoring type translations
 */
export function getScoringTypeLabel(type, gettext) {
    const types = {
        'Open distance': gettext('Open distance'),
        'Free distance': gettext('Open distance'),
        'free distance': gettext('Open distance'),
        'Out-and-return': gettext('Out-and-return'),
        'out-and-return': gettext('Out-and-return'),
        'Flat triangle': gettext('Flat triangle'),
        'flat triangle': gettext('Flat triangle'),
        'FAI triangle': gettext('FAI triangle'),
        'fai triangle': gettext('FAI triangle'),
        'Free triangle': gettext('Free triangle'),
        'free triangle': gettext('Free triangle')
    };
    return types[type] || type;
}
