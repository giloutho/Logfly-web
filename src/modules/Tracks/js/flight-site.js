import { useDatabaseStore } from '@/stores/database';
import {distance} from '@/js/geo/trigo.js';
import { callPgearthAPI } from '@/js/api-access.js';

const databaseStore = useDatabaseStore();

const siteInfo = {
    siteName: '',
    siteCountry: ''
}

export async function searchSite(pLat, pLong, pAlt) {  
    let searchSite = await searchSiteInDb(pLat, pLong);
    if (searchSite.siteName != null && searchSite.siteName != '') {
        siteInfo.siteName = searchSite.siteName;
        siteInfo.siteCountry = searchSite.siteCountry;      
    } else {
        //console.log('No site found in database, adding new site...');
        const addSiteInDb = await addNewSite(pLat, pLong, pAlt, 'To rename');
        siteInfo.siteName = addSiteInDb.newFlightSite.name;
        siteInfo.siteCountry = addSiteInDb.newFlightSite.pays; 
        //console.log('New site added:', siteInfo.siteName, siteInfo.siteCountry);
    }  
    return siteInfo;  
}

async function searchSiteInDb(pLat, pLong) {
    const databaseStore = useDatabaseStore();
    if (!databaseStore.hasOpenDatabase) {
        console.warn('Database is not open. Cannot search for site.');
        return null;
    }
    // Search radius in accordance with the search on PGEarth (0.5 km)
    let distMini = 500;            
    /*
    * NOTE : under our latitudes, second decimal give a search perimeter of 1,11km. 
    * third decimal, perimeter is 222 meters ...      
    */
    const arrLat = Math.ceil(pLat*1000)/1000;
    const arrLong = Math.ceil(pLong*1000)/1000;
    const sLatMin = (arrLat - 0.01).toFixed(4).toString();
    const sLatMax = (arrLat + 0.01).toFixed(4).toString();
    const sLongMin = (arrLong - 0.01).toFixed(4).toString();
    const sLongMax = (arrLong + 0.01).toFixed(4).toString();
    // In old versions, search is limited to launching sites, but this information can be absent
    // landing sites are excluded
    const siteInDb = {
        siteName: null,
        siteCountry: ''
    }
    try {
        const req = `SELECT S_ID,S_Nom,S_Latitude,S_Longitude,S_Alti,S_Localite,S_Pays FROM Site WHERE S_Latitude >'${sLatMin}' AND S_Latitude < '${sLatMax}' AND S_Longitude > '${sLongMin}' AND S_Longitude < '${sLongMax}' AND S_Type <> 'A' `;
        const result = databaseStore.query(req);
        if (result.success && result.data && result.data[0]) {
            const sitesValues = Object.values(result.data[0]);
            // siteValues contient deux tableaux
            // siteValues[0] : array d'une ligne : nom des colonnes S_ID,S_Nom,S_Latitude,...
            // siteValues[1] : array des valeurs : x lignes de résultats
            const columns = sitesValues[0];
            const rows = sitesValues[1];
            // Transformation des rows en array d'objets
            const sitesFound = rows.map(row =>
                Object.fromEntries(row.map((val, i) => [columns[i], val]))
            );           
            for (const site of sitesFound) {
                let carnetLat = site.S_Latitude;
                let carnetLong = site.S_Longitude;
                let distSite = Math.abs(distance(pLat,pLong,carnetLat,carnetLong, "K") * 1000)   
                //console.log(`Distance to site ${site.S_Nom}: ${Math.round(distSite)} m`);
                if (distSite < distMini)  {
                    distMini = distSite;
                    siteInDb.siteName = site.S_Nom;
                    siteInDb.siteCountry = site.S_Pays;                 
                    //console.log(`Site in db : ${siteInDb.siteName} à ${Math.round(distMini)} m`);
                }    
            }
        } 
    } catch (err) {
        console.error('Erreur lors de l\'exécution de searchSiteInDb :', err);
    }

    return siteInDb
}  

export async function addNewSite(lat, lng, alt, strRename) {
    const newFlightSite = {
        name : 'Not defined',
        pays : ''
    }
    try {
        const updateDate = new Date()
        const sqlDate = updateDate.getFullYear()+'-'+String((updateDate.getMonth()+1)).padStart(2, '0')+'-'+String(updateDate.getDate()).padStart(2, '0')                 
        const sqltable = 'Site';    
        let sqlparams = {
            S_CP : '***', // Postcode unknown, to be completed by the user
            S_Type : 'D',
            S_Maj: sqlDate,
            S_Alti : alt,
            S_Latitude : lat,
            S_Longitude : lng          
        }            
        // First we try to find the takeoff site with the API ParaglidingEarth
        const result = await callPgearth(lat, lng);    
        if (result.success) {            
            sqlparams.S_Nom = result.name.toUpperCase();
            sqlparams.S_Pays = result.countryCode.toUpperCase();
            sqlparams.S_Alti = result.takeoff_altitude;
            sqlparams.S_Latitude = result.coordinates[1];
            sqlparams.S_Longitude = result.coordinates[0];   
            //console.log('PGEarth :', sqlparams);
        } else {
            // No site found or error returned by the ParaglidingEarth API
            // Search index of new blank site : (site to rename XX)
            const blanckIdx = await searchIdxBlankSite(strRename);
            sqlparams.S_Nom = blanckIdx.siteName;
            sqlparams.S_Pays = '';
            sqlparams.S_Alti = alt;
            sqlparams.S_Latitude = lat;
            sqlparams.S_Longitude = lng;  
            //console.log('Blank site:', sqlparams);
        }
        // New site is added to the database
        const resultInsert = databaseStore.insert(sqltable, sqlparams);
        if (!resultInsert.success) {
            console.error('Error inserting new site into database:', resultInsert.message);
        }
        //console.log('New site added with ID:', resultInsert.lastInsertId);
        newFlightSite.name = sqlparams.S_Nom;
        newFlightSite.pays = sqlparams.S_Pays;
        return { newFlightSite};
    } catch (error) {
        console.error('Error in addNewSite :', error);
        return { newFlightSite };        
    }        
}

async function callPgearth(lat, lng) {
    // withiut proxy
    // let pgurl = 'https://www.paraglidingearth.com/api/geojson/getAroundLatLngSites.php?distance=1';
    let pgurl = '/api-paragliding/api/geojson/getAroundLatLngSites.php?distance=0.5';
    pgurl += `&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
    // const url = `http://www.paraglidingearth.com/api/getAroundLatLngSites.php?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&distance=5&limit=2`;
    try {
        return await callPgearthAPI(pgurl);
    } catch (err) {
        return { success: false, message: err.message };
    }
} 

async function searchIdxBlankSite(strRename) {
    // The name of an unknown site is : Site No XX to rename
    // We search last index XX
    const lastStr = strRename;
    const siteArg = 'Site No%';
    let blanckIdx = {
        newSiteIdx : '',
        siteName :'Unknown site'
    } 
    try {
        const reqSQL = `SELECT Count(S_ID) as count FROM Site WHERE S_Nom LIKE '${siteArg}'`;
        const result = databaseStore.query(reqSQL);
        if (result.success && result.data && result.data[0]) {
            const lastIdx = parseInt(Object.values(result.data[0].values[0]));            
            if(lastIdx === 0) {
                blanckIdx.newSiteIdx = 1;
                blanckIdx.siteName = `Site No ${blanckIdx.newSiteIdx} (${lastStr})`;
            } else {
                blanckIdx.newSiteIdx = lastIdx + 1;
                blanckIdx.siteName = `Site No ${blanckIdx.newSiteIdx} (${lastStr})`;
            }
        }    
    } catch (error) {
        console.error('Error on searchIdxBlankSite :', error);
    }   

    return blanckIdx        
}