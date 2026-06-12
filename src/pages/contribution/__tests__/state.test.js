import { describe, it, expect } from 'vitest';
import { state } from '../state.js';

describe('Contribution State', () => {
  it('has correct initial values', () => {
    expect(state.draftId).toBe('new');
    expect(state.title).toBe('');
    expect(state.chapters).toEqual([]);
    expect(state.currentChapterIndex).toBe(0);
    expect(state.isDirty).toBe(false);
  });
});
