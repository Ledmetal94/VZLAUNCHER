import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Clean old caches on activate
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // StaleWhileRevalidate for assets — serves cached but fetches update in background
            urlPattern: /\.(?:js|css|woff2?|svg|png|jpg|jpeg|webp|ico)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          {
            // Network-first for API calls
            urlPattern: /\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 min
              },
            },
          },
          {
            // Stale-while-revalidate for game thumbnails from Supabase Storage
            urlPattern: /supabase.*storage.*game-thumbnails/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'game-thumbnails',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
        ],
        // Offline fallback
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//],
        navigateFallbackAllowlist: [/^\/[^.]*$/],
      },
      manifest: {
        name: 'VZ Launcher — Arcade Management',
        short_name: 'VZ Launcher',
        description: 'Virtual Zone Arcade Launcher — gestione sessioni, gettoni e giochi per centri arcade.',
        theme_color: '#E6007E',
        background_color: '#0D0C1A',
        display: 'standalone',
        orientation: 'landscape',
        categories: ['entertainment', 'games', 'business'],
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Catalogo giochi',
            url: '/',
            icons: [{ src: '/favicon.svg', sizes: 'any' }],
          },
          {
            name: 'Storico sessioni',
            url: '/history',
            icons: [{ src: '/favicon.svg', sizes: 'any' }],
          },
          {
            name: 'Analisi',
            url: '/analytics',
            icons: [{ src: '/favicon.svg', sizes: 'any' }],
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
