import tz_lookup from '@photostructure/tz-lookup';
import ZonedDateTime from 'zoned-date-time';
import { zoneData } from 'iana-tz-data';

/**
 * Wait for coordinates of a point and a Unix timestamp
 * return the offset UTC for the given point at the given time 
 */
export function computeOffsetUTC(lat, lng, timestamp) {  
    // Récupère le fuseau horaire
    const timezone = tz_lookup(lat, lng); 

    // normally returns something like // ['America/Los_Angeles'] or['Asia/Shanghai', 'Asia/Urumqi']
    // but sometimes it returns something like [ 'America/Argentina/Tucuman' ] we need the three parts
    const arrZone = timezone.toString().split('/')
    let dateFirstPoint = new Date(timestamp)
  // https://github.com/rxaviers/zoned-date-time
    let zdt
    if (arrZone.length == 3) {
        zdt = new ZonedDateTime(dateFirstPoint, zoneData[arrZone[0]][arrZone[1]][arrZone[2]])    
    } else {
        zdt = new ZonedDateTime(dateFirstPoint, zoneData[arrZone[0]][arrZone[1]])
    }
    let rawOffset = zdt.getTimezoneOffset()
    // The direction is reversed. getTimezoneOffset gives us the operation to be carried out to obtain the UTC time.
    // For France getTimezoneOffset result is -120mn.
    let offsetUTC = -1 * rawOffset	

    return offsetUTC
}