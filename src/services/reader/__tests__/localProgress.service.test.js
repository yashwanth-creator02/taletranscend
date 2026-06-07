import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadLocalProgress,
  saveLocalProgress,
  getOverallProgress,
} from '../localProgress.service.js';

describe('localProgress.service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves and loads progress for a tale', () => {
    const taleId = 'tale-123';
    const chapterIndex = 2;
    const percent = 45;

    saveLocalProgress(taleId, chapterIndex, percent);

    const progress = loadLocalProgress(taleId);
    expect(progress.chapterIndex).toBe(chapterIndex);
    expect(progress.percent).toBe(percent);
    expect(progress.lastReadAt).toBeDefined();
  });

  it('returns default progress when none exists', () => {
    const progress = loadLocalProgress('nonexistent');
    expect(progress.chapterIndex).toBe(0);
    expect(progress.percent).toBe(0);
  });

  it('overwrites existing progress', () => {
    saveLocalProgress('tale-123', 0, 10);
    vi.advanceTimersByTime(100);
    saveLocalProgress('tale-123', 3, 80);

    const progress = loadLocalProgress('tale-123');
    expect(progress.chapterIndex).toBe(3);
    expect(progress.percent).toBe(80);
  });
});

describe('getOverallProgress', () => {
  it('calculates 0% when no chapters read', () => {
    const result = getOverallProgress({ chapterCount: 5, chaptersProgress: {} });
    expect(result.percent).toBe(0);
    expect(result.finishedChapters).toBe(0);
  });

  it('calculates 100% when all chapters finished', () => {
    const chaptersProgress = {
      0: { status: 'finished' },
      1: { status: 'finished' },
      2: { status: 'finished' },
    };
    const result = getOverallProgress({ chapterCount: 3, chaptersProgress });
    expect(result.percent).toBe(100);
    expect(result.finishedChapters).toBe(3);
  });

  it('calculates partial progress correctly', () => {
    const chaptersProgress = {
      0: { status: 'finished' },
      1: { status: 'in-progress', percent: 50 },
      2: { status: 'unread' },
    };
    const result = getOverallProgress({ chapterCount: 3, chaptersProgress });
    expect(result.percent).toBeCloseTo(50, 0); // 1 finished + 0.5 in-progress = 1.5/3 = 50%
  });
});
