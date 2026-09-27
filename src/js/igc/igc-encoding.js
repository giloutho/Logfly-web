export function encodeIGC(fixes, originalHeaders = {}) {
    // Basic H records
    // XLF = LogFly is the assigned identifier by FAI
    let igc = "AXLF\n";
    const dateStr = originalHeaders.date ? originalHeaders.date.split('-').map((v, i) => i === 2 ? v.slice(-2) : v).join('') : '010100'; // DDMMYY
    igc += `HFDTE${dateStr}\n`;
    if (originalHeaders.pilotName) igc += `HFPLTPILOTINCHARGE:${originalHeaders.pilotName}\n`;
    if (originalHeaders.gliderType) igc += `HFGTYGLIDERTYPE:${originalHeaders.gliderType}\n`;
    if (originalHeaders.gliderId) igc += `HFGIDGLIDERID:${originalHeaders.gliderId}\n`;

    // B records
    for (const fix of fixes) {
        // Time HHMMSS
        const time = fix.time ? fix.time.replace(/:/g, '') : '000000';

        // Lat DDMMmmmN/S
        const lat = Math.abs(fix.latitude);
        let latDeg = Math.floor(lat);
        let latMin = (lat - latDeg) * 60;
        let latMinInt = Math.floor(latMin);
        let latMinDec = Math.round((latMin - latMinInt) * 1000);
        if (latMinDec >= 1000) {
            latMinInt += 1;
            latMinDec -= 1000;
        }
        if (latMinInt >= 60) {
            latDeg += 1;
            latMinInt -= 60;
        }
        const latStr = String(latDeg).padStart(2, '0') + String(latMinInt).padStart(2, '0') + String(latMinDec).padStart(3, '0') + (fix.latitude >= 0 ? 'N' : 'S');

        // Lon DDDMMmmmE/W
        const lon = Math.abs(fix.longitude);
        let lonDeg = Math.floor(lon);
        let lonMin = (lon - lonDeg) * 60;
        let lonMinInt = Math.floor(lonMin);
        let lonMinDec = Math.round((lonMin - lonMinInt) * 1000);
        if (lonMinDec >= 1000) {
            lonMinInt += 1;
            lonMinDec -= 1000;
        }
        if (lonMinInt >= 60) {
            lonDeg += 1;
            lonMinInt -= 60;
        }
        const lonStr = String(lonDeg).padStart(3, '0') + String(lonMinInt).padStart(2, '0') + String(lonMinDec).padStart(3, '0') + (fix.longitude >= 0 ? 'E' : 'W');

        // Alt A PPPPP
        const pressAlt = 'A00000'; // Pressure altitude often 0 or not available in fixes depending on source, using 00000 or GPS alt if pressure not available? 
        // Standard IGC B record: B HHMMSS DDMMmmmN DDDMMmmmE A PPPPP GGGGG
        // A = validity (A or V)
        // PPPPP = Pressure Altitude
        // GGGGG = GNSS Altitude

        const valid = 'A'; // Assuming valid if we are encoding it from valid fixes
        const pressAltVal = fix.pressureAltitude || 0;
        const gpsAltVal = fix.gpsAltitude || fix.altitude || 0;

        const pressAltStr = String(Math.max(0, Math.round(pressAltVal))).padStart(5, '0');
        const gpsAltStr = String(Math.max(0, Math.round(gpsAltVal))).padStart(5, '0');

        igc += `B${time}${latStr}${lonStr}${valid}${pressAltStr}${gpsAltStr}\n`;
    }

    return igc;
}
