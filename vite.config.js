// vite.config.js

import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@fb': path.resolve(__dirname, './src/firebase'),
      '@services': path.resolve(__dirname, './src/services'),
      '@state': path.resolve(__dirname, './src/state'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@config': path.resolve(__dirname, './src/config'),
      '@css': path.resolve(__dirname, './src/assets/css'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'src/views/index.html'),
        library: path.resolve(__dirname, 'src/views/library.html'),
        shelf: path.resolve(__dirname, 'src/views/shelf.html'),
        reader: path.resolve(__dirname, 'src/views/reader.html'),
        tale: path.resolve(__dirname, 'src/views/tale.html'),
        contribution: path.resolve(__dirname, 'src/views/contribution.html'),
        profile: path.resolve(__dirname, 'src/views/profile.html'),
      },
    },
  },
  server: {
    open: '/src/views/library.html',
  },
  plugins: [
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
      },
      workbox: {
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
