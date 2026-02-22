import L from 'leaflet';
import markerIcon2x from '@/assets/marker-icon-2x.png';
import markerIcon from '@/assets/marker-icon.png';
import markerShadow from '@/assets/marker-shadow.png';

// Fix Leaflet default icon paths for production builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * Create a new OSM tile layer instance
 */
export function createOsm() {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  });
}

/**
 * Create a new OpenTopoMap tile layer instance
 */
export function createTopo() {
  return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17
  });
}

/**
 * Create a new IGN tile layer instance
 */
export function createIgn() {
  return L.tileLayer('https://data.geopf.fr/wmts?' +
    '&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&TILEMATRIXSET=PM' +
    '&LAYER={ignLayer}&STYLE={style}&FORMAT={format}' +
    '&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}',
    {
      ignLayer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
      style: 'normal',
      format: 'image/png',
      service: 'WMTS',
      opacity: 1,
      attribution: 'Carte © IGN/Geoplateforme'
    });
}

/**
 * Create a new Satellite tile layer instance
 */
export function createSat() {
  return L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  );
}

/**
 * Create a new MTK tile layer instance
 */
export function createMtk() {
  return L.tileLayer('http://tile2.maptoolkit.net/terrain/{z}/{x}/{y}.png');
}

/**
 * Create a new Esri World Topo Map tile layer instance
 */
export function createEsriTopo() {
  return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
  });
}

/**
 * Create a new Thunderforest Outdoor tile layer instance
 */
export function createOutdoor() {
  return L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=6f5667c1f2d24e5f84ec732c1dbd032e', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });
}

/**
 * Create a new KK7 thermal layer instance
 */
export function createKk7() {
  return L.tileLayer('https://thermal.kk7.ch/tiles/skyways_all_all/{z}/{x}/{y}.png?src=logfly.app', {
    attribution: 'thermal.kk7.ch <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC-BY-NC-SA>/a>',
    maxNativeZoom: 13,
    tms: true,
    opacity: 0.5
  });
}

/**
 * Factory function to create a fresh set of base map layers.
 * Each map component should call this to get its own layer instances.
 */
export function createBaseMaps() {
  return {
    'OpenStreetMap': createOsm(),
    'OpenTopoMap': createTopo(),
    'IGN': createIgn(),
    'Satellite': createSat(),
    'Mtk': createMtk(),
    'Esri Topo': createEsriTopo(),
    'Outdoor': createOutdoor()
  };
}

// Legacy exports for backward compatibility (singleton instances)
// WARNING: These should not be used when multiple maps are displayed simultaneously
export const osm = createOsm();
export const topo = createTopo();
export const ign = createIgn();
export const sat = createSat();
export const mtklayer = createMtk();
export const Esri_WorldTopoMap = createEsriTopo();
export const outdoorlayer = createOutdoor();
export const kk7layer = createKk7();
export const baseMaps = createBaseMaps();
