/**
 * Cover images are stored as full-size external URLs, but a card paints them
 * into a ~230px box. Unsplash (our default host) serves any width on request,
 * so ask for one instead of shipping 1200px into a thumbnail.
 */

const RESIZABLE_HOST = 'images.unsplash.com';

/**
 * @param {string} url
 * @param {number} width
 * @returns {string} A width-limited URL for hosts that support it, else the input.
 */
export function sizedCoverUrl(url: string, width: number): string {
  if (!url || !Number.isFinite(width) || width <= 0) return url;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url; // relative or malformed: leave it alone
  }

  if (parsed.hostname !== RESIZABLE_HOST) return url;

  parsed.searchParams.set('w', String(Math.round(width)));
  parsed.searchParams.set('q', '70');
  parsed.searchParams.set('auto', 'format');
  return parsed.toString();
}
