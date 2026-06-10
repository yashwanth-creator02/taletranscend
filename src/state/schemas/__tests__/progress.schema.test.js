import { describe, it, expect } from 'vitest';
import {
  createTaleProgress,
  createChapterProgress,
  createLocalTaleProgress,
} from '../progress.schema.js';

describe('createTaleProgress', () => {
  it('returns progress with defaults', () => {
    const progress = createTaleProgress('user-1', 'tale-1');

    expect(progress.userId).toBe('user-1');
    expect(progress.taleId).toBe('tale-1');
    expect(progress.lastChapterIndex).toBe(0);
    expect(progress.lastReadAt).toBeInstanceOf(Date);
  });
});

describe('createChapterProgress', () => {
  it('returns chapter progress with defaults', () => {
    const progress = createChapterProgress('tale-1', 2);

    expect(progress.taleId).toBe('tale-1');
    expect(progress.chapterIndex).toBe(2);
    expect(progress.status).toBe('unread');
    expect(progress.percent).toBe(0);
  });

  it('marks as finished when explicitly set', () => {
    const progress = createChapterProgress('tale-1', 0, { status: 'finished' });
    expect(progress.status).toBe('finished');
    expect(progress.percent).toBe(100);
  });
});

describe('createLocalTaleProgress', () => {
  it('returns local progress with defaults', () => {
    const progress = createLocalTaleProgress('tale-1');

    expect(progress.taleId).toBe('tale-1');
    expect(progress.chapterIndex).toBe(0);
    expect(progress.percent).toBe(0);
  });
});
