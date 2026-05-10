// src/ui/components/nav.js
// Shared navigation component injected into every page.
// Automatically highlights the active page based on the current URL.
// Call initNav() at the top of every page entry file.

import { auth } from '@fb/index.js';
import { onAuthStateChanged } from 'firebase/auth';

/* ==================== Nav Pages Config ==================== */

const NAV_LINKS = [
  { href: 'index.html', icon: 'home', label: 'Home' },
  { href: 'library.html', icon: 'library', label: 'Library' },
  { href: 'shelf.html', icon: 'bookmark', label: 'Shelf' },
  { href: 'contribution.html', icon: 'feather', label: 'Write' },
  { href: 'profile.html', icon: 'user', label: 'Profile' },
];

/* ==================== Active Page Detection ==================== */

/**
 * Returns the filename of the current page (e.g. 'library.html').
 *
 * @returns {string}
 */
function getCurrentPage() {
  const path = window.location.pathname;
  return path.split('/').pop() || 'index.html';
}

/* ==================== Nav Template ==================== */

/**
 * Builds the nav HTML string.
 * Highlights the current page link with an active style.
 *
 * @returns {string} HTML string for the nav
 */
function buildNav() {
  const current = getCurrentPage();

  const links = NAV_LINKS.map(({ href, icon, label }) => {
    const isActive = current === href;
    return `
      <a href="${href}"
        class="flex items-center gap-2 p-2 rounded-xl transition-all
          ${
            isActive
              ? 'text-indigo-400 bg-indigo-500/10'
              : 'text-slate-500 hover:text-white hover:bg-white/5'
          }">
        <i data-lucide="${icon}" class="w-4 h-4"></i>
        <span class="hidden md:block text-[10px] font-black uppercase tracking-widest">${label}</span>
      </a>
    `;
  }).join('');

  return `
    <header id="app-nav" class="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-zinc-800 shadow-sm">
      <nav class="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        <a href="index.html" class="flex items-center gap-2 group">
          <div class="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
            <i data-lucide="sparkles" class="w-4 h-4 text-white"></i>
          </div>
          <span class="font-bold text-white text-lg tracking-tight">TaleTranscend</span>
        </a>

        <div class="flex items-center gap-1" id="nav-links">
          ${links}
        </div>

        <div id="nav-user" class="flex items-center gap-3">
          <!-- Populated by auth state listener -->
          <div class="w-8 h-8 rounded-full bg-zinc-800 animate-pulse"></div>
        </div>
      </nav>
    </header>
  `;
}

/* ==================== Auth State in Nav ==================== */

/**
 * Updates the nav user area based on auth state.
 * Shows avatar placeholder when logged in, login prompt when not.
 *
 * @param {Object|null} user - Firebase user or null
 */
function updateNavUser(user) {
  const navUser = document.getElementById('nav-user');
  if (!navUser) return;

  if (user) {
    const seed = user.uid.slice(0, 8);
    navUser.innerHTML = `
      <a href="profile.html" class="flex items-center gap-2 group">
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}"
          alt="Profile"
          class="w-8 h-8 rounded-xl bg-zinc-800 border border-white/10 group-hover:border-indigo-500/50 transition-all"
        />
      </a>
    `;
  } else {
    navUser.innerHTML = `
      <a href="profile.html"
        class="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
        Sign In
      </a>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}

/* ==================== Init ==================== */

/**
 * Injects the shared nav into the page and wires up auth state.
 * Call this at the top of every page entry file before other init.
 */
export function initNav() {
  // Inject nav as the first child of body
  document.body.insertAdjacentHTML('afterbegin', buildNav());

  // Re-init icons for the newly injected nav
  if (window.lucide) window.lucide.createIcons();

  // Update nav user area when auth state is known
  onAuthStateChanged(auth, updateNavUser);
}
