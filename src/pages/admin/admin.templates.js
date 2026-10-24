// src/pages/admin/admin.templates.js
// Pure HTML string builders for the admin shell. No DOM reads and no side
// effects, so every state can be unit tested without a browser.

import { escapeHtml } from '@/utils';
import { roleLabel } from '@services/admin/access.service.js';
import { adminInitials, adminModuleDescription } from './admin.utils.js';

/**
 * @typedef {{
 *   role: 'guest' | 'user' | 'author' | 'moderator' | 'admin',
 *   isAdmin: boolean,
 *   isModerator: boolean,
 *   isAuthor: boolean,
 *   isStaff: boolean,
 *   canEnter: boolean
 * }} AdminAccess
 */

/**
 * @param {{ access: AdminAccess, modules: Array<{id: string, label: string, icon: string}>, activeModule: string | null }} options
 * @returns {string}
 */
export function buildAdminShell({ access, modules, activeModule }) {
  const navItems = modules
    .map(
      (module) => `
        <a
          class="admin-nav__link${activeModule === module.id ? ' admin-nav__link--active' : ''}"
          href="#/${escapeHtml(module.id)}"
          data-admin-module="${escapeHtml(module.id)}"
          ${activeModule === module.id ? 'aria-current="page"' : ''}
        >
          <i data-lucide="${escapeHtml(module.icon)}" class="admin-nav__icon" aria-hidden="true"></i>
          <span>${escapeHtml(module.label)}</span>
        </a>
      `
    )
    .join('');

  return `
    <div class="admin-shell">
      <aside class="admin-sidebar" aria-label="Dashboard sections">
        <div class="admin-identity">
          <span class="admin-identity__mark" aria-hidden="true">${escapeHtml(
            adminInitials(roleLabel(access.role))
          )}</span>
          <div class="admin-identity__copy">
            <p class="admin-identity__label">Signed in as</p>
            <p class="admin-identity__role">${escapeHtml(roleLabel(access.role))}</p>
          </div>
        </div>
        <nav class="admin-nav" aria-label="Administration modules">
          <a
            class="admin-nav__link${activeModule === null ? ' admin-nav__link--active' : ''}"
            href="#/"
            data-admin-module="home"
            ${activeModule === null ? 'aria-current="page"' : ''}
          >
            <i data-lucide="home" class="admin-nav__icon" aria-hidden="true"></i>
            <span>Dashboard</span>
          </a>
          ${navItems}
        </nav>
        <p class="admin-sidebar__note">
          Firestore rules re-check every privileged read and write. The UI only
          narrows what is already permitted.
        </p>
      </aside>

      <div class="admin-main">
        <header class="admin-topbar">
          <div class="admin-topbar__group">
            <a href="index.html" class="btn btn-ghost admin-topbar__back" aria-label="Return to archive">
              <i data-lucide="arrow-left" aria-hidden="true"></i>
              <span>Back to archive</span>
            </a>
            <div>
              <p class="admin-kicker">TaleTranscend</p>
              <h1 class="admin-topbar__title">Archive control room</h1>
            </div>
          </div>
          <span class="admin-role-shield" data-role="${escapeHtml(access.role)}">
            <i data-lucide="shield-check" class="admin-role-shield__icon" aria-hidden="true"></i>
            ${escapeHtml(roleLabel(access.role))}
          </span>
        </header>

        <main id="admin-content" class="admin-content" tabindex="-1"></main>
      </div>
    </div>
  `;
}

/**
 * Landing view shown before a module is selected.
 * @param {AdminAccess} access
 * @param {Array<{id: string, label: string, icon: string}>} modules
 * @returns {string}
 */
export function buildDashboardHome(access, modules) {
  const cards = modules
    .map(
      (module) => `
        <a class="admin-module-card" href="#/${escapeHtml(module.id)}">
          <span class="admin-module-card__icon-wrap" aria-hidden="true">
            <i data-lucide="${escapeHtml(module.icon)}" class="admin-module-card__icon"></i>
          </span>
          <span class="admin-module-card__body">
            <span class="admin-module-card__title">${escapeHtml(module.label)}</span>
            <span class="admin-module-card__desc">${escapeHtml(
              adminModuleDescription(module.id)
            )}</span>
          </span>
          <i data-lucide="arrow-right" class="admin-module-card__arrow" aria-hidden="true"></i>
        </a>
      `
    )
    .join('');

  return `
    <section class="admin-home" aria-labelledby="admin-home-title">
      <div class="admin-home__intro">
        <p class="admin-kicker">${escapeHtml(roleLabel(access.role))} access</p>
        <h2 id="admin-home-title" class="admin-home__title">What the archive needs today</h2>
        <p class="admin-home__lede">
          Choose a section. Lists are cursor-paginated, and every staff action
          is written to the audit trail.
        </p>
      </div>
      <div class="admin-card-grid">${cards}</div>
    </section>
  `;
}

/**
 * Boot state while custom claims resolve.
 * @returns {string}
 */
export function buildAccessLoading() {
  return `
    <div class="admin-boot" role="status" aria-live="polite">
      <span class="admin-boot__mark" aria-hidden="true">TT</span>
      <p>Checking archive credentials...</p>
    </div>
  `;
}

/**
 * Denial state for guests and ordinary readers.
 * @param {{role: string}} access
 * @returns {string}
 */
export function buildAccessDenied(access) {
  const isGuest = access.role === 'guest';
  const action = isGuest
    ? '<a class="btn btn-primary" href="login.html">Sign in</a>'
    : '<a class="btn btn-primary" href="index.html">Return to the archive</a>';

  return `
    <section class="admin-denied" aria-labelledby="admin-denied-title">
      <span class="admin-denied__icon-wrap" aria-hidden="true">
        <i data-lucide="shield-off"></i>
      </span>
      <p class="admin-kicker">Restricted archive</p>
      <h1 id="admin-denied-title" class="admin-denied__title">
        ${isGuest ? 'Sign in to enter the control room' : 'This room is not open to your role'}
      </h1>
      <p class="admin-denied__body">
        ${
          isGuest
            ? 'The archive control room is available to chroniclers and archive staff.'
            : 'Dashboard access follows Firebase Auth custom claims. Your profile role label is not authority.'
        }
      </p>
      <div class="admin-denied__actions">
        ${action}
        <a class="btn btn-ghost" href="profile.html">Open profile</a>
      </div>
      <p class="admin-denied__footnote">Error code: admin-access-${escapeHtml(access.role)}</p>
    </section>
  `;
}

/**
 * Loading state while a module chunk is fetched.
 * @param {string} moduleId
 * @returns {string}
 */
export function buildModuleLoading(moduleId) {
  return `
    <div class="admin-module-loading" role="status" aria-live="polite">
      <span class="admin-module-loading__line"></span>
      <p>Loading ${escapeHtml(moduleId)}...</p>
    </div>
  `;
}

/**
 * Error state when a module fails to load. Never leaves a blank panel.
 * @param {string} moduleId
 * @returns {string}
 */
export function buildModuleError(moduleId) {
  return `
    <section class="admin-module-error" role="alert">
      <p class="admin-kicker">Module unavailable</p>
      <h2 class="admin-module-error__title">${escapeHtml(moduleId)} could not be opened</h2>
      <p class="admin-module-error__body">
        The section failed to load. Refresh the page or return to the dashboard
        home. No action was taken.
      </p>
      <a class="btn btn-ghost" href="#/">Return to dashboard home</a>
    </section>
  `;
}

/**
 * Denial state for a hash route that is unknown or unavailable to the role.
 * The same copy covers both cases so the shell does not reveal which modules
 * exist to an account that cannot open them.
 *
 * @param {{moduleId: string | null, role: string}} options
 * @returns {string}
 */
export function buildRouteDenied({ moduleId, role }) {
  const route = moduleId ? `#/${moduleId}` : 'the requested route';
  return `
    <section class="admin-module-error" role="alert">
      <p class="admin-kicker">Route unavailable</p>
      <h2 class="admin-module-error__title">This section is not available to your role</h2>
      <p class="admin-module-error__body">
        The dashboard section <code>${escapeHtml(route)}</code> could not be opened with your
        current access. It may not exist, or it may require a different archive role.
        No data was loaded.
      </p>
      <p class="admin-note">Signed in as ${escapeHtml(roleLabel(role))}.</p>
      <a class="btn btn-ghost" href="#/">Return to dashboard home</a>
    </section>
  `;
}

/**
 * Empty-state block shared by module tables.
 * @param {{title: string, body: string, icon?: string}} options
 * @returns {string}
 */
export function buildAdminEmptyState({ title, body, icon = 'inbox' }) {
  return `
    <div class="admin-empty">
      <i data-lucide="${escapeHtml(icon)}" class="admin-empty__icon" aria-hidden="true"></i>
      <p class="admin-empty__title">${escapeHtml(title)}</p>
      <p class="admin-empty__body">${escapeHtml(body)}</p>
    </div>
  `;
}
