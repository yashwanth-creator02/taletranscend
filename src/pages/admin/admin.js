// src/pages/admin/admin.js
// Entry point for the archive control room. Resolves custom-claim access,
// renders the shell, and lazily mounts one module per hash route.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/admin.css';

import { initNav } from '@ui/components/nav/nav.js';
import { initIcons } from '@ui/icons.js';
import { createLogger } from '@/utils';
import {
  canAccessModule,
  getAllowedModules,
  resolveDashboardAccess,
} from '@services/admin/access.service.js';
import { adminState, resetAdminState } from './admin.state.js';
import {
  buildAccessDenied,
  buildAccessLoading,
  buildAdminShell,
  buildDashboardHome,
  buildModuleError,
  buildModuleLoading,
} from './admin.templates.js';

const log = createLogger('AdminPage');

// Vite turns this into a lazy map of every file under ./modules/. Adding a
// module in Phase 3 needs no change to this file, and Phase 2 builds with an
// empty map instead of a broken static import.
const moduleLoaders = import.meta.glob('./modules/*.js');

/** @returns {string | null} */
function moduleFromHash() {
  const match = window.location.hash.match(/^#\/?([a-z][a-z0-9-]*)/i);
  return match?.[1] ?? null;
}

/** @param {string} html */
function paint(html) {
  const root = document.getElementById('admin-root');
  if (!root) return;
  root.innerHTML = html;
  initIcons();
}

/**
 * Mount one module into the content panel.
 * @param {string} moduleId
 * @param {HTMLElement} container
 */
async function mountModule(moduleId, container) {
  adminState.cleanup?.();
  adminState.cleanup = null;
  adminState.activeModule = moduleId;
  container.innerHTML = buildModuleLoading(moduleId);
  initIcons();

  const loader = moduleLoaders[`./modules/${moduleId}.js`];
  if (!loader) {
    container.innerHTML = buildModuleError(moduleId);
    initIcons();
    return;
  }

  try {
    const module = await loader();
    const mount = module.mount ?? module.default;
    if (typeof mount !== 'function') {
      throw new Error(`Module ${moduleId} does not export mount()`);
    }
    const cleanup = await mount({
      container,
      access: adminState.access,
      navigate: (id) => {
        window.location.hash = `#/${id}`;
      },
    });
    adminState.cleanup = typeof cleanup === 'function' ? cleanup : null;
    initIcons();
  } catch (err) {
    log.error(`Failed to mount admin module: ${moduleId}`, err);
    container.innerHTML = buildModuleError(moduleId);
    initIcons();
  }
}

/**
 * Render the shell for the current hash, or the dashboard home.
 * @param {boolean} [focusContent=false]
 */
async function renderRoute(focusContent = false) {
  if (!adminState.access?.canEnter) return;
  const modules = getAllowedModules(adminState.access);
  const requested = moduleFromHash();
  const active = requested && canAccessModule(adminState.access, requested) ? requested : null;
  const previousActive = adminState.activeModule;
  if (active !== previousActive) adminState.cleanup?.();
  adminState.cleanup = null;
  adminState.activeModule = active;

  paint(
    buildAdminShell({
      access: adminState.access,
      modules,
      activeModule: active,
    })
  );

  const content = document.getElementById('admin-content');
  if (!content) return;

  if (active) {
    await mountModule(active, content);
  } else {
    content.innerHTML = buildDashboardHome(adminState.access, modules);
    initIcons();
  }

  if (focusContent) content.focus({ preventScroll: true });
}

/** Boot the page. Safe to call twice; the second call is a no-op. */
export async function initAdminPage() {
  const root = document.getElementById('admin-root');
  if (!root || adminState.mounted) return;
  adminState.mounted = true;

  initNav();
  paint(buildAccessLoading());

  adminState.access = await resolveDashboardAccess();
  if (!adminState.access.canEnter) {
    paint(buildAccessDenied(adminState.access));
    return;
  }

  await renderRoute();

  window.addEventListener('hashchange', () => {
    renderRoute(true);
  });
}

/** Tear down listeners and module state. Used by tests. */
export function destroyAdminPage() {
  resetAdminState();
}

const canAutoBoot =
  typeof document !== 'undefined' && Boolean(document.getElementById('admin-root'));

if (canAutoBoot) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPage, { once: true });
  } else {
    initAdminPage();
  }
}
