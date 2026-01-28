// js/reader/navigation.js

/**
 * Updates the previous/next navigation links in the reader UI.
 *
 * @param {Object} navigation - Navigation info for the current chapter
 * @param {boolean} navigation.hasPrev - Whether a previous chapter exists
 * @param {boolean} navigation.hasNext - Whether a next chapter exists
 * @param {number} navigation.prevIndex - Index of the previous chapter
 * @param {number} navigation.nextIndex - Index of the next chapter
 * @param {string} navigation.prevTitle - Title of the previous chapter
 * @param {string} navigation.nextTitle - Title of the next chapter
 * @param {string} taleId - The ID of the tale
 */
export function applyNavigation(navigation, taleId) {
  const prev = document.getElementById('prev-link');
  const next = document.getElementById('next-link');

  // Handle previous chapter link
  if (navigation.hasPrev) {
    prev.href = `reader.html?taleId=${taleId}&chapterId=${navigation.prevIndex}`;
    prev.classList.remove('hidden');

    const prevTitle = document.getElementById('prev-title');
    if (prevTitle) prevTitle.textContent = navigation.prevTitle;
  } else {
    prev.classList.add('hidden');
  }

  // Handle next chapter link
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
 * Navigate back to the main tale page from the reader.
 *
 * @param {string} taleId - The ID of the tale
 */
export function goBackToTale(taleId) {
  window.location.href = `tale.html?id=${taleId}`;
}
