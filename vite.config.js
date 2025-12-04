import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import vuetify from 'vite-plugin-vuetify'; // ⬅️ Le plugin pour le tree-shaking

// https://vite.dev/config/
export default defineConfig({
  base: '/logfly/',
  plugins: [
        vue(), 
        vuetify({
            // Configuration pour s'assurer que le tree-shaking est optimal
            autoImport: true, // Importer automatiquement les composants utilisés
            styles: {
              // Inclut le style SASS de Vuetify (très important)
              configFile: 'src/settings.scss', // Optionnel, si vous voulez personnaliser
            },
          }),
      ],
  build: {
    rollupOptions: {
      output: {
        // Nomme les bundles de modules basés sur le commentaire magique
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name.startsWith('module-')) {
            return 'assets/modules/[name]-[hash].js'; 
          }
          return 'assets/chunks/[name]-[hash].js';
        },
        // Sépare les dépendances tierces (vendors) pour un meilleur cache
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
})