// src/utils/__tests__/ui.utils.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupAuthTimeout } from '../ui.utils.ts';

describe('UI Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="test-container"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets up a timeout that renders error message', () => {
    setupAuthTimeout('test-container', 'Timeout Error', 1000);

    vi.advanceTimersByTime(1000);

    const container = document.getElementById('test-container');
    expect(container.innerHTML).toContain('Timeout Error');
  });

  it('can be cleared', () => {
    const timer = setupAuthTimeout('test-container', 'Error', 1000);
    clearTimeout(timer);

    vi.advanceTimersByTime(1000);

    const container = document.getElementById('test-container');
    expect(container.innerHTML).toBe('');
  });
});
