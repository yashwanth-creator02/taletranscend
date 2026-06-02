// src/utils/navigation.ts


/**
 * Navigate to a view HTML file.
 *
 * Examples:
 * navigateTo('library');
 * navigateTo('profile');
 * navigateTo('reader');
 * navigateTo('reader.html');
 */
// src/utils/navigation.ts

export const VIEWS_PATH = '/src/views/';

export function navigateTo(view: string): void {
  if (!view) return;

  const file = view.endsWith('.html')
    ? view
    : `${view}.html`;

  window.location.href = `${VIEWS_PATH}${file}`;
}
