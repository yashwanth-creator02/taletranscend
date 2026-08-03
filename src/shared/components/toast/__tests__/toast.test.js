// src/shared/components/toast/__tests__/toast.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showToast } from '../toast.js';
import { initIcons } from '@/shared/icons.js';

vi.mock('@shared/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@/utils', () => ({
  escapeText: vi.fn((s) => s),
}));

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = '';
    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', (cb) => cb());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a toast container if it does not exist', () => {
    showToast('Hello');
    expect(document.getElementById('mythic-toast-hub')).toBeTruthy();
  });

  it('adds a toast element with correct message and type', () => {
    showToast('Success Message', 'success');
    const container = document.getElementById('mythic-toast-hub');
    expect(container.textContent).toContain('Success Message');
    const toast = container.querySelector('.text-emerald-400');
    expect(toast).toBeTruthy();
    expect(initIcons).toHaveBeenCalled();
  });

  it('auto-dismisses after duration', () => {
    showToast('Auto dismiss');
    const container = document.getElementById('mythic-toast-hub');
    expect(container.children.length).toBe(1);

    vi.advanceTimersByTime(4000); // TOAST_DURATION
    // It starts the animation (adds opacity-0)
    expect(container.children[0].classList.contains('opacity-0')).toBe(true);

    vi.advanceTimersByTime(700); // Removal timeout
    expect(container.children.length).toBe(0);
  });

  it('dismisses when close button is clicked', () => {
    showToast('Click to dismiss');
    const container = document.getElementById('mythic-toast-hub');
    const btn = container.querySelector('button');

    btn.click();
    expect(container.children[0].classList.contains('opacity-0')).toBe(true);

    vi.advanceTimersByTime(700);
    expect(container.children.length).toBe(0);
  });

  it('handles different toast types', () => {
    showToast('Error', 'error');
    expect(document.querySelector('.text-rose-400')).toBeTruthy();

    showToast('Info', 'info');
    expect(document.querySelector('.text-indigo-400')).toBeTruthy();

    showToast('Warning', 'warning');
    expect(document.querySelector('.text-amber-400')).toBeTruthy();
  });
});
