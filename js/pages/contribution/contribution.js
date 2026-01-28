import { addNewChapter, updateSidebarTitle } from './chapters.js';
import { autoSaveLocal } from './editor.js';
import { saveToCloud } from './cloud.js';
import { publishFullTale } from './publish.js';

/* ================= Expose Functions to HTML =================
   Expose selected functions to the global `window` object
   so they can be called directly from HTML event handlers.
============================================================== */
window.addNewChapter = addNewChapter;
window.updateSidebarTitle = updateSidebarTitle;
window.autoSaveLocal = autoSaveLocal;
window.saveToCloud = saveToCloud;
window.publishFullTale = publishFullTale;

/* ================= Initialization ================= */

/**
 * Initialize the editor.
 * Starts with a default chapter to ensure the editor isn't empty.
 */
function init() {
  addNewChapter(); // Add one chapter on load
}

// Run initialization
init();
