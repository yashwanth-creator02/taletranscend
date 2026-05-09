// src/pages/contribution/state.js
// Centralized state for the tale editor.
// All editor modules read and write through this shared object.

export const state = {
  // Array of chapter objects, each with { title, content }
  chapters: [],

  // Index of the chapter currently loaded in the editor
  currentChapterIndex: 0,
};
