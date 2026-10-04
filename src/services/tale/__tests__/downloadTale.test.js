// src/services/tale/__tests__/downloadTale.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadChronicle, downloadChapter } from '../downloadTale.js';
import * as readerService from '../../reader/reader.service.js';
import * as utils from '@/utils';
import * as toast from '@ui/components/toast.js';

vi.mock('../../reader/reader.service.js', () => ({
  getTaleMeta: vi.fn(),
  getChapters: vi.fn(),
}));

vi.mock('@/utils', () => ({
  saveTaleOffline: vi.fn(() => Promise.resolve()),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

describe('downloadTale service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('downloadChronicle', () => {
    it('returns false if taleId missing', async () => {
      const res = await downloadChronicle('');
      expect(res).toBe(false);
    });

    it('downloads chronicle and saves offline when tale found', async () => {
      vi.mocked(readerService.getTaleMeta).mockResolvedValue({
        id: 't1',
        title: 'Epic Lore',
        authorName: 'Scribe',
        synopsis: 'A great journey',
        era: 'Mythic',
        genre: 'Epic',
      });
      vi.mocked(readerService.getChapters).mockResolvedValue([
        { title: 'Ch 1', content: 'Once upon a time...' },
      ]);

      const res = await downloadChronicle('t1');
      expect(res).toBe(true);
      expect(utils.saveTaleOffline).toHaveBeenCalled();
      expect(toast.showToast).toHaveBeenCalledWith(expect.stringContaining('Epic Lore'), 'success');
    });

    it('shows error toast when tale not found', async () => {
      vi.mocked(readerService.getTaleMeta).mockResolvedValue(null);
      vi.mocked(readerService.getChapters).mockResolvedValue([]);

      const res = await downloadChronicle('non-existent');
      expect(res).toBe(false);
      expect(toast.showToast).toHaveBeenCalledWith('Chronicle not found.', 'error');
    });
  });

  describe('downloadChapter', () => {
    it('returns false if invalid args', async () => {
      const res = await downloadChapter('', 'not-a-number');
      expect(res).toBe(false);
    });

    it('downloads individual fragment when chapter provided', async () => {
      const res = await downloadChapter('t1', 0, {
        taleTitle: 'Epic Lore',
        chapter: { title: 'First Scroll', content: 'Scroll text here.' },
      });

      expect(res).toBe(true);
      expect(toast.showToast).toHaveBeenCalledWith(
        expect.stringContaining('First Scroll'),
        'success'
      );
    });

    it('fetches chapter from service if not provided in options', async () => {
      vi.mocked(readerService.getTaleMeta).mockResolvedValue({ title: 'Epic Lore' });
      vi.mocked(readerService.getChapters).mockResolvedValue([
        { title: 'Scroll 1', content: 'Chapter content' },
      ]);

      const res = await downloadChapter('t1', 0);
      expect(res).toBe(true);
      expect(toast.showToast).toHaveBeenCalledWith(expect.stringContaining('Scroll 1'), 'success');
    });
  });
});
