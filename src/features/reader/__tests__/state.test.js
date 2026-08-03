// src/features/reader/__tests__/state.test.js
import { describe, it, expect } from 'vitest';
import { readerState } from '../state.js';

describe('ReaderState', () => {
  it('has correct default values', () => {
    expect(readerState.taleId).toBeNull();
    expect(readerState.chapterIndex).toBe(0);
    expect(readerState.theme).toBe('noir');
    expect(readerState.fontSize).toBe(18);
    expect(readerState.openTool).toBe('toc');
  });

  it('is mutable', () => {
    readerState.taleId = 't1';
    expect(readerState.taleId).toBe('t1');
  });
});
