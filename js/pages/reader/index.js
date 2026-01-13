// js/pages/reader/index.js
export { initMobileDrawer } from "./mobile.js";

export {
  initTheme,
  initFont,
  setTheme,
  setFont,
  updateSize
} from "./theme.js";

export { initAuth , appId} from "../../core/firebase/index.js";

export { loadReaderMeta, loadReaderChapter } from "./content.js";
export { applyNavigation, goBackToTale } from "./navigation.js";
export { updateReaderProgress, bindScrollProgress, restoreScrollProgress } from "./progress.js";
export * from "../../core/services/reader/index.js";
export { resolveProgress } from "../../core/services/reader/reader.progress.js";
