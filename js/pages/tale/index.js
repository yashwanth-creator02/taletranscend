export { initAuth } from "../../core/firebase/index.js";
export { loadTale, loadChapters } from "./content.js";
export { renderTale, renderChapters } from "./ui.js";
export { bindChapterClicks, setupTabs, setupStartReading,setupResumeReading } from "./interactions.js";
export { listenToComments, postComment } from "./comments.js";
export { initIcons } from "../../ui/icons.js";