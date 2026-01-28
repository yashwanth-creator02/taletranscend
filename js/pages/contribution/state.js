// js/contribution/state.js

/* ================= Editor State =================
   Centralized state object for the tale editor.
   Holds the chapters and the currently selected chapter index.
================================================== */

export const state = {
  // Array of chapter objects { title, content }
  chapters: [],

  // Index of the currently active chapter in the editor
  currentChapterIndex: 0,
};
