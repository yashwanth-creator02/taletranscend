import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

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
  server: {
    // Since your HTML files are in /pages/, this will open the landing page
    open: '/pages/index.html',
  },
});
