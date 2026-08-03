// src/pages/404/404.js
// Entry point for the 404 error page.

import '@css/base.css';
import { initIcons } from '@shared/icons.js';
import { initPageReveal, readyReveal } from '@/utils';

initPageReveal();

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  readyReveal();
});
