// js/core/services/reader/index.js

export { getTaleMeta, getChapter } from "./reader.service.js";

// Local progress
export { saveReaderProgress, getChapterProgress } from "./reader.progress.js";

// Cloud progress
export {
  syncChapterProgressToCloud,
  getCloudChapterProgress,
  getCloudProgress,
  scheduleProgressSync
} from "./readerProgress.service.js";
