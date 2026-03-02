import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        id: '/',
        name: 'VZLAUNCHER',
        short_name: 'VZLAUNCHER',
        description: 'Virtual Zone Games Launcher',
        theme_color: '#E5007E',
        background_color: '#0A0A0A',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        // Only precache app shell — JS, CSS, HTML, and small icons
        globPatterns: ['**/*.{js,css,html}', 'icons/*.png'],
        runtimeCaching: [
          // Game images and brand assets — cache on first access
          {
            urlPattern: /\/assets\/(games|brand)\/.+\.(png|jpg|webp|svg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-assets-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache' },
          },
        ],
      },
    }),
  ],
})
