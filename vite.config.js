// vite.config.js
//
// TaleTranscend is a multi-page app: nine independent HTML entry points that
// share a module graph. Two things in this file exist specifically to make
// that work correctly, and both were wrong before:
//
//  1. `root` is set to src/views. Without it, Vite mirrors the source tree
//     into the output, producing dist/src/views/library.html. Every rewrite
//     in firebase.json points at /library.html, so the deployed site served
//     404s for every route except the one Firebase happened to find. Setting
//     the root flattens the output to dist/library.html and makes the dev
//     server URLs identical to the production ones.
//
//  2. `rollupOptions.input` was nested inside itself — `input: { input: {…} }`.
//     Rollup read that as a single entry named "input" whose value was an
//     object, so the multi-page build silently collapsed.

import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const r = (p) => path.resolve(__dirname, p);

/** The nine entry points. Adding a page means adding one line here. */
const PAGES = [
  'index',
  'library',
  'shelf',
  'reader',
  'tale',
  'contribution',
  'profile',
  'login',
  '404',
];

export default defineConfig({
  root: r('src/views'),
  publicDir: r('public'),
  envDir: __dirname,

  resolve: {
    alias: {
      '/pages': r('src/pages'),
      '@fb': r('src/firebase'),
      '@services': r('src/services'),
      '@state': r('src/state'),
      '@ui': r('src/ui'),
      '@pages': r('src/pages'),
      '@config': r('src/config'),
      '@css': r('src/assets/css'),
      '@': r('src'),
    },
  },

  server: {
    port: 5173,
    open: '/',
    // Entry HTML lives in src/views but imports from src/pages, which is
    // outside the Vite root. Without this the dev server refuses to serve
    // anything above the root directory.
    fs: { allow: [__dirname] },
  },

  build: {
    outDir: r('dist'),
    emptyOutDir: true,
    // Firebase Hosting fingerprints nothing itself, so hashed filenames are
    // what makes the immutable cache headers in firebase.json safe.
    assetsDir: 'assets',
    sourcemap: true,
    // Baseline 2023 — covers every browser that supports the CSS Color 4
    // `rgb(R G B / A)` syntax the token system is built on. Anything older
    // would render the entire app colourless, so there is no point shipping
    // JS it can run.
    target: 'es2022',
    cssTarget: 'chrome111',
    rollupOptions: {
      input: Object.fromEntries(PAGES.map((p) => [p, r(`src/views/${p}.html`)])),
      output: {
        // Firebase is ~450 KB and changes on a different cadence to app
        // code. Splitting it means a copy deploy does not invalidate the
        // largest chunk in the bundle for every returning visitor.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
          if (id.includes('lucide')) return 'vendor-icons';
          if (id.includes('zod') || id.includes('dompurify') || id.includes('idb')) {
            return 'vendor-core';
          }
          return 'vendor';
        },
      },
    },
  },

  plugins: [
    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'TaleTranscend — The Eternal Archive of Myth & Memory',
        short_name: 'TaleTranscend',
        description: 'Read, write and preserve folklore, myth and oral tradition.',
        theme_color: '#030305',
        background_color: '#030305',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        categories: ['books', 'education', 'entertainment'],
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The reader is the one screen that must work offline, and its
        // chunk graph is the largest in the app. The default 2 MB ceiling
        // silently drops files above it from the precache manifest.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/__/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'avatars',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // NetworkFirst, not CacheFirst: a stale tale is worse than a
            // slow one, and Firestore's own SDK cache already covers the
            // genuinely offline case.
            urlPattern: /^https:\/\/firestore\.googleapis\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),

    // Opt-in only. It was writing stats.html into the project root on every
    // single build, including CI.
    process.env.ANALYZE === 'true' &&
      visualizer({
        filename: r('dist/stats.html'),
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
  ].filter(Boolean),
});
