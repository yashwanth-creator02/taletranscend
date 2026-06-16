/**
 * src/pages/profile/layout.js
 * Handles the visual layout, resizing, and modal accessibility for the profile page.
 */

export function initProfileLayout() {
  /* ── LocalStorage Panel Widths ── */
  const LEFT_MIN = 280;
  const LEFT_MAX = 500;
  const RIGHT_MIN = 280;
  const RIGHT_MAX = 500;

  const savedLeft = localStorage.getItem('profile_left_width');
  const savedRight = localStorage.getItem('profile_right_width');

  if (savedLeft) {
    document.documentElement.style.setProperty(
      '--left-panel-width',
      Math.max(LEFT_MIN, Math.min(LEFT_MAX, parseInt(savedLeft))) + 'px'
    );
  }
  if (savedRight) {
    document.documentElement.style.setProperty(
      '--right-panel-width',
      Math.max(RIGHT_MIN, Math.min(RIGHT_MAX, parseInt(savedRight))) + 'px'
    );
  }

  /* ── Resize Handles ── */
  const handles = document.querySelectorAll('.resize-handle');
  let activeHandle = null;
  let startX = 0;
  let startWidth = 0;

  function onMouseDown(e, side) {
    activeHandle = side;
    const touch = e.touches && e.touches[0];
    startX = touch ? touch.clientX : e.clientX;

    const prop = side === 'left' ? '--left-panel-width' : '--right-panel-width';
    const style = getComputedStyle(document.documentElement);
    startWidth = parseInt(style.getPropertyValue(prop)) || 320;

    document.body.classList.add('resizing');

    if (e.cancelable !== false) e.preventDefault();
    e.stopPropagation();
  }

  function onMouseMove(e) {
    if (!activeHandle) return;

    const touch = e.touches && e.touches[0];
    const clientX = touch ? touch.clientX : e.clientX;
    if (clientX === undefined) return;

    const delta = clientX - startX;
    const prop = activeHandle === 'left' ? '--left-panel-width' : '--right-panel-width';
    const min = activeHandle === 'left' ? LEFT_MIN : RIGHT_MIN;
    const max = activeHandle === 'left' ? LEFT_MAX : RIGHT_MAX;

    let newWidth;
    if (activeHandle === 'left') {
      newWidth = startWidth + delta;
    } else {
      newWidth = startWidth - delta;
    }

    newWidth = Math.max(min, Math.min(max, newWidth));
    document.documentElement.style.setProperty(prop, newWidth + 'px');
  }

  function onMouseUp() {
    if (!activeHandle) return;
    const prop = activeHandle === 'left' ? '--left-panel-width' : '--right-panel-width';
    const val = parseInt(getComputedStyle(document.documentElement).getPropertyValue(prop));
    if (!isNaN(val)) {
      localStorage.setItem('profile_' + activeHandle + '_width', val);
    }
    activeHandle = null;
    document.body.classList.remove('resizing');
  }

  handles.forEach((handle) => {
    const side = handle.dataset.resize;
    handle.addEventListener('mousedown', (e) => onMouseDown(e, side));
    handle.addEventListener('touchstart', (e) => onMouseDown(e, side), {
      passive: false,
    });
  });

  window.addEventListener('mousemove', onMouseMove, { capture: true });
  window.addEventListener('touchmove', onMouseMove, { passive: false, capture: true });
  window.addEventListener('mouseup', onMouseUp, { capture: true });
  window.addEventListener('touchend', onMouseUp, { capture: true });

  /* Keyboard resize support */
  handles.forEach((handle) => {
    handle.addEventListener('keydown', (e) => {
      const side = handle.dataset.resize;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const prop = side === 'left' ? '--left-panel-width' : '--right-panel-width';
      const current =
        parseInt(getComputedStyle(document.documentElement).getPropertyValue(prop)) || 320;
      const step = 20;
      let newWidth = current;

      if (side === 'left') {
        newWidth = e.key === 'ArrowRight' ? current + step : current - step;
      } else {
        newWidth = e.key === 'ArrowLeft' ? current + step : current - step;
      }

      const min = side === 'left' ? LEFT_MIN : RIGHT_MIN;
      const max = side === 'left' ? LEFT_MAX : RIGHT_MAX;
      newWidth = Math.max(min, Math.min(max, newWidth));

      document.documentElement.style.setProperty(prop, newWidth + 'px');
      localStorage.setItem('profile_' + side + '_width', newWidth);
      e.preventDefault();
    });
  });

  /* ── Modal Accessibility ── */
  const modal = document.getElementById('edit-modal');
  const modalCancelBtn = document.getElementById('btn-cancel-modal');

  if (modal) {
    /* Focus trap */
    function getFocusables() {
      return Array.from(
        modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.disabled && el.offsetParent !== null);
    }

    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    });

    /* Close on Escape */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        modalCancelBtn?.click();
      }
    });

    /* Close on backdrop click */
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modalCancelBtn?.click();
      }
    });
  }

  /* ── Reading Goal Bar CSS Variable Bridge ── */
  const goalBar = document.getElementById('reading-goal-bar');
  if (goalBar) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type === 'attributes' && m.attributeName === 'style') {
          const width = goalBar.style.width;
          if (width && !width.includes('calc')) {
            const num = parseFloat(width);
            if (!isNaN(num)) {
              goalBar.style.setProperty('--progress', num / 100);
            }
          }
        }
      });
    });
    observer.observe(goalBar, { attributes: true });
  }

  /* ── Tab Trigger Enhancement ── */
  function enhanceInactiveTabs() {
    document.querySelectorAll('.tab-trigger:not(.tab-trigger--active)').forEach((el) => {
      el.classList.add('tab-trigger--inactive');
    });
    document.querySelectorAll('.tab-trigger--active').forEach((el) => {
      el.classList.remove('tab-trigger--inactive');
    });
  }
  enhanceInactiveTabs();

  const tabNavs = document.querySelectorAll('.tab-nav');
  tabNavs.forEach((nav) => {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-trigger');
      if (!btn) return;
      nav.querySelectorAll('.tab-trigger').forEach((t) => {
        t.classList.remove('tab-trigger--active');
        t.classList.add('tab-trigger--inactive');
      });
      btn.classList.remove('tab-trigger--inactive');
      btn.classList.add('tab-trigger--active');
    });
  });

  /* ── Genre Chip Enhancement ── */
  const genreSelector = document.getElementById('genre-selector');
  if (genreSelector) {
    genreSelector.addEventListener('click', (e) => {
      const chip = e.target.closest('button, .genre-chip');
      if (!chip) return;
      chip.classList.toggle('active');
    });
  }
}
