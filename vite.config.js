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

      '@fb': path.resolve(__dirname, './src/firebase'),
      '@services': path.resolve(__dirname, './src/services'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@config': path.resolve(__dirname, './src/config'),
      '@css': path.resolve(__dirname, './src/assets/css'),
      '@core': path.resolve(__dirname, './js/core'),

      // The general shortcut for anything in src
      '@': path.resolve(__dirname, './src'),
    },
  },
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
  plugins: [tailwindcss()],
});
