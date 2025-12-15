import { createRouter, createWebHistory } from 'vue-router'
//import HomeView from '../views/HomeView.vue'

const routes = [
  // Redirection explicite pour index.html
  {
    path: '/index.html',
    redirect: { name: 'home' }
  },
    // Route de Base initiale
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },    
    // Si on veut directement aller sur le carnet
    // { path: '/', redirect: { name: 'logbook-view' } },
    // 📦 MODULE TRACK (1, 2, 3) - Le point d'entrée pour le bundle 'module-tracks'
    {
      path: '/tracks',
      name: 'tracks-base',
      component: () => import(/* webpackChunkName: "module-tracks" */ '../modules/Tracks/TracksLayout.vue'),
      children: [
        {
          path: 'logbook',
          name: 'logbook-view',
          component: () => import('../modules/Tracks/views/LogbookView.vue'),
        },
        {
          path: 'import',
          name: 'import-gps',
          component: () => import('../modules/Tracks/views/ImportView.vue'),
        },
        {
          path: 'external',
          name: 'external-track',
          component: () => import('../modules/Tracks/views/ExternalView.vue'),
        },
      ],
    },
    // 📦 MODULE STAT (4, 5) - Bundle 'module-stat'
    {
      path: '/stat',
      name: 'stat-base',
      component: () => import(/* webpackChunkName: "module-stat" */ '../modules/Stat/StatLayout.vue'),
      children: [
        {
          path: 'annee',
          name: 'synthese-annee',
          component: () => import('../modules/Stat/views/AnnualSummary.vue'),
        },
        {
          path: 'global',
          name: 'synthese-globale',
          component: () => import('../modules/Stat/views/GlobalSummary.vue'),
        },
      ],
    },

    // 📦 MODULE NAVIGATION (8, 9) - Bundle 'module-routing'
    {
      path: '/routing',
      name: 'routing-base',
      component: () => import(/* webpackChunkName: "module-routing" */ '../modules/Routing/RoutingLayout.vue'),
      children: [
        {
          path: 'waypoints',
          name: 'waypoints-view',
          component: () => import('../modules/Routing/views/WaypointView.vue'),
        },
        {
          path: 'airspaces',
          name: 'airspaces-view',
          component: () => import('../modules/Routing/views/AirspacesView.vue'),
        },      
        {
          path: 'xcnav',
          name: 'xcnav-view',
          component: () => import('../modules/Routing/views/XcnavView.vue'),
        },        
      ],
    },

    // 📦 MODULE FILES (6, 7) - Bundle 'module-files'
    {
      path: '/files',
      name: 'files-base',
      component: () => import(/* webpackChunkName: "module-files" */ '../modules/Files/FilesLayout.vue'),
      children: [
        {
          path: 'sites',
          name: 'sites-view',
          component: () => import('../modules/Files/views/SitesView.vue'),
        },
        {
          path: 'pgearth',
          name: 'pgearth-view',
          component: () => import('../modules/Files/views/PgearthView.vue'),
        },              
      ],
    },

    // 📦 MODULE MATERIEL (10) - Bundle 'module-materiel'
    {
      path: '/equip',
      name: 'equip-base',
      component: () => import(/* webpackChunkName: "module-materiel" */ '../modules/Equip/EquipLayout.vue'),
      // ... routes enfants pour la gestion du matériel
    },

    // 📦 MODULE SETTINGS (11) - Bundle 'module-settings'
    {
      path: '/settings',
      name: 'settings-base',
      component: () => import(/* webpackChunkName: "module-settings" */ '../modules/Settings/SettingsLayout.vue'),
      children: [
        {
          path: 'settings',
          name: 'settings-view',
          component: () => import('../modules/Settings/views/SettingsView.vue'),
        },
        {
          path: 'support',
          name: 'support-view',
          component: () => import('../modules/Settings/views/SupportView.vue'),
        },      
        {
          path: 'utils',
          name: 'utils-view',
          component: () => import('../modules/Settings/views/UtilsView.vue'),
        },        
      ],
    },    
  ];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router
