import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
// 1. Imports nécessaires pour Vuetify
import 'vuetify/styles'; // Importe les styles de base
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css'; // Importe la police d'icônes MDI
import { mdi } from 'vuetify/iconsets/mdi'; // Pour les icônes Material Design

// Imports pour vue3-gettext
import { createGettext } from "vue3-gettext";
import translations from "./language/translations.json";

// 2. Création de l'instance Vuetify
const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    sets: { mdi },
  },
  // Vous pouvez ajouter ici la configuration de votre thème personnalisé
  // theme: { ... } 
});

// 3. Création de l'instance Gettext
const gettext = createGettext({
  availableLanguages: {
    en: "English",
    fr: "Français",
  },
  defaultLanguage: "en",
  translations: translations,
  silent: true,   // pour éviter les warnings
});

// 3. Montage de l'application
createApp(App)
  .use(router)
  .use(vuetify) // ⬅️ Enregistrement du plugin Vuetify
  .use(createPinia())
  .use(gettext) // ⬅️ Enregistrement du plugin Gettext
  .mount('#app');
