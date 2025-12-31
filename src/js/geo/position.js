/**
 * Position class for coordinate conversions
 * Handles DD (Decimal Degrees), DMm (Degrees, Minutes decimal), DMS (Degrees, Minutes, Seconds)
 */
export class Position {
    constructor() {
        this.altitude = 0;
        this.hemisphere = "N";
        this.latDegres = 0;
        this.latDecimal = 0;
        this.latitude = 0;
        this.latMin_mm = 0;
        this.latMin_ms = 0;
        this.latSec_ms = 0;
        this.longDegres = 0;
        this.longDecimal = 0;
        this.longitude = 0;
        this.longMin_mm = 0;
        this.longMin_ms = 0;
        this.longSec_ms = 0;
        this.meridian = "E";
    }

    /**
     * Set latitude from decimal degrees
     * @param {number} degrees - Decimal degrees (e.g., 45.86789 or -45.86789)
     */
    setLatitudeDd(degrees) {
        this.latitude = Number(degrees);
        let iSign;
        if (degrees < 0) {
            degrees = -degrees;
            iSign = -1;
        } else {
            iSign = 1;
        }
        this.latDegres = Math.floor(degrees);
        this.latDecimal = Number(degrees) - this.latDegres;
        const dMinutesPart = (Number(degrees) - this.latDegres) * 60;
        this.latMin_mm = dMinutesPart;
        this.latSec_ms = (dMinutesPart - Math.floor(dMinutesPart)) * 60;
        this.latMin_ms = Math.floor(dMinutesPart);
        this.hemisphere = iSign === 1 ? 'N' : 'S';
    }

    /**
     * Set longitude from decimal degrees
     * @param {number} degrees - Decimal degrees (e.g., 6.12345 or -6.12345)
     */
    setLongitudeDd(degrees) {
        this.longitude = Number(degrees);
        let iSign;
        if (degrees < 0) {
            degrees = -degrees;
            iSign = -1;
        } else {
            iSign = 1;
        }
        this.longDegres = Math.floor(degrees);
        this.longDecimal = Number(degrees) - this.longDegres;
        const dMinutesPart = (Number(degrees) - this.longDegres) * 60;
        this.longMin_mm = dMinutesPart;
        this.longSec_ms = (dMinutesPart - Math.floor(dMinutesPart)) * 60;
        this.longMin_ms = Math.floor(dMinutesPart);
        this.meridian = iSign === 1 ? 'E' : 'W';
    }

    /**
     * Set latitude from Degrees and decimal Minutes (DMm)
     * @param {number} pDeg - Degrees
     * @param {number} pMin - Decimal minutes (e.g., 51.7800)
     * @param {string} pHem - Hemisphere ('N' or 'S')
     */
    setLatitudeDMm(pDeg, pMin, pHem) {
        let calcLatitude = Number(pDeg) + ((Number(pMin) * 60) / 3600);
        if (pHem === 'S') calcLatitude = calcLatitude * -1;
        this.latitude = calcLatitude;
        this.latDegres = Number(pDeg);
        this.latDecimal = calcLatitude - this.latDegres;
        this.latMin_ms = Math.floor(Number(pMin));
        this.latMin_mm = Number(pMin);
        this.latSec_ms = (pMin - this.latMin_ms) * 60;
        this.hemisphere = pHem;
    }

    /**
     * Set longitude from Degrees and decimal Minutes (DMm)
     * @param {number} pDeg - Degrees
     * @param {number} pMin - Decimal minutes
     * @param {string} pMer - Meridian ('E' or 'W')
     */
    setLongitudeDMm(pDeg, pMin, pMer) {
        let calcLongitude = Number(pDeg) + ((Number(pMin) * 60) / 3600);
        if (pMer === 'W') calcLongitude = calcLongitude * -1;
        this.longitude = calcLongitude;
        this.longDegres = Number(pDeg);
        this.longDecimal = calcLongitude - this.longDegres;
        this.longMin_ms = Math.floor(Number(pMin));
        this.longMin_mm = Number(pMin);
        this.longSec_ms = (pMin - this.longMin_ms) * 60;
        this.meridian = pMer;
    }

    /**
     * Set latitude from Degrees, Minutes, Seconds (DMS)
     * @param {number} pDeg - Degrees
     * @param {number} pMin - Minutes
     * @param {number} pSec - Seconds with decimals
     * @param {string} pHem - Hemisphere ('N' or 'S')
     */
    setLatitudeDMS(pDeg, pMin, pSec, pHem) {
        const decPart = ((Number(pMin) * 60) + Number(pSec)) / 3600;
        this.latDecimal = decPart;
        this.latDegres = Number(pDeg);
        this.latitude = +this.latDegres + +this.latDecimal;
        if (pHem === 'S') this.latitude = this.latitude * -1;
        this.latMin_ms = Number(pMin);
        this.latMin_mm = +pMin + (pSec / 60);
        this.latSec_ms = Number(pSec);
        this.hemisphere = pHem;
    }

    /**
     * Set longitude from Degrees, Minutes, Seconds (DMS)
     * @param {number} pDeg - Degrees
     * @param {number} pMin - Minutes
     * @param {number} pSec - Seconds with decimals
     * @param {string} pMer - Meridian ('E' or 'W')
     */
    setLongitudeDMS(pDeg, pMin, pSec, pMer) {
        const decPart = ((Number(pMin) * 60) + Number(pSec)) / 3600;
        this.longDecimal = decPart;
        this.longDegres = Number(pDeg);
        this.longitude = +this.longDegres + +this.longDecimal;
        if (pMer === 'W') this.longitude = this.longitude * -1;
        this.longMin_ms = Number(pMin);
        this.longMin_mm = +pMin + (pSec / 60);
        this.longSec_ms = Number(pSec);
        this.meridian = pMer;
    }

    /**
     * Get formatted latitude in DMm format (e.g., "45°51.7800'N")
     */
    getLatDMm() {
        const fmtMin = String(Number(this.latMin_mm).toFixed(4)).padStart(7, '0');
        return `${this.latDegres}°${fmtMin}'${this.hemisphere}`;
    }

    /**
     * Get formatted longitude in DMm format (e.g., "6°10.3500'E")
     */
    getLongDMm() {
        const fmtMin = String(Number(this.longMin_mm).toFixed(4)).padStart(7, '0');
        return `${this.longDegres}°${fmtMin}'${this.meridian}`;
    }

    /**
     * Get formatted latitude in DMS format (e.g., "45°51'46.80"N")
     */
    getLatDMS() {
        const fmtSec = String(Number(this.latSec_ms).toFixed(2)).padStart(5, '0');
        return `${this.latDegres}°${String(this.latMin_ms).padStart(2, '0')}'${fmtSec}"${this.hemisphere}`;
    }

    /**
     * Get formatted longitude in DMS format (e.g., "6°10'21.00"E")
     */
    getLongDMS() {
        const fmtSec = String(Number(this.longSec_ms).toFixed(2)).padStart(5, '0');
        return `${this.longDegres}°${String(this.longMin_ms).padStart(2, '0')}'${fmtSec}"${this.meridian}`;
    }
}

export default Position;
