import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/adhd/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // По умолчанию SW кэширует js/css/html/png/svg, но НЕ шрифты.
        // Добавляем woff2, чтобы локальный Inter попал в офлайн-кэш.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },      
      manifest: {
        name: 'ADHD-планировщик',
        short_name: 'ADHD',
        description: 'Планировщик дня для людей с СДВГ',
        lang: 'ru',
        theme_color: '#0c0f14',
        background_color: '#0c0f14',
        display: 'standalone',
        display_override: ['standalone'],
        edge_to_edge: true,
        start_url: '/adhd/',
        scope: '/adhd/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
