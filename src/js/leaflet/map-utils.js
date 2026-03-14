import L from 'leaflet'

export function createPopThermal(feature, layer, $gettext) {
    const props = feature.properties
    const htmlTable = `
    <table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">
        <tr style="background-color: #e8f5e9;">
            <td>${$gettext("Altitude gain")}</td><td style="font-weight:bold">${props.alt_gain} m</td>
        </tr>
        <tr style="background-color: #e8f5e9;">
            <td>${$gettext("Average climb")}</td><td style="font-weight:bold">${props.avg_climb} m/s</td>
        </tr>
        <tr><td>${$gettext("Maximum climb")}</td><td>${props.max_climb} m/s</td></tr>
        <tr><td>${$gettext("Peak climb")}</td><td>${props.peak_climb} m/s</td></tr>
        <tr><td>${$gettext("Efficiency")}</td><td>${props.efficiency} %</td></tr>
        <tr><td>${$gettext("Start altitude")}</td><td>${props.start_alt} m</td></tr>
        <tr><td>${$gettext("Finish altitude")}</td><td>${props.finish_alt} m</td></tr>
        <tr><td>${$gettext("Start time")}</td><td>${props.start_time}</td></tr>
        <tr><td>${$gettext("Finish time")}</td><td>${props.finish_time}</td></tr>
        <tr><td>${$gettext("Duration")}</td><td>${props.duration}</td></tr>
        <tr><td>${$gettext("Cumulative gain")}</td><td>${props.acc_gain} m</td></tr>
        <tr><td>${$gettext("Cumulative loss")}</td><td>${props.acc_loss} m</td></tr>
        <tr><td>${$gettext("Drift")}</td><td>${props.drift}</td></tr>
    </table>`
    layer.bindPopup(htmlTable)
}

export function createPopGlide(feature, layer, $gettext) {
    const props = feature.properties
    const htmlTable = `
    <table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">
        <tr style="background-color: #fff3e0;">
            <td>${$gettext("Distance")}</td><td style="font-weight:bold">${props.distance} km</td>
        </tr>
        <tr style="background-color: #fff3e0;">
            <td>${$gettext("Average glide")}</td><td style="font-weight:bold">${props.avg_glide}:1</td>
        </tr>
        <tr style="background-color: #fff3e0;">
            <td>${$gettext("Average speed")}</td><td style="font-weight:bold">${props.avg_speed} km/h</td>
        </tr>
        <tr><td>${$gettext("Altitude change")}</td><td>${props.alt_change} m</td></tr>
        <tr><td>${$gettext("Average descent")}</td><td>${props.avg_descent} m/s</td></tr>
        <tr><td>${$gettext("Start altitude")}</td><td>${props.start_alt} m</td></tr>
        <tr><td>${$gettext("Finish altitude")}</td><td>${props.finish_alt} m</td></tr>
        <tr><td>${$gettext("Start time")}</td><td>${props.start_time}</td></tr>
        <tr><td>${$gettext("Finish time")}</td><td>${props.finish_time}</td></tr>
        <tr><td>${$gettext("Duration")}</td><td>${props.duration}</td></tr>
        <tr><td>${$gettext("Cumulative gain")}</td><td>${props.acc_gain} m</td></tr>
        <tr><td>${$gettext("Cumulative loss")}</td><td>${props.acc_loss} m</td></tr>
    </table>`
    layer.bindPopup(htmlTable)
}


export const thermalIcon = L.divIcon({
    html: '<i class="mdi mdi-cloud-check-variant" style="font-size: 24px; color: rgba(255, 255 , 255, 1); text-shadow: 1px 1px 2px black;"></i>',
    className: 'thermal-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
})

export const bestThermalIcon = L.divIcon({
    html: `<div style="position:relative; width:32px; height:32px;">
        <i class="mdi mdi-cloud-check-variant" style="font-size: 32px; color: #43a047; text-shadow: 1px 1px 3px black;"></i>
        <i class="mdi mdi-star" style="position:absolute; top:-4px; right:-4px; font-size: 14px; color: gold; text-shadow: 0 0 2px black;"></i>
    </div>`,
    className: 'best-thermal-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
})

export const glideIcon = L.divIcon({
    html: '<i class="mdi mdi-chevron-down-box" style="font-size: 24px; color: #848484; text-shadow: 1px 1px 2px white;"></i>',
    className: 'glide-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
})

export const bestGlideIcon = L.divIcon({
    html: `<div style="position:relative; width:32px; height:32px;">
        <i class="mdi mdi-chevron-down-box" style="font-size: 32px; color: #fb8c00; text-shadow: 1px 1px 3px white;"></i>
        <i class="mdi mdi-star" style="position:absolute; top:-4px; right:-4px; font-size: 14px; color: gold; text-shadow: 0 0 2px black;"></i>
    </div>`,
    className: 'best-glide-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
})

export const startIcon = L.divIcon({
    html: '<i class="mdi mdi-flag" style="font-size: 24px; color: #2e7d32; text-shadow: 1px 1px 2px white;"></i>',
    className: 'start-icon',
    iconSize: [24, 24],
    iconAnchor: [2, 22],
    popupAnchor: [10, -22]
})


export const endIcon = L.divIcon({
    html: '<i class="mdi mdi-flag-checkered" style="font-size: 24px; color: #c62828; text-shadow: 1px 1px 2px white;"></i>',
    className: 'end-icon',
    iconSize: [24, 24],
    iconAnchor: [2, 22],
    popupAnchor: [10, -22]
})

export function getLeagueColor(selLeague) {
    let selColor
    // 33 at the end for transparency if needed, though we might control opacity in Leaflet style
    switch (selLeague) {
        case 'FFVL':
            selColor = { namedColor: 'yellow', hexaColor: '#FFFF0033' };
            break;
        case 'XContest':
            selColor = { namedColor: 'fuchsia', hexaColor: '#FF00FF33' };
            break;
        case 'FAI':
            selColor = { namedColor: 'darkorange', hexaColor: '#FF8C0033' };
            break;
        case 'FAI-Cylinders':
            selColor = { namedColor: 'skyblue', hexaColor: '#87CEEB33' };
            break;
        case 'FAI-OAR':
            selColor = { namedColor: 'yellowgreen', hexaColor: '#9BCD9B33' };
            break;
        case 'FAI-OAR2':
            selColor = { namedColor: 'sienna', hexaColor: '#A0522D33' };
            break;
        case 'XCLeague':
            selColor = { namedColor: 'lawngreen', hexaColor: '#7CFC0033' };
            break;
        default:
            selColor = { namedColor: 'yellow', hexaColor: '#FFFF0033' };
            break;
    }
    return selColor
}
