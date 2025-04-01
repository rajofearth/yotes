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
        ],
        cleanupOutdatedCaches: true,
      },

      // --- Development Options ---
      devOptions: {
         // *** DISABLE PWA IN DEV SERVER ***
         enabled: false,
      },

      // --- Web App Manifest ---
      manifest: {
        name: 'Yotes',
        short_name: 'Yotes',
        description: 'Privacy-first notes app integrated with Google Drive.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1B1B1B',
        background_color: '#1B1B1B',
        icons: [
            { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: 'maskable_icon_x48.png', sizes: "48x48", type: "image/png", purpose: "maskable" },
            { src: 'maskable_icon_x72.png', sizes: "72x72", type: "image/png", purpose: "maskable" },
            { src: 'maskable_icon_x96.png', sizes: "96x96", type: "image/png", purpose: "maskable" },
            { src: 'maskable_icon_x128.png', sizes: "128x128", type: "image/png", purpose: "maskable" },
            { src: 'maskable_icon_x192.png', sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: 'maskable_icon_x384.png', sizes: "384x384", type: "image/png", purpose: "maskable" },
            { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' }
        ],
        shortcuts: [
          { name: 'New Note', short_name: 'New', description: 'Create a new note in Yotes', url: '/create', icons: [{ src: 'favicon-32x32.png', sizes: '32x32' }] },
          { name: "Settings", url: "/settings", description: "Open Yotes settings" }
        ],
        orientation: 'portrait-primary',
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
    })
  ],
  base: '/',
  server: {
    port: 3000,
    // Optional: Clear browser cache for the server host if issues persist
    // fs: {
    //   strict: false, // Allow serving outside of workspace root sometimes helps
    // }
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