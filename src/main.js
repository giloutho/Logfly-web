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

// Gestionnaire d'erreur global du navigateur pour masquer l'erreur Vuetify ripple
//  Cette erreur est apparue lors de l'import de igc-xc-score
// toutes les tentatives de correction dans le code de Vuetify ou dans le code de l'application ont échoué
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes("Cannot set properties of undefined (setting 'isHiding')")) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
}, true);

// Gestionnaire d'erreur global pour masquer l'erreur Vuetify ripple
const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  // Ignore l'erreur spécifique du ripple Vuetify
  if (err.message && err.message.includes("Cannot set properties of undefined (setting 'isHiding')")) {
    return; // Masque cette erreur
  }
  // Log les autres erreurs
  console.error('Error:', err);
  console.error('Info:', info);
};

// 3. Montage de l'application
app
  .use(router)
  .use(vuetify) // ⬅️ Enregistrement du plugin Vuetify
  .use(createPinia())
  .use(gettext) // ⬅️ Enregistrement du plugin Gettext
  .mount('#app');
