// js/core/services/reader/index.js

export { getTaleMeta, getChapter } from './reader.service.js';
export { 
  syncChapterProgressToCloud, 
  getCloudChapterProgress,scheduleProgressSync,
  getCloudProgress, // ✅ added missing export
} from './readerProgress.service.js';
export { saveReaderProgress, getChapterProgress, resolveProgress as resolveLocalProgress } from "./reader.progress.js";
