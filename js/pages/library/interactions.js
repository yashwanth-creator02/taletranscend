import { resolveResumePoint } from '@services/index.js';

/* ==================== CARD NAVIGATION ==================== */

/**
 * Sets up click navigation for the entire tale card.
 * Clicking anywhere on a card (except buttons/menus) navigates to the tale page.
 */
export function setupNavigation() {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    // Ignore clicks on play/resume buttons or options menus
    if (
      e.target.closest('.play-btn') ||
      e.target.closest('[data-action="resume"]') ||
      e.target.closest('[data-action="options"]') ||
      e.target.closest('.options-menu')
    )
      return;

    const card = e.target.closest('.tale-card');
    if (!card) return;

    const id = card.dataset.id;
    window.location.href = `tale.html?id=${id}`;
  });
}

/* ==================== RESUME (PLAY BUTTON) ==================== */

/**
 * Handles "resume reading" clicks on play buttons.
 * Navigates to the appropriate chapter, based on the latest resume point.
 *
 * @param {string} userId - Current user ID
 */
export function jumptoReader(userId) {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const playBtn = e.target.closest('.play-btn') || e.target.closest('[data-action="resume"]');
    if (!playBtn) return;

    e.stopPropagation();

    const taleCard = playBtn.closest('.tale-card');
    if (!taleCard) return;

    const taleId = taleCard.dataset.id;
    const resume = resolveResumePoint({ userId, taleId });

    // If no resume point, start at chapter 0
    if (!resume) {
      window.location.href = `reader.html?taleId=${taleId}&chapterId=0`;
      return;
    }

    // Navigate to the last incomplete chapter
    window.location.href = `reader.html?taleId=${taleId}&chapterId=${resume.chapterIndex}`;
  });
}

/* ==================== OPTIONS MENU ==================== */

/**
 * Sets up toggle functionality for options menus on tale cards.
 * Handles opening, closing, and outside-click hiding.
 */
export function setupOptionsMenu() {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  // Toggle menu visibility on button click
  grid.addEventListener('click', (e) => {
    const optionsBtn = e.target.closest('[data-action="options"]');
    if (!optionsBtn) return;

    e.stopPropagation();

    const menuId = optionsBtn.dataset.menuId;

    // Hide all other menus
    document.querySelectorAll('.options-menu').forEach((menu) => {
      if (menu.id !== menuId) menu.classList.add('hidden');
    });

    // Toggle current menu
    const menu = document.getElementById(menuId);
    menu?.classList.toggle('hidden');
  });

  // Hide all menus on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.options-menu').forEach((menu) => menu.classList.add('hidden'));
  });
}

/* ==================== SEARCH ==================== */

/**
 * Sets up the search input for filtering tales in real-time.
 *
 * @param {Function} getAllTales - Returns array of all tales
 * @param {Function} onFilter - Callback to render filtered results
 * @param {Function} initIcons - Re-initialize icons after filtering
 */
export function setupSearch(getAllTales, onFilter, initIcons) {
  const input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('input', async (e) => {
    const term = e.target.value.toLowerCase();

    // Filter tales by title, description, or era
    const filtered = getAllTales().filter(
      (t) =>
        (t.title || '').toLowerCase().includes(term) ||
        (t.description || '').toLowerCase().includes(term) ||
        (t.era || '').toLowerCase().includes(term)
    );

    await onFilter(filtered);
    initIcons(); // Re-init icons for filtered cards
  });
}

/* ==================== SIDEBAR TOGGLE ==================== */

/**
 * Handles collapsing/expanding the sidebar in the UI.
 */
export function setupSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggle-sidebar');

  if (!sidebar || !toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}
