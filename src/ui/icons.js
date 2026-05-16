/**
 * Renders all Lucide icons found in the given scope.
 * Safe to call multiple times — skips silently if Lucide is not loaded.
 *
 * @param {ParentNode} [scope=document] - The DOM scope to search for icons
 */
export function initIcons(scope = document) {
  if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;

  try {
    // If using the CDN version (window.lucide), it usually has icons bundled.
    // If it's an ESM version, we might need to pass the icons object.
    const options = {};
    if (scope !== document) {
      options.scope = scope;
    }

    // Attempt to call createIcons. If it fails due to missing icons object, 
    // it will be caught by the try-catch.
    window.lucide.createIcons(options);
  } catch (err) {
    console.warn('[icons] Failed to render Lucide icons:', err);
  }
}
