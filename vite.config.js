// vite.config.js

import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig({
  resolve: {
    alias: {
      // Direct access to your major folders
      '@core': path.resolve(__dirname, './js/core'),
      '@services': path.resolve(__dirname, './js/core/services'),
      '@ui': path.resolve(__dirname, './js/ui'),
      '@pages': path.resolve(__dirname, './js/pages'),
      '@config': path.resolve(__dirname, './config'),
      '@css': path.resolve(__dirname, './css'),

      // The general shortcut for anything in js
      '@': path.resolve(__dirname, './js'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        library: path.resolve(__dirname, 'pages/library.html'),
        shelf: path.resolve(__dirname, 'pages/shelf.html'),
        reader: path.resolve(__dirname, 'pages/reader.html'),
        tale: path.resolve(__dirname, 'pages/tale.html'),
        contribution: path.resolve(__dirname, 'pages/contribution.html'),
        profile: path.resolve(__dirname, 'pages/profile.html'),
        index: path.resolve(__dirname, 'pages/index.html'),
      },
    },
  },
  server: {
    // Since your HTML files are in /pages/, this will open the landing page
    open: '/pages/library.html',
  },
  plugins: [tailwindcss()],
});
