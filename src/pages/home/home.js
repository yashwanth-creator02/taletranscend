// src/pages/home/home.js

import '@css/base.css';
import '@css/components.css';
import '@css/pages/home.css';

import { initNav } from '@ui/components/nav.js';
import { initIcons } from '@ui/components/icons.js';

initNav();

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initHomeInteractions();
});

function initHomeInteractions() {
  document.getElementById('home-start-writing-btn')?.addEventListener('click', () => {
    window.location.href = 'contribution.html';
  });

  document.getElementById('newsletter-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
  });

  document.getElementById('home-search-btn')?.addEventListener('click', () => {
    const term = document.getElementById('home-search-input')?.value;
    if (term) window.location.href = `library.html?search=${encodeURIComponent(term)}`;
  });

  // Allow pressing Enter in search input
  document.getElementById('home-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const term = e.target.value;
      if (term) window.location.href = `library.html?search=${encodeURIComponent(term)}`;
    }
  });
}
