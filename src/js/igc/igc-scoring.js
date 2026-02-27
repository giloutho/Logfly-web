const miniIgcPoints = 5

// Cache pour éviter les réimports multiples
let scoringModule = null;

async function getScoringModule() {
    if (!scoringModule) {
        scoringModule = await import('igc-xc-score');
    }
    return scoringModule;
}

export async function igcScoring(argsScoring) {
    // Import dynamique pour éviter les effets de bord au chargement du module
    const { scoringRules, solver } = await getScoringModule();
    /*
    * argsScoring contiendra 
    * const date = issue de IGCparser 
    * const fixes = array fixes issu de IGCparser
    * const league = argsScoring.league
    */
    // Date must be in format 'YYYY-MM-DD'
    const args = {
        date: argsScoring.date,
        fixes: argsScoring.fixes,
        league: argsScoring.league
    }
    const dateStr = argsScoring.date;
    if (!dateStr) {
        console.warn('Date de vol non disponible pour le calcul du score XC');
        return;
    }
    const [day, month, year] = dateStr.split('/');
    const flightDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    try {
        const scoringResult = await scoring({
            date: flightDate,
            fixes: args.fixes,
            league: args.league
        })
        if (!scoringResult.success) {
            console.log('igc:scoring failed : ', scoringResult.message);
            return { success: false, message: scoringResult.message };
        }
        return { success: true, geojson: scoringResult.geojson };
    } catch (error) {
        console.log('Error in iigcScoring:', error);
        return { success: false, message: error.message };
    }

}

async function scoring(argsScoring) {
    // Import dynamique pour éviter les effets de bord au chargement du module
    const { scoringRules, solver } = await getScoringModule();
    const { date, fixes, league } = argsScoring;

    let scoringGeoJSON = {}
    try {
        const flight = {
            date: date,
            fixes: fixes
        }
        const rule = scoringRules[league]
        // console.log('[igc-scoring.js] Scoring flight for date :', flight.date, 'with league :', league, 'with ',flight.fixes.length,' fixes')
        // noflight true pour ne pas générer la trace du vol dans le geojson
        const result = solver(flight, rule, { noflight: true }).next().value;
        if (result.optimal) {
            const geojson = result.geojson()
            const data = JSON.parse(JSON.stringify(geojson))
            const arrData = Object.values(data)
            if (arrData.length == 3) {
                scoringGeoJSON.type = "FeatureCollection"
                scoringGeoJSON.name = "EPSG:3857"
                scoringGeoJSON.league = league
                scoringGeoJSON.score = arrData[1].score
                scoringGeoJSON.bound = arrData[1].bound
                scoringGeoJSON.course = result.opt.scoring.name   // Triangle FAI ou Distance libre etc...
                console.log(result.opt.scoring.name)
                scoringGeoJSON.code = arrData[1].code
                scoringGeoJSON.distance = result.scoreInfo.distance
                scoringGeoJSON.multiplier = result.opt.scoring.multiplier
                scoringGeoJSON.legs = result.scoreInfo.legs
                // All that's left to do is go through all the legs
                scoringGeoJSON.features = []
                for (let i = 0; i < arrData[2].length; i++) {
                    const element = arrData[2][i]
                    const elemType = element.geometry.type
                    const elemId = element.properties.id
                    let elemSelected = true
                    if (elemId.includes('launch')) elemSelected = false
                    if (elemId.includes('land')) elemSelected = false
                    let feature = {}
                    let properties = {}
                    let geometry = {}
                    let coord = []
                    switch (elemType) {
                        case "Point":
                            if (elemSelected) {
                                properties.id = element.properties.id
                                properties.r = element.properties.r
                                properties.timestamp = element.properties.timestamp
                                // version locale
                                //const date = new Date(element.properties.timestamp);
                                //const hElement = date.toLocaleTimeString('fr-FR', { hour12: false });
                                const date = new Date(element.properties.timestamp);
                                const hElement = date.toISOString().slice(11, 19); // "HH:mm:ss"
                                properties.popupContent = String(element.properties.id).toUpperCase() + '</br>' + hElement
                                geometry.type = element.geometry.type
                                geometry.coordinates = [element.geometry.coordinates[0], element.geometry.coordinates[1]]
                                feature.type = "Feature"
                                feature.id = element.id
                                feature.properties = properties
                                feature.geometry = geometry
                                scoringGeoJSON.features.push(feature)
                            }
                            break;
                        case "LineString":
                            properties.id = element.properties.id
                            properties.d = element.properties.d
                            const dist = (Math.round(element.properties.d * 100) / 100).toFixed(2);
                            properties.popupContent = dist + ' km'
                            geometry.type = element.geometry.type
                            coord.push(element.geometry.coordinates[0])
                            coord.push(element.geometry.coordinates[1])
                            geometry.coordinates = coord
                            feature.type = "Feature"
                            feature.id = element.id
                            feature.properties = properties
                            feature.geometry = geometry
                            scoringGeoJSON.features.push(feature)
                            break;
                    }
                }
                return { success: true, geojson: scoringGeoJSON };
            }
        } else {
            return { success: false, message: 'No optimal solution found for the IGC file' };
        }
    } catch (error) {
        return { success: false, message: '[igc-scoring.js] Error while scoring the IGC file' };
    }
}