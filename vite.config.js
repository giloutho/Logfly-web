import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import vuetify from 'vite-plugin-vuetify'; // ⬅️ Le plugin pour le tree-shaking
import { VitePWA } from 'vite-plugin-pwa'; // ⬅️ Plugin PWA

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
    proxy: {
      '/api-paragliding': {
        target: 'https://www.paraglidingearth.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-paragliding/, ''),
        secure: false
      },
      '/api-openair': {
        target: 'http://pascal.bazile.free.fr',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-openair/, ''),
        secure: false
      }
    }
  },
  plugins: [
    vue(),
    vuetify({
      // Configuration pour s'assurer que le tree-shaking est optimal
      autoImport: true, // Importer automatiquement les composants utilisés
      styles: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon.png'],
      manifest: {
        name: 'Logfly',
        short_name: 'Logfly',
        description: 'Logiciel de gestion de carnet de vol pour le parapente',
        theme_color: '#1976D2',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Increase limit from 2MB to 5MB for the vendor chunk
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}']
      }
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
            // igc-xc-score and its 'collections' dependency must NOT be in the
            // vendor chunk.  The 'collections' package ships a shim that
            // overwrites Array.prototype.findLast (and .find) with a
            // non-standard version.  When bundled into the eagerly-loaded
            // vendor chunk the shim executes at page-load and breaks Vuetify
            // (and any other code that relies on the native findLast API).
            // Keeping them out of the vendor chunk lets the dynamic
            // import('igc-xc-score') create its own lazy chunk instead.
            if (id.includes('igc-xc-score') || id.includes('collections')) {
              return undefined; // let Rollup handle it (lazy chunk)
            }
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
  define: {
    'global': 'globalThis',
  },
})