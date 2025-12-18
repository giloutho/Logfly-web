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
        console.log('No site found in DB, adding new site ...');
        await addNewSite(pLat, pLong, pAlt, 'To rename');
    }    
    //const site = addNewSite(pLat, pLong, 0,'');
    // const blanckIdx = searchIdxBlankSite('To rename');
    // console.log('Index for blank site:', blanckIdx);
}

async function searchSiteInDb(pLat, pLong) {
    const databaseStore = useDatabaseStore();
    if (!databaseStore.hasOpenDatabase) {
        console.warn('Database is not open. Cannot search for site.');
        return null;
    }
    // in Logfly 5, distance mini is stored in settings but we never changed the value of 300 m
    let distMini = 300;            
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
                // console.log(`Distance to site ${site.S_Nom}: ${Math.round(distSite)} m`);
                if (distSite < distMini)  {
                    distMini = distSite;
                    siteInDb.siteName = site.S_Nom;
                    siteInDb.siteCountry = site.S_Pays;                 
                   // selectedSite = site.S_Nom+'*'+site.S_Pays;  // since V3, we add the country
                    console.log(`Site in db : ${siteInDb.siteName} à ${Math.round(distMini)} m`);
                }    
            }
        } else {
            console.log('Aucun site trouvé dans la base ');
        }
    } catch (err) {
        console.error('Erreur lors de l\'exécution de searchSiteInDb :', err);
    }

    return siteInDb
}  

export async function addNewSite(lat, lng, alt, strRename) {
    const updateDate = new Date()
    const sqlDate = updateDate.getFullYear()+'-'+String((updateDate.getMonth()+1)).padStart(2, '0')+'-'+String(updateDate.getDate()).padStart(2, '0')                 
    const sqltable = 'Site';    
    let sqlparams = {
        S_CP : '***', // Code postal inconnu, à compléter par l'utilisateur
        S_Type : 'D',
        S_Maj: sqlDate
    }            
    // First we try to find the takeoff site with the API ParaglidingEarth
    console.log('Recherche sur ParaglidingEarth ...');
    const result = await callPgearth(lat, lng);    
    if (result.success) {            
        sqlparams.S_Nom = result.name.toUpperCase();
        sqlparams.S_Pays = result.countryCode.toUpperCase();
        sqlparams.S_Alti = result.takeoff_altitude;
        sqlparams.S_Latitude = result.coordinates[1];
        sqlparams.S_Longitude = result.coordinates[0];   
        console.log('PGEarth :', sqlparams.S_Nom, sqlparams.S_Pays);
    } else {
        // Si échec de l'API ou site non trouvé, on ajoute un site générique
        console.log('No site found on ParaglidingEarth :', result.message);
        // sqlparams.S_Nom = 'Takeoff at '+lat.toFixed(4)+','+lng.toFixed(4);
        // sqlparams.S_Pays = 'XX';
        // sqlparams.S_Alti = alt;
        // sqlparams.S_Latitude = lat;
        // sqlparams.S_Longitude = lng;   
    }    
}

async function callPgearth(lat, lng) {
    // sans proxy
    // let pgurl = 'https://www.paraglidingearth.com/api/geojson/getAroundLatLngSites.php?distance=1';
    let pgurl = '/api-paragliding/api/geojson/getAroundLatLngSites.php?distance=1';
    pgurl += `&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
    // const url = `http://www.paraglidingearth.com/api/getAroundLatLngSites.php?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&distance=5&limit=2`;
    try {
        return await callPgearthAPI(pgurl);
    } catch (err) {
        return { success: false, message: err.message };
    }
} 

function searchIdxBlankSite(strRename) {
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