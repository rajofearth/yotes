// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // --- General PWA Strategy ---
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw-custom.js',

      // --- Service Worker Caching (Workbox) ---
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-googleapis', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 }, cacheableResponse: { statuses: [0, 200] } }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-gstatic', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 }, cacheableResponse: { statuses: [0, 200] } }
          },
          // Do NOT cache app shell routes that may render decrypted content
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && /^\/(?:$|note|settings|create|section)/.test(url.pathname),
            handler: 'NetworkOnly',
          },
        ],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
      },

      // --- Development Options ---
      devOptions: {
        enabled: true,
        type: 'module'
      },

      // --- Web App Manifest ---
      manifest: {
        id: '/',
        name: 'Yotes',
        short_name: 'Yotes',
        description: 'Privacy-first notes app.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1B1B1B',
        background_color: '#1B1B1B',
        lang: 'en',
        dir: 'ltr',
        categories: ['productivity', 'utilities'],
        icons: [
            { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'maskable_icon_x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: 'maskable_icon_x48.png', sizes: "48x48", type: "image/png", purpose: "maskable" },
            { src: 'maskable_icon_x72.png', sizes: "72x72", type: "image/png", purpose: "maskable" },
            { src: 'maskable_icon_x96.png', sizes: "96x96", type: "image/png", purpose: "maskable" },
            { src: 'maskable_icon_x128.png', sizes: "128x128", type: "image/png", purpose: "maskable" },
            { src: 'maskable_icon_x192.png', sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: 'maskable_icon_x384.png', sizes: "384x384", type: "image/png", purpose: "maskable" },
            { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' }
        ],
        shortcuts: [
          { name: 'New Note', short_name: 'New', description: 'Create a new note in Yotes', url: '/create', icons: [{ src: 'favicon-96x96.png', sizes: '96x96' }] },
          {
            name: "Settings",
            url: "/settings",
            description: "Open Yotes settings",
            icons: [{ src: 'favicon-96x96.png', sizes: '96x96' }]
          } 
        ],
        orientation: 'portrait-primary',
        launch_handler: {
          client_mode: 'navigate-existing'
        },
        note_taking: {
          new_note_url: '/create'
        },
        file_handlers: [
          {
            action: '/create',
            accept: {
              'text/markdown': ['.md'],
              'text/plain': ['.txt']
            }
          }
        ],
        screenshots: [
          {
            "src": "screenshot-desktop-1.png",
            "sizes": "1280x720",
            "type": "image/png",
            "form_factor": "wide",
            "label": "Desktop Notes View"
          },
          {
            "src": "screenshot-desktop-2.png",
            "sizes": "1280x720",
            "type": "image/png",
            "form_factor": "wide",
            "label": "Desktop Settings View"
          },
          {
            "src": "screenshot-mobile-1.png",
            "sizes": "540x720",
            "type": "image/png",
            "form_factor": "narrow",
            "label": "Mobile Notes View"
          },
          {
            "src": "screenshot-mobile-2.png",
            "sizes": "540x720",
            "type": "image/png",
            "form_factor": "narrow",
            "label": "Mobile Settings View"
          }
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
    })
  ],
  base: '/',
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['qrcode-generator'],
  },
});