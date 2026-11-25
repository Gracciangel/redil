import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' = la app avisa cuando hay una versión nueva y el usuario decide actualizar.
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Redil — Gestión de congregación',
        short_name: 'Redil',
        description:
          'Organiza miembros, eventos y avisos de tu congregación. Funciona sin conexión y se instala como app.',
        lang: 'es',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        // Coincide con el fondo real de la app (#000) para que la barra de
        // estado y el splash de iOS no corten con un violeta ajeno al layout.
        theme_color: '#000000',
        background_color: '#000000',
        categories: ['productivity', 'lifestyle'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Miembros',
            short_name: 'Miembros',
            description: 'Ver y gestionar los miembros',
            url: '/miembros',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Eventos',
            short_name: 'Eventos',
            description: 'Ver la agenda de la congregación',
            url: '/eventos',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Avisos',
            short_name: 'Avisos',
            description: 'Leer los avisos publicados',
            url: '/avisos',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Precachea todo el shell de la app: carga instantánea y offline desde la primera visita.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        // El logo fuente no se usa en tiempo de ejecución: fuera del precache.
        globIgnores: ['**/icons/redil-logo.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Biblia: un JSON por libro. Se baja una vez y queda offline; el
            // índice tampoco entra en el precache porque globPatterns excluye .json.
            urlPattern: ({ url }) => url.pathname.startsWith('/biblia/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'redil-biblia',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // API propia: red primero, con caché de respaldo cuando no hay conexión.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'redil-api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // El service worker solo se activa en producción por defecto.
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
})
