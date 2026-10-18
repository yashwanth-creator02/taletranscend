// src/ui/components/reading-scene.js
//
// Mounts the login reading scene (see reading-scene/scene.js) into the page.
//
// The scene is generated at runtime rather than shipped as a static .svg for
// two reasons: the book layout is procedural (seeded, so it is stable), and
// an inline SVG resolves the --scene-* custom properties, which is what lets
// the same markup re-skin across the app's themes.

import { buildReadingScene } from '@/ui/reading-scene/scene.js';

/** Element the scene replaces. */
const MOUNT_SELECTOR = '#login-scene';

/**
 * Injects the scene markup into its mount point.
 *
 * Safe to call when the element is absent (tests, other pages) — it simply
 * does nothing.
 *
 * @param {Document|Element} [root=document] - Search root.
 * @returns {boolean} True if the scene was mounted.
 */
export function mountReadingScene(root = typeof document !== 'undefined' ? document : null) {
  const mount = root?.querySelector?.(MOUNT_SELECTOR);
  if (!mount) return false;

  mount.innerHTML = buildReadingScene();
  return true;
}

/**
 * Looks up a group inside the mounted scene by id. Stage 2+ animates through
 * this rather than reaching into the markup, so group ids stay an
 * implementation detail of the scene.
 *
 * @param {string} id - Group id, e.g. 'lamp-glow' or 'boy-head'.
 * @param {Document|Element} [root=document] - Search root.
 * @returns {Element|null}
 */
export function getSceneGroup(id, root = typeof document !== 'undefined' ? document : null) {
  return root?.querySelector?.(`${MOUNT_SELECTOR} #${id}`) || null;
}

/**
 * Every animatable group the scene exposes, in paint order. Grows as the
 * scene is built up; Stage 2 will animate through this list.
 *
 * @returns {string[]}
 */
export const SCENE_GROUP_IDS = ['bookcase-left'];
