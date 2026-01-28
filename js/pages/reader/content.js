// js/reader/content.js

import { getTaleMeta, getChapter } from '@services/index.js';

export async function loadReaderMeta(taleId) {
  try {
    const meta = await getTaleMeta(taleId);

    setText('header-story-title', meta.title);
    setText('sidebar-story-name', meta.title);
    setText('sidebar-description', meta.description);
    setText('author-name', meta.authorName);
  } catch (err) {
    console.error('Failed to load tale metadata', err);
  }
}

export async function loadReaderChapter({ taleId, chapterIndex }) {
  try {
    const { chapter, navigation } = await getChapter({
      taleId,
      chapterIndex,
    });

    setText('chapter-label', `Fragment ${String(chapter.index + 1).padStart(2, '0')}`);

    setText('chapter-title', chapter.title);

    const story = document.getElementById('story-content');
    if (story) {
      story.innerHTML = chapter.content
        .split('\n')
        .filter((p) => p.trim())
        .map((p) => `<p class="mb-8">${p}</p>`)
        .join('');
    }

    return navigation;
  } catch (err) {
    console.error('Failed to load chapter', err);
    return null;
  }
}

/* -------- Helpers -------- */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
