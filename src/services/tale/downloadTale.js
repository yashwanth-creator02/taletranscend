// src/services/tale/downloadTale.js
// Downloads a tale and all its chapters:
// 1. Caches metadata & chapters in IndexedDB for full offline reader access
// 2. Triggers an export file download (.md or .epub format) to the user's local disk
// 3. Emits user-facing toasts

import { getTaleMeta, getChapters } from '../reader/reader.service.js';
import { saveTaleOffline, createLogger, buildEpubBlob } from '@/utils';
import { showToast } from '@ui/components/toast.js';

const log = createLogger('DownloadTale');

/**
 * Downloads a tale's full content for offline reading and exports it as Markdown (.md) or EPUB (.epub).
 *
 * @param {string} taleId - The Firestore ID of the tale
 * @param {Object|string} [options] - Options object or format string ('md' | 'epub')
 * @param {string} [options.format='md'] - 'md' or 'epub'
 * @returns {Promise<boolean>}
 */
export async function downloadChronicle(taleId, options = {}) {
  if (!taleId) return false;
  const opts = typeof options === 'string' ? { format: options } : options;
  const format = opts?.format === 'epub' ? 'epub' : 'md';

  showToast(`Preparing chronicle download (${format.toUpperCase()})…`, 'info');

  try {
    const [tale, chapters] = await Promise.all([getTaleMeta(taleId), getChapters(taleId)]);

    if (!tale) {
      showToast('Chronicle not found.', 'error');
      return false;
    }

    // Cache locally in IndexedDB for offline reading inside the app
    await saveTaleOffline({
      id: tale.id,
      title: tale.title,
      authorName: tale.authorName,
      coverUrl: tale.coverUrl,
      synopsis: tale.synopsis,
      era: tale.era,
      genre: tale.genre,
      lastReadAt: Date.now(),
      chapters: chapters || [],
    });

    const safeTitle = (tale.title || 'chronicle')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (format === 'epub') {
      const blob = buildEpubBlob({
        id: tale.id,
        title: tale.title,
        authorName: tale.authorName,
        synopsis: tale.synopsis,
        era: tale.era,
        genre: tale.genre,
        chapters: chapters || [],
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${safeTitle || 'chronicle'}.epub`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      showToast(`"${tale.title}" downloaded as EPUB.`, 'success');
      return true;
    }

    // Default: Markdown export
    const header = [
      '==================================================',
      tale.title.toUpperCase(),
      `By ${tale.authorName || 'Anonymous Chronicler'}`,
      `Era: ${tale.era || 'Mythic'} | Genre: ${tale.genre || 'Folklore'}`,
      `Chapters: ${chapters?.length || 0}`,
      '==================================================\n',
      'SYNOPSIS:',
      tale.synopsis || 'No synopsis recorded in the archive.',
      '\n--------------------------------------------------\n',
    ].join('\n');

    const chaptersBody = (chapters || [])
      .map((ch, idx) => {
        const title = ch.title || `Chapter ${idx + 1}`;
        const content = ch.content || '';
        return `## Chapter ${idx + 1}: ${title}\n\n${content}\n`;
      })
      .join('\n--------------------------------------------------\n\n');

    const fullText = `${header}${chaptersBody}`;

    const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = blobUrl;
    link.download = `${safeTitle || 'chronicle'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    showToast(`"${tale.title}" downloaded and saved for offline reading.`, 'success');
    return true;
  } catch (err) {
    log.error('Chronicle download failed:', err);
    showToast('Failed to download chronicle. Please try again.', 'error');
    return false;
  }
}

/**
 * Downloads a single chapter/fragment as a Markdown (.md) or EPUB (.epub) file.
 *
 * @param {string} taleId - The Firestore ID of the tale
 * @param {number} chapterIndex - The 0-based chapter index
 * @param {Object} [options]
 * @param {string} [options.format='md']
 * @param {string} [options.taleTitle]
 * @param {Object} [options.chapter]
 * @returns {Promise<boolean>}
 */
export async function downloadChapter(
  taleId,
  chapterIndex,
  { taleTitle, chapter, format = 'md' } = {}
) {
  if (!taleId || typeof chapterIndex !== 'number') return false;

  const resolvedFormat = format === 'epub' ? 'epub' : 'md';
  showToast(`Preparing fragment download (${resolvedFormat.toUpperCase()})…`, 'info');

  try {
    let resolvedTaleTitle = taleTitle;
    let targetChapter = chapter;

    if (!targetChapter) {
      const [tale, chapters] = await Promise.all([
        resolvedTaleTitle ? Promise.resolve({ title: resolvedTaleTitle }) : getTaleMeta(taleId),
        getChapters(taleId),
      ]);
      resolvedTaleTitle = resolvedTaleTitle || tale?.title || 'Chronicle';
      targetChapter = chapters?.[chapterIndex];
    }

    if (!targetChapter) {
      showToast('Fragment not found in this chronicle.', 'error');
      return false;
    }

    const chapterNum = chapterIndex + 1;
    const chapterTitle = targetChapter.title || `Scroll #${chapterNum}`;
    const chapterContent = targetChapter.content || '';

    const safeTale = (resolvedTaleTitle || 'chronicle')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const safeChapter = (chapterTitle || `scroll-${chapterNum}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (resolvedFormat === 'epub') {
      const blob = buildEpubBlob({
        id: taleId,
        title: resolvedTaleTitle || 'Chronicle',
        chapters: [{ title: chapterTitle, content: chapterContent }],
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = blobUrl;
      link.download = `${safeTale}-scroll-${chapterNum}-${safeChapter}.epub`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      showToast(`"${chapterTitle}" downloaded as EPUB.`, 'success');
      return true;
    }

    const text = [
      '==================================================',
      `${(resolvedTaleTitle || 'Chronicle').toUpperCase()}`,
      `Scroll #${chapterNum}: ${chapterTitle}`,
      '==================================================\n',
      chapterContent,
    ].join('\n');

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = blobUrl;
    link.download = `${safeTale}-scroll-${chapterNum}-${safeChapter}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    showToast(`"${chapterTitle}" downloaded.`, 'success');
    return true;
  } catch (err) {
    log.error('Fragment download failed:', err);
    showToast('Failed to download fragment. Please try again.', 'error');
    return false;
  }
}
