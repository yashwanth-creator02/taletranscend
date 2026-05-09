// src/pages/home/home.js
// Entry point for the home page.
// Handles icon initialization and home page interactions.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/home.css';

import { initIcons } from '@ui/components/icons.js';

/* ==================== Icons ==================== */
// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initHomeInteractions();
});

/* ==================== Interactions ==================== */

/**
 * Binds all home page button and form interactions.
 */
function initHomeInteractions() {
  // Start writing button navigates to contribution page
  document.getElementById('home-start-writing-btn')?.addEventListener('click', () => {
    window.location.href = 'contribution.html';
  });

  // Newsletter form submission placeholder
  document.getElementById('newsletter-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    // Newsletter logic to be implemented
  });

  // Home search button placeholder
  document.getElementById('home-search-btn')?.addEventListener('click', () => {
    const term = document.getElementById('home-search-input')?.value;
    if (term) window.location.href = `library.html?search=${encodeURIComponent(term)}`;
  });
}
