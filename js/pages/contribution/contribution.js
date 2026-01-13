import { addNewChapter, updateSidebarTitle } from "./chapters.js";
import { autoSaveLocal } from "./editor.js";
import { saveToCloud } from "./cloud.js";
import { publishFullTale } from "./publish.js";

/* ---------------------------
   EXPOSE FOR HTML
---------------------------- */
window.addNewChapter = addNewChapter;
window.updateSidebarTitle = updateSidebarTitle;
window.autoSaveLocal = autoSaveLocal;
window.saveToCloud = saveToCloud;
window.publishFullTale = publishFullTale;

/* ---------------------------
   INIT
---------------------------- */
function init() {
  addNewChapter(); // start with one chapter
}

init();
