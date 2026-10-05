// src/ui/components/scrollToTop.js
// Shared scroll-to-top button component for every page in TaleTranscend.
// Appears on scroll (>120px) and smoothly returns user to the very top.

import { initIcons } from './icons.js';
import { createLogger } from '@/utils';

const log = createLogger('ScrollToTop');

let _bound = false;
let _activeBtn = null;

/**
 * Initializes or mounts the scroll-to-top arrow button.
 * Safe and idempotent — can be called on page load and during soft navigation.
 */
export function initScrollToTop() {
  if (typeof document === 'undefined') return;

  let btn = document.getElementById('scroll-to-top');

  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'scroll-to-top';
    btn.className = 'scroll-to-top group';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.setAttribute('title', 'Scroll to top');
    btn.innerHTML = `
      <i
        data-lucide="arrow-up"
        class="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-y-0.5 transition-transform text-indigo-300 group-hover:text-white"
      ></i>
    `;
    document.body.appendChild(btn);
    initIcons(btn);
    log.debug('Created and mounted scroll-to-top button');
  } else {
    // If existing button has a different icon (e.g. chevron-up), update to arrow-up
    const icon = btn.querySelector('i[data-lucide]');
    if (icon && icon.getAttribute('data-lucide') !== 'arrow-up') {
      icon.setAttribute('data-lucide', 'arrow-up');
      initIcons(btn);
    }
  }

  _activeBtn = btn;

  const onScroll = () => {
    if (!_activeBtn) return;
    const main = document.getElementById('main-content');
    const scroller = document.getElementById('scroller');
    const libraryMain = document.getElementById('library-main');

    const scrollY = Math.max(
      window.scrollY || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0,
      main?.scrollTop || 0,
      scroller?.scrollTop || 0,
      libraryMain?.scrollTop || 0
    );

    const show = scrollY > 120;
    _activeBtn.classList.toggle('is-visible', show);
    _activeBtn.classList.toggle('opacity-100', show);
    _activeBtn.classList.toggle('pointer-events-auto', show);
    _activeBtn.classList.toggle('translate-y-0', show);
    _activeBtn.classList.toggle('opacity-0', !show);
    _activeBtn.classList.toggle('pointer-events-none', !show);
    _activeBtn.classList.toggle('translate-y-3', !show);
  };

  const scrollToTop = () => {
    log.info('Scrolling to top');
    const main = document.getElementById('main-content');
    const scroller = document.getElementById('scroller');
    const libraryMain = document.getElementById('library-main');

    if (main && typeof main.scrollTo === 'function' && main.scrollTop > 0) {
      main.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (scroller && typeof scroller.scrollTo === 'function' && scroller.scrollTop > 0) {
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (libraryMain && typeof libraryMain.scrollTo === 'function' && libraryMain.scrollTop > 0) {
      libraryMain.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (document.documentElement && typeof document.documentElement.scrollTo === 'function') {
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (document.body && typeof document.body.scrollTo === 'function') {
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Only bind click and scroll listeners once per session
  if (!_bound) {
    window.addEventListener('scroll', onScroll, { passive: true });
    _bound = true;
  }

  // Bind to dynamic container elements (in case of soft navigation or custom scrolling containers)
  const main = document.getElementById('main-content');
  if (main && !main._hasScrollToTopListener) {
    main.addEventListener('scroll', onScroll, { passive: true });
    main._hasScrollToTopListener = true;
  }

  const scroller = document.getElementById('scroller');
  if (scroller && !scroller._hasScrollToTopListener) {
    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller._hasScrollToTopListener = true;
  }

  const libraryMain = document.getElementById('library-main');
  if (libraryMain && !libraryMain._hasScrollToTopListener) {
    libraryMain.addEventListener('scroll', onScroll, { passive: true });
    libraryMain._hasScrollToTopListener = true;
  }

  if (btn && !btn._hasClickListener) {
    btn.addEventListener('click', scrollToTop);
    btn._hasClickListener = true;
  }

  onScroll();
}
