// src/features/contribution/index.js
// Barrel export for all contribution page modules.
// contribution.js imports everything from here.

import { createLogger } from '@/utils';

const log = createLogger('Index');

export {
  addNewChapter,
  updateSidebarTitle,
  renderChapterList,
  loadCurrentChapter,
} from './chapters.js';

export { autoSaveLocal, updateStats } from './editor.js';

export {
  saveToCloud,
  saveAllChapters,
  loadDraft,
  initDraftId,
  syncMetadataFromDom,
} from './cloud.js';

export { publishFullTale } from './publish.js';

export { state } from './state.js';

export { initIcons } from '@shared/icons.js';

export * from '@fb/index.js';

log.debug('Index initialized');
