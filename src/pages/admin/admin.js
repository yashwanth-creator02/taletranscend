// src/pages/admin/admin.js
// Entry point for the archive control room. Resolves custom-claim access,
// renders the shell, and lazily mounts one module per hash route.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/admin.css';

import { initIcons } from '@ui/icons.js';
import { createLogger } from '@/utils';
import { initAuth } from '@fb/index.js';
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

// A stalled auth restore must not leave the control room on its loading screen
// forever. The fallback resolves as a guest, which lands on the access gate.
const AUTH_BOOT_TIMEOUT_MS = 15000;

// Vite turns this into a lazy map of every module entry file. Test files live
// one directory deeper (modules/<id>/__tests__/) and are deliberately excluded.
const moduleLoaders = import.meta.glob('./modules/*/*.js');

/** @type {null | (() => void)} */
let hashHandler = null;
/** @type {null | MutationObserver} */
let iconObserver = null;
/** @type {number} */
let iconFrame = 0;
let routeVersion = 0;

/**
 * Modules render asynchronously after mount, so icon placeholders added later
 * would otherwise stay empty. Watch the content region for new placeholders
 * only: Lucide replaces placeholders with SVG, so observing every mutation
 * would re-enter this callback forever and starve the page.
 * @param {HTMLElement} root
 */
function observeIcons(root) {
  iconObserver?.disconnect();
  iconObserver = new MutationObserver((records) => {
    const hasPlaceholder = records.some((record) =>
      [...record.addedNodes].some(
        (node) =>
          node instanceof Element &&
          (node.matches('[data-lucide]:not(svg)') || node.querySelector('[data-lucide]:not(svg)'))
      )
    );
    if (!hasPlaceholder || iconFrame) return;

    iconFrame = window.requestAnimationFrame(() => {
      iconFrame = 0;
      if (adminState.mounted) initIcons(root);
    });
  });
  iconObserver.observe(root, { childList: true, subtree: true });
}

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
 * @param {number} version
 */
async function mountModule(moduleId, container, version) {
  adminState.activeModule = moduleId;
  container.innerHTML = buildModuleLoading(moduleId);
  initIcons();

  // Try subdirectory pattern first (e.g. ./modules/users/users.js), then flat pattern.
  const loader =
    moduleLoaders[`./modules/${moduleId}/${moduleId}.js`] ||
    moduleLoaders[`./modules/${moduleId}.js`];
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
    if (version !== routeVersion) {
      if (typeof cleanup === 'function') cleanup();
      return;
    }
    adminState.cleanup = typeof cleanup === 'function' ? cleanup : null;
    initIcons();
  } catch (err) {
    log.error(`Failed to mount admin module: ${moduleId}`, err);
    if (version === routeVersion) {
      container.innerHTML = buildModuleError(moduleId);
      initIcons();
    }
  }
}

/**
 * Render the shell for the current hash, or the dashboard home.
 * @param {boolean} [focusContent=false]
 */
async function renderRoute(focusContent = false) {
  if (!adminState.access?.canEnter) return;
  const version = ++routeVersion;
  const modules = getAllowedModules(adminState.access);
  const requested = moduleFromHash();
  const active = requested && canAccessModule(adminState.access, requested) ? requested : null;
  adminState.cleanup?.();
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
  observeIcons(content);

  if (active) {
    await mountModule(active, content, version);
  } else {
    content.innerHTML = buildDashboardHome(adminState.access, modules);
    initIcons();
  }

  if (focusContent) {
    content.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Boot the page. Safe to call twice; the second call is a no-op.
 * Restores the Firebase session first (every other page does this), so the
 * admin claim is present in the user's token before access is resolved.
 */
export async function initAdminPage() {
  const root = document.getElementById('admin-root');
  if (!root || adminState.mounted) return;
  adminState.mounted = true;

  paint(buildAccessLoading());

  // Restore the Firebase session first, so the user session is set.
  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      log.warn('Auth restore timed out; resolving access as a guest');
      finish();
    }, AUTH_BOOT_TIMEOUT_MS);

    try {
      initAuth(finish);
    } catch (err) {
      log.error('Auth restore failed to start', err);
      finish();
    }
  });

  // The page may have been torn down while auth was restoring.
  if (!adminState.mounted) return;

  // Note: No global nav requested — control room uses its own back button.

  adminState.access = await resolveDashboardAccess();
  if (!adminState.mounted) return;
  if (!adminState.access.canEnter) {
    paint(buildAccessDenied(adminState.access));
    return;
  }

  await renderRoute();

  if (!hashHandler) {
    hashHandler = () => {
      renderRoute(true).catch((err) => {
        log.error('Failed to render admin route', err);
      });
    };
    window.addEventListener('hashchange', hashHandler);
  }
}

/** Tear down listeners and module state. Used by tests. */
export function destroyAdminPage() {
  routeVersion += 1;
  iconObserver?.disconnect();
  iconObserver = null;
  if (iconFrame) {
    window.cancelAnimationFrame(iconFrame);
    iconFrame = 0;
  }
  if (hashHandler) {
    window.removeEventListener('hashchange', hashHandler);
    hashHandler = null;
  }
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
