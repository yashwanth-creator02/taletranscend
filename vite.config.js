// vite.config.js

import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import { htmlIncludes } from './vite-html-includes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@fb': path.resolve(__dirname, './src/firebase'),
      '@services': path.resolve(__dirname, './src/services'),
      '@state': path.resolve(__dirname, './src/state'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
      '@config': path.resolve(__dirname, './src/config'),
      '@css': path.resolve(__dirname, './src/assets/css'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/views/index.html'),
        library: path.resolve(__dirname, 'src/views/library.html'),
        shelf: path.resolve(__dirname, 'src/views/shelf.html'),
        reader: path.resolve(__dirname, 'src/views/reader.html'),
        tale: path.resolve(__dirname, 'src/views/tale.html'),
        contribution: path.resolve(__dirname, 'src/views/contribution.html'),
        profile: path.resolve(__dirname, 'src/views/profile.html'),
        login: path.resolve(__dirname, 'src/views/login.html'),
        404: path.resolve(__dirname, 'src/views/404.html'),
      },
    },
  },
  server: {
    open: '/src/views/library.html',
  },
  plugins: [
    htmlIncludes({ root: path.resolve(__dirname, 'src/views') }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'TaleTranscend',
        short_name: 'TaleTranscend',
        description: 'The Eternal Archive of Myth & Memory',
        theme_color: '#030305',
        background_color: '#030305',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache DiceBear avatars
            urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'avatars-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            // Firestore API caching for offline access to data
            urlPattern: /^https:\/\/firestore\.googleapis\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-api',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Image caching (covers, etc.)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
    visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
      template: 'treemap',
    }),
  ],
});
