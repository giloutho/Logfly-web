import center from '@turf/center'
import * as turfHelper from '@turf/helpers'
import booleanIntersects from '@turf/boolean-intersects'
import pointsWithinPolygon from '@turf/points-within-polygon'

const METER_PER_FEET = 0.3048

// Helper enums
const Unit = {
    Meter: 0,
    Feet: 1,
    FlightLevel: 6
}

const Datum = {
    Gnd: 0,
    Msl: 1,
    Std: 2
}

/**
 * Downloads airspaces from OpenAIP API
 * @param {Object} filterValues { classes: [], radius: number, floor: number }
 * @param {Object} feature GeoJSON feature from track (bbox)
 */
export async function downloadAirspaces(filterValues, feature) {
    // API KEY: Using environment variable (provided in .env)
    const apiKey = import.meta.env.VITE_OPENAIP_API_KEY;
    if (!apiKey) {
        console.error('VITE_OPENAIP_API_KEY is missing in .env')
        return { success: false, message: 'OpenAIP API Key is missing. Check configuration.' }
    }
    let openAip_Url
    const airspaces = []
    let delayMs = 10
    let page = 1
    let totalPages = 1

    // Convert class array [0,1,2...] to string "0,1,2"
    const icaoFilter = filterValues.classes.join(',')

    if (filterValues.radius == 0) {
        const bbox = feature.properties.bbox
        openAip_Url = `https://api.core.openaip.net/api/airspaces?page=${page}&limit=1000&bbox=${bbox}&icaoClass=${icaoFilter}&apiKey=${apiKey}`
    } else {
        const geoCenter = center(feature)
        const c = geoCenter.geometry.coordinates; // [lon, lat]
        const centerStr = c[1] + ',' + c[0] // lat,lon required by OpenAIP? "pos=lat,lon" usually?
        // Reference says: const center = geoCenter.geometry.coordinates[1]+','+geoCenter.geometry.coordinates[0]

        const distance = filterValues.radius / 1000 // Radius coming in meters, API expects what?
        // Reference: openAIP API docs say dist in km? 
        // In logfly65: const distance = filterValues.radius
        // In FullmapTrack.onDisplayOpenAipClicked: radius : radioValues[1]*1000. So it passes meters.
        // openaip-aip.js line 70: `dist=${distance}`
        // OpenAIP API documentation says dist is in meters if not specified? Or km?
        // Let's assume the reference was working. If FullmapTrack passed meters (e.g. 50000), then `distance` is 50000.
        // CHECK: `filterValues.radius` passed to `downloadAirspaces` seems to be in meters in reference.

        openAip_Url = `https://api.core.openaip.net/api/airspaces?page=${page}&limit=1000&pos=${centerStr}&dist=${filterValues.radius}&icaoClass=${icaoFilter}&apiKey=${apiKey}`
    }

    try {
        while (page <= totalPages) {
            // Need to update URL with current page
            const currentUrl = openAip_Url.replace(`page=1`, `page=${page}`); // Simple replace if page=1 is initial
            // Better to construct URL in loop or use URL object

            const response = await fetch(currentUrl);
            await new Promise((resolve) => setTimeout(resolve, delayMs));

            if (response.ok) {
                const info = await response.json();
                totalPages = info.totalPages;
                airspaces.push(...info.items);
                page++;
                delayMs = 10;
            } else {
                delayMs *= 2;
                console.error(`HTTP status ${response.status}`);
                if (delayMs > 2000) break; // Safety break
            }
        }
        return { success: true, airspaces };
    } catch (e) {
        return { success: false, message: 'Error when downloading openAIP airspaces ' + e.message };
    }
}

/**
 * Downloads airspaces from OpenAIP API using map center point
 * Used for route planning when no track is available
 * @param {Object} filterValues { classes: [], radius: number (meters), floor: number }
 * @param {Object} mapCenter { lat: number, lng: number }
 */
export async function downloadAirspacesByCenter(filterValues, mapCenter) {
    const apiKey = import.meta.env.VITE_OPENAIP_API_KEY;
    if (!apiKey) {
        console.error('VITE_OPENAIP_API_KEY is missing in .env')
        return { success: false, message: 'OpenAIP API Key is missing. Check configuration.' }
    }

    const airspaces = []
    let delayMs = 10
    let page = 1
    let totalPages = 1

    // Convert class array [0,1,2...] to string "0,1,2"
    const icaoFilter = filterValues.classes.join(',')

    // Build center string "lat,lon" as required by OpenAIP API
    const centerStr = mapCenter.lat + ',' + mapCenter.lng

    // Build base URL with center and radius
    const baseUrl = `https://api.core.openaip.net/api/airspaces?limit=1000&pos=${centerStr}&dist=${filterValues.radius}&icaoClass=${icaoFilter}&apiKey=${apiKey}`

    try {
        while (page <= totalPages) {
            const currentUrl = `${baseUrl}&page=${page}`

            const response = await fetch(currentUrl);
            await new Promise((resolve) => setTimeout(resolve, delayMs));

            if (response.ok) {
                const info = await response.json();
                totalPages = info.totalPages;
                airspaces.push(...info.items);
                page++;
                delayMs = 10;
            } else {
                delayMs *= 2;
                console.error(`HTTP status ${response.status}`);
                if (delayMs > 2000) break; // Safety break
            }
        }
        return { success: true, airspaces };
    } catch (e) {
        return { success: false, message: 'Error when downloading openAIP airspaces: ' + e.message };
    }
}

/**
 * Process decoding and filtering of airspaces
 * @param {Array} openAipArray Raw items from API
 * @param {boolean} filter enable filtering
 * @param {Object} filterValues filters { types: [], floor: number }
 */
export async function processDecoding(openAipArray, filter, filterValues) {
    try {
        const promiseArray = []
        for (const item of openAipArray) {
            promiseArray.push(processItem(item))
        }
        const result = await Promise.all(promiseArray)

        let finalResult
        if (filter) {
            // filterValues.types is array of strings e.g. ['3','1']? 
            // In reference: filterAip takes item and arrTypes.
            finalResult = result.filter((item) => filterAip(item, filterValues.types))
        } else {
            finalResult = [...result]
        }

        let totalGeoJson = []
        for (let i = 0; i < finalResult.length; i++) {
            const el = finalResult[i]
            // filterValues.floor is in meters? 
            // Reference: el.floorM < filterValues.floor.
            if (el.floorM < filterValues.floor) {
                let arrCoord = []
                arrCoord.push(el.polygon)

                let AltLimitTopAGL
                if (el.floorRefGnd == 'Gnd' && el.topRefGnd == 'Gnd') {
                    AltLimitTopAGL = true
                } else {
                    AltLimitTopAGL = false
                }

                let aipGeojson = {
                    type: "Feature",
                    properties: {
                        type: el.type,
                        Class: el.icaoClass,
                        Name: el.name,
                        id: el.id,
                        Comment: "",
                        Floor: el.floorM,
                        FloorLabel: el.floorLabel + ' ' + el.floorRefGnd,
                        Ceiling: el.topM,
                        CeilingLabel: el.topLabel + ' ' + el.topRefGnd,
                        AltLimit_Top_AGL: AltLimitTopAGL,
                        AltLimit_Bottom_AGL: false,
                        Color: getColor(el)
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: arrCoord
                    }
                }
                totalGeoJson.push(aipGeojson)
            }
        }
        return { success: true, geojson: totalGeoJson };
    } catch (e) {
        return { success: false, message: 'Error during airspaces decoding: ' + e.message };
    }
}

function processItem(item) {
    return new Promise((resolve) => {
        let myair = {
            name: item.name,
            id: item._id,
            country: item.country,
            typeRef: item.type,
            type: toType(item.type),
            icaoClass: toClass(item.icaoClass),
            activity: item.activity,
            floorM: Math.round(toMeter(item.lowerLimit)),
            floorLabel: getLabel(item.lowerLimit),
            floorRefGnd: toDatum(item.lowerLimit.referenceDatum),
            topM: Math.round(toMeter(item.upperLimit)),
            topLabel: getLabel(item.upperLimit),
            topRefGnd: toDatum(item.upperLimit.referenceDatum),
            polygon: roundCoords(item.geometry.coordinates[0])
        }
        resolve(myair)
    })
}

function filterAip(item, arrTypes) {
    let keptItem = false
    // arrTypes expected to be array of strings of integers: ['1', '3', '21'] etc.
    // The Input in Dialog sends ['Prohibited', 'Restricted']?
    // We need to map string types to IDs in the Dialog component OR handle names here.
    // Reference uses IDs. 'arrTypes.includes(item.typeRef.toString())'
    // So 'item.typeRef' is integer. 'arrTypes' is string array of ints.

    // switch (item.icaoClass) ... same logic
    // I will copy the exact logic from reference
    switch (item.icaoClass) {
        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
            keptItem = true
            break
        case 'SUA':
            // Logic for SUA types
            const t = item.typeRef.toString()
            switch (item.typeRef) {
                case 0: // Other
                case 1: // Restricted
                case 2: // Danger
                case 3: // Prohibited
                case 4: // CTR
                case 5: // TMZ
                case 6: // RMZ
                case 7: // TMA
                case 21: // Gliding
                    arrTypes.includes(t) ? keptItem = true : keptItem = false
                    break
                case 10: // FIR
                case 11: // UIR
                case 28: // RecreationalActivity
                case 33: // FISSector
                    keptItem = false
                    break
                case 19: // ProtectedArea
                case 26: // CTA
                case 29: // LowAltitudeOverflightRestriction
                    keptItem = true // Always keep
                    break
                default:
                    keptItem = true
            }
            break
        default:
            keptItem = false
            break
    }
    return keptItem
}

function roundCoords(coords) {
    const numDigits = 6
    const multiplier = 10 ** numDigits
    return coords.map(([lon, lat]) => [Math.round(lon * multiplier) / multiplier, Math.round(lat * multiplier) / multiplier])
}

// ... Helper functions (toClass, toType, toMeter, getLabel, toDatum, getColor - same as reference) 

function toClass(key) {
    const classes = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    if (key >= 0 && key <= 6) return classes[key]
    if (key === 8) return 'SUA'
    return ''
}

function toType(key) {
    const types = {
        0: 'Other', 1: 'Restricted', 2: 'Danger', 3: 'Prohibited', 4: 'CTR', 5: 'TMZ',
        6: 'RMZ', 7: 'TMA', 8: 'TRA', 9: 'TSA', 10: 'FIR', 11: 'UIR', 12: 'ADIZ',
        13: 'ATZ', 14: 'MATZ', 15: 'Airway', 16: 'MTR', 17: 'AlertArea',
        18: 'WarningArea', 19: 'ProtectedArea', 20: 'HTZ', 21: 'GlidingSector',
        22: 'TRP', 23: 'TIZ', 24: 'TIA', 25: 'MTA', 26: 'CTA', 27: 'ACC',
        28: 'RecreationalActivity', 29: 'LowAltitudeOverflightRestriction',
        30: 'MRT', 31: 'TFR', 32: 'VFRSector', 33: 'FISSector'
    }
    return types[key] || ''
}

function toMeter(limit) {
    switch (limit.unit) {
        case Unit.Meter: return limit.value
        case Unit.FlightLevel: return 100 * METER_PER_FEET * limit.value
        case Unit.Feet: return METER_PER_FEET * limit.value
        default: throw new Error(`Invalid unit (${limit.unit})`)
    }
}

function getLabel(limit) {
    if (limit.referenceDatum == Datum.Gnd && limit.value == 0) return 'GND'
    let label = String(Math.round(limit.value))
    switch (limit.unit) {
        case Unit.Meter: label += 'm'; break
        case Unit.Feet: label += 'ft'; break
        case Unit.FlightLevel: return `FL ${Math.round(limit.value)}`
        default: throw new Error(`Invalid unit (${limit.unit})`)
    }
    switch (limit.referenceDatum) {
        case Datum.Gnd: label += ' GND'; break
        case Datum.Msl: label += ' MSL'; break
        case Datum.Std: label += ' STD'; break
        default: throw new Error(`Invalid datum (${limit.referenceDatum})`)
    }
    return label
}

function toDatum(referenceDatum) {
    switch (referenceDatum) {
        case Datum.Gnd: return 'Gnd'
        case Datum.Msl: return 'Msl'
        case Datum.Std: return 'Std'
        default: return ''
    }
}

function getColor(item) {
    const colProhibited = '#bf4040'
    const colRestricted = '#bfbf40'
    const colDanger = '#bf8040'
    const colOther = '#808080'

    if (['A', 'B', 'C', 'D'].includes(item.icaoClass)) return colProhibited
    if (['E', 'F', 'G'].includes(item.icaoClass)) return colRestricted

    switch (item.type) {
        case 'CTR': case 'TMA': case 'ATZ': case 'CTA': case 'Prohibited': return colProhibited
        case 'RMZ': case 'TMZ': case 'GlidingSector': case 'Restricted': case 'LowAltitudeOverflightRestriction': return colRestricted
        case 'Danger': return colDanger
        default: return colOther
    }
}
/**
 * Checks for airspace violations
 * @param {Object} track The decoded track object (must contain fixes and stat.maxalt)
 * @param {Array} aipGeojson Array of GeoJSON features for airspaces
 * @param {Array} ground Array of ground altitudes corresponding to track points
 */
export async function checkTrack(track, aipGeojson, ground) {
    try {
        let checkResult = {
            airGeoJson: [],
            insidePoints: []
        }

        if (!track || !track.fixes || !ground) {
            return { success: false, message: 'Invalid track or ground data' }
        }

        // In order to use turfWithin below, the fixes array must be converted in a "turf multipoint object"
        let trackPoints = track.fixes.map(point => [point.longitude, point.latitude])

        // Create MultiPoint for turf using imported helper
        let multiPt = turfHelper.multiPoint(trackPoints)

        // track.GeoJSON is needed for intersection check. 
        // We assume track has GeoJSON property or we construct it?
        // In logfly65 it uses track.GeoJSON. 
        // In logfly-web, flightData.decodedIgc.GeoJSON exists. passed as track.
        let geoTrack = track.GeoJSON
        let turfNb = 0
        let nbInside = 0

        for (let index = 0; index < aipGeojson.length; index++) {
            const element = aipGeojson[index]
            // check intersection with the whole track line first
            if (booleanIntersects(element, geoTrack)) {
                let pushGeoJson = false
                let ptsWithin = pointsWithinPolygon(multiPt, element)
                for (let i = 0; i < ptsWithin.features.length; i++) {
                    const feature = ptsWithin.features[i]
                    for (let j = 0; j < feature.geometry.coordinates.length; j++) {
                        turfNb++
                        const vPoint = feature.geometry.coordinates[j]
                        let idxPoint = trackPoints.findIndex(e => e === vPoint)
                        let floorLimit = element.properties.Floor
                        let ceilingLimit = element.properties.Ceiling
                        if (element.properties.AltLimit_Bottom_AGL === true) floorLimit += ground[idxPoint]
                        if (element.properties.AltLimit_Top_AGL === true) ceilingLimit += ground[idxPoint]
                        if (track.fixes[idxPoint].gpsAltitude > floorLimit && track.fixes[idxPoint].gpsAltitude < ceilingLimit) {
                            nbInside++
                            if (!pushGeoJson) {
                                checkResult.airGeoJson.push(element)
                                pushGeoJson = true
                            }
                            checkResult.insidePoints.push(idxPoint)
                        }
                    }
                }
            }
        }
        if (checkResult.insidePoints.length === 0) {
            for (let index = 0; index < aipGeojson.length; index++) {
                checkResult.airGeoJson.push(aipGeojson[index])
            }
        }

        return { success: true, ...checkResult }

    } catch (e) {
        return { success: false, message: 'Error during airspaces check: ' + e.message }
    }
}
