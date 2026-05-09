// src/pages/reader/navigation.js
// Manages chapter navigation links and back-navigation in the reader.

/**
 * Updates the previous and next chapter navigation links in the reader UI.
 * Hides links that have no valid target (first or last chapter).
 *
 * @param {Object} navigation - Navigation context from getChapter
 * @param {boolean} navigation.hasPrev - Whether a previous chapter exists
 * @param {boolean} navigation.hasNext - Whether a next chapter exists
 * @param {number|null} navigation.prevIndex - Index of the previous chapter
 * @param {number|null} navigation.nextIndex - Index of the next chapter
 * @param {string|null} navigation.prevTitle - Title of the previous chapter
 * @param {string|null} navigation.nextTitle - Title of the next chapter
 * @param {string} taleId - ID of the tale for building navigation URLs
 */
export function applyNavigation(navigation, taleId) {
  const prev = document.getElementById('prev-link');
  const next = document.getElementById('next-link');

  if (navigation.hasPrev) {
    prev.href = `reader.html?taleId=${taleId}&chapterId=${navigation.prevIndex}`;
    prev.classList.remove('hidden');

    const prevTitle = document.getElementById('prev-title');
    if (prevTitle) prevTitle.textContent = navigation.prevTitle;
  } else {
    prev.classList.add('hidden');
  }

  if (navigation.hasNext) {
    next.href = `reader.html?taleId=${taleId}&chapterId=${navigation.nextIndex}`;
    next.classList.remove('hidden');

    const nextTitle = document.getElementById('next-title');
    if (nextTitle) nextTitle.textContent = navigation.nextTitle;
  } else {
    next.classList.add('hidden');
  }
}

/**
 * Navigates the user back to the tale overview page.
 *
 * @param {string} taleId - ID of the tale to return to
 */
export function goBackToTale(taleId) {
  window.location.href = `tale.html?id=${taleId}`;
}
