export async function callPgearthAPI(pgurl) {
    let result = { success: false };
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
        const response = await fetch(pgurl, { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) throw new Error('Erreur API : ' + response.status);        
        const json = await response.json();
        if (
            json &&
            json.features &&
            Array.isArray(json.features) &&
            json.features.length > 0
        ) {
            const feature = json.features[0];
            const props = feature.properties || {};
            const coords = feature.geometry?.coordinates || [];

            if (props.place === "paragliding takeoff") {
                result = {
                    success: true,
                    name: props.name,
                    place: props.place,
                    distance: props.distance,
                    countryCode: props.countryCode,
                    takeoff_altitude: props.takeoff_altitude,
                    takeoff_description: props.takeoff_description,
                    coordinates: coords
                };
            } else {
                result = {
                    success: false,
                    message: 'With api:pgearth site found is not a take-off'
                };
            }
        } else {
            result = {
                success: false,
                message: 'With api:pgearth No site found in the json response'
            };
        }
    } catch (error) {
        log.error('Api:pgearth fetch error :', error);
        result = {
            success: false,
            message: error.message
        };
    }
    return result;
}