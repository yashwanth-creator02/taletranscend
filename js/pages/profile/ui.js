/* ==================== Profile UI ==================== */

/**
 * Initializes the profile UI.
 * Currently a placeholder reserved for future wiring (e.g., event listeners, dynamic components).
 */
export function initProfileUI() {
  // reserved for future UI wiring
}

/**
 * Updates the profile UI with the given data.
 * Updates both display elements and input fields for desktop and mobile views.
 *
 * @param {Object} data - Profile data containing `name` and `bio`
 */
export function updateProfileUI(data) {
  // Update text elements (desktop + mobile)
  setText('desktop-display-name', data.name || 'Explorer');
  setText('mobile-display-name', data.name || 'Explorer');
  setText('desktop-display-bio', data.bio || 'Preserving legends...');
  setText('mobile-display-bio', data.bio || 'Preserving legends...');

  // Update input fields for editing
  setInput('input-name', data.name);
  setInput('input-bio', data.bio);
}

/* ==================== Helper Functions ==================== */

/**
 * Sets the innerText of an element if it exists.
 *
 * @param {string} id - Element ID
 * @param {string} value - Text to set
 */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

/**
 * Sets the value of an input element if it exists.
 *
 * @param {string} id - Input element ID
 * @param {string} value - Value to set
 */
function setInput(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined) el.value = value;
}
