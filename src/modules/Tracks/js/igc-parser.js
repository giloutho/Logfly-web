/**
 * Parser for IGC file basic information extraction
 * If IGCParser is used, the parsing time is doubled.
 */
import {computeOffsetUTC} from '@/js/geo/offset-utc.js'

/**
 * Parse an IGC file and extract the main information
 * @param {string} content - Content of the IGC file
 * @param {string} fileName - Name of the file
 * @returns {Object} Object containing flight information
 */
export function parseIGC(content, fileName) {

  const lines = content.split('\n');
  
  const flight = {
    fileName: fileName,
    date: null,
    takeoffTime: null,
    sqlDateTime: null,
    offsetUTC: null,
    pilotName: null,
    gliderType: null, 
    firstLatitude: null,
    firstLongitude: null,
    firstAltGPS: null,
    duration: null, // Duration in seconds
    durationStr: null, // Duration formatted hh:mm:ss
    rawContent: content,
    isValid: false
  };

  let firstBRecord = null;
  let lastBRecord = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Date du vol (HFDTE Date: DDMMYY)
    if (trimmedLine.startsWith('HFDTE') || trimmedLine.startsWith('HFDTEDATE:')) {
      const dateMatch = trimmedLine.match(/(\d{6})/);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const day = dateStr.substring(0, 2);
        const month = dateStr.substring(2, 4);
        const year = dateStr.substring(4, 6);
        // Convert to format YYYY-MM-DD (assume 20xx for the year)
        flight.date = `20${year}-${month}-${day}`;
      }
    }
    
    // Pilot name (HFPLTPILOT: or HFPLTPILOTINCHARGE:)
    if (trimmedLine.startsWith('HFPLT')) {
      const pilotMatch = trimmedLine.match(/HFPLT.*?:(.*)/);
      if (pilotMatch) {
        flight.pilotName = pilotMatch[1].trim();
      }
    }

    // Glider type (HFGTYGLIDERTYPE: or HFGTYGLIDERTYPE)
    if (trimmedLine.startsWith('HFGTY')) {
      // Examples: HFGTYGLIDERTYPE:Paraglider\n or HFGTYGLIDERTYPE:Parapente\n
      const gliderMatch = trimmedLine.match(/HFGTY.*?:(.*)/);
      if (gliderMatch) {
        flight.gliderType = gliderMatch[1].trim();
      }
    }
    
    
    // First B record (position)
    if (trimmedLine.startsWith('B') && trimmedLine.length >= 35) {
      if (!firstBRecord) {
        firstBRecord = trimmedLine;
        const firstFixe = parseBLine(trimmedLine);
        const timestamp = Date.parse(`${flight.date}T${firstFixe.time}Z`);
        flight.firstLatitude = firstFixe.latitude;
        flight.firstLongitude = firstFixe.longitude;
        flight.firstAltGPS = firstFixe.altitude;
        let offsetUTC = computeOffsetUTC(firstFixe.latitude, firstFixe.longitude, timestamp);
        if (offsetUTC === undefined || offsetUTC === null) {
            offsetUTC = 0;
        }
        flight.offsetUTC = offsetUTC;
        const launchTime =  computeLocalLaunchTime(timestamp, offsetUTC);
        flight.takeoffTime = launchTime;
        flight.sqlDateTime = flight.date+' '+flight.takeoffTime;
        flight._firstBTime = firstFixe.time; // Pour calcul durée
        flight.isValid = true;
      }
      lastBRecord = trimmedLine;
      // Toujours mettre à jour le temps du dernier B
      const lastFixe = parseBLine(trimmedLine);
      flight._lastBTime = lastFixe.time;
    }
  }

  // If no date found in the header, try to extract it from the file name
  if (!flight.date && fileName) {
    // Common format: YYYY-MM-DD-XXX.igc or similar
    const dateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      flight.date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }
  }
  // Calculate flight duration if possible
  if (flight._firstBTime && flight._lastBTime) {
    // Times are in HHMMSS format
    function hmsToSeconds(hms) {
      const h = parseInt(hms.substring(0,2),10);
      const m = parseInt(hms.substring(3,5),10);
      const s = parseInt(hms.substring(6),10);
      return h*3600 + m*60 + s;
    }
    let startSec = hmsToSeconds(flight._firstBTime);
    let endSec = hmsToSeconds(flight._lastBTime);
    //  If the flight passes midnight, correct
    if (endSec < startSec) endSec += 24*3600;
    const duration = endSec - startSec;   
    flight.duration = duration;
    // Format hh:mm
    const hours = Math.floor(duration / 3600)
    let totalSeconds = duration;
    totalSeconds %= 3600
    const minutes = Math.floor(totalSeconds / 60)
    const pSduree = String(hours).padStart(2, "0")+'h'+String(minutes).padStart(2, "0")+'mn' // V_sDuree
    // const h = Math.floor(duration/3600);
    // const m = Math.floor((duration%3600)/60);
    // const s = duration%60;
    
    // flight.durationStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    flight.durationStr = pSduree;
  }
  // Cleanup internal fields
  delete flight._firstBTime;
  delete flight._lastBTime;

  //console.log(flight.pilotName+' Duration: '+flight.durationStr+' OffsetUTC: '+flight.offsetUTC+ ' Alt: '+flight.firstAltGPS);

  return flight;
}

/**
 * Vérifie si un vol existe déjà dans la base de données
 * @param {Object} db - Instance de la base de données SQL.js
 * @param {Object} flight - Objet vol à vérifier
 * @returns {boolean} True si le vol existe déjà
 */
export function checkFlightExists(db, flight) {
  if (!db || !flight.date || !flight.takeoffTime) {
    return false;
  }

  try {
    const dateTimeSearch = flight.date + ' ' + flight.takeoffTime.substring(0, 5);
    const stmt = db.prepare(
       'SELECT COUNT(*) as count FROM Vol WHERE strftime(\'%Y-%m-%d %H:%M\', V_Date)  = ?'
    );
    stmt.bind([dateTimeSearch]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row.count > 0;
    }
    
    stmt.free();
    return false;
  } catch (error) {
    console.error('Erreur lors de la vérification du vol:', error);
    return false;
  }
}

/**
 * Génère un identifiant unique pour un vol (pour détecter les doublons)
 * @param {Object} flight - Objet vol
 * @returns {string} Identifiant unique
 */
export function generateFlightId(flight) {
  return `${flight.date}_${flight.takeoffTime}_${flight.pilotName || 'unknown'}`;
}


function parseBLine(line) {
    const RE_B = /^B(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{3})([NS])(\d{3})(\d{2})(\d{3})([EW])([AV])(-\d{4}|\d{5})(-\d{4}|\d{5})/;
    let match = line.match(RE_B);
    if (!match) {
        throw new Error(`Invalid B record at line ${this.lineNumber}: ${line}`);
    }
    let time = `${match[1]}:${match[2]}:${match[3]}`;
    let latitude = parseLatitude(match[4], match[5], match[6], match[7]);
    let longitude = parseLongitude(match[8], match[9], match[10], match[11]);
    let gpsAltitude = match[14] === '00000' ? null : parseInt(match[14], 10);
    const fixe = {
        time: time,
        latitude: latitude,
        longitude: longitude,
        altitude: gpsAltitude
    };

    return fixe;
}

function computeLocalLaunchTime(timestamp, offsetUTC) {
    /**
     * IMPORTANT : when a date oject is requested from the timestamp, 
     * the time difference is returned with the local configuration of the computer. 
     * So if I take a flight from Argentina in January it will return UTC+1, in July UTC+2.
     * it's necessary to request an UTC date object 
     */
    // offsetUTC is in minutes, original timestamp in milliseconds
    const startLocalTimestamp = timestamp + (offsetUTC*60000)
   // console.log(`computeLocalLaunchTime with timestamp ${timestamp} and offsetUTC ${offsetUTC} gives startLocalTimestamp ${startLocalTimestamp}`);
    // Convertir le timestamp en date locale
    const isoLocalStart = new Date(startLocalTimestamp).toISOString()
    const dateLocal = new Date(isoLocalStart.slice(0, -1))
    const startLocalTime = String(dateLocal.getHours()).padStart(2, '0')+':'+String(dateLocal.getMinutes()).padStart(2, '0')+':'+String(dateLocal.getSeconds()).padStart(2, '0')  

    return startLocalTime
}

function parseLatitude(dd, mm, mmm, ns) {    
    let degrees = parseInt(dd, 10) + parseFloat(`${mm}.${mmm}`) / 60;
    return (ns === 'S') ? -degrees : degrees;
}

function parseLongitude(ddd, mm, mmm, ew) {
    let degrees = parseInt(ddd, 10) + parseFloat(`${mm}.${mmm}`) / 60;
    return (ew === 'W') ? -degrees : degrees;
}