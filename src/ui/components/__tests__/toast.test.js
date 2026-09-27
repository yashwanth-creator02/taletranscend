// src/ui/components/__tests__/toast.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showToast } from '../toast.js';
import { initIcons } from '@/ui/icons.js';

vi.mock('@/ui/icons.js', () => ({
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
    const container = document.getElementById('mythic-toast-hub');
    expect(container).toBeTruthy();
    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-label')).toBe('Notifications');
  });

  it('adopts legacy container if present in DOM', () => {
    const legacy = document.createElement('div');
    legacy.id = 'reader-toast-container';
    document.body.appendChild(legacy);

    showToast('Adoption check');
    const hub = document.getElementById('mythic-toast-hub');
    expect(hub).toBe(legacy);
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

  it('supports options object as second parameter', () => {
    showToast('Custom Duration', { duration: 2000, title: 'Notice' });
    const container = document.getElementById('mythic-toast-hub');
    expect(container.textContent).toContain('Notice');
    expect(container.textContent).toContain('Custom Duration');

    vi.advanceTimersByTime(2000);
    expect(container.children[0].classList.contains('opacity-0')).toBe(true);

    vi.advanceTimersByTime(700);
    expect(container.children.length).toBe(0);
  });

  it('provides shorthand helpers (success, error, warning, info)', () => {
    showToast.success('Shorthand Success');
    expect(document.querySelector('.text-emerald-400')).toBeTruthy();

    showToast.error('Shorthand Error');
    expect(document.querySelector('.text-rose-400')).toBeTruthy();

    showToast.warning('Shorthand Warning');
    expect(document.querySelector('.text-amber-400')).toBeTruthy();

    showToast.info('Shorthand Info');
    expect(document.querySelector('.text-indigo-400')).toBeTruthy();
  });

  it('pauses timer on hover and resumes on mouseleave', () => {
    const toast = showToast('Hover me', { duration: 4000 });
    const container = document.getElementById('mythic-toast-hub');

    // Advance 2 seconds
    vi.advanceTimersByTime(2000);
    expect(toast.classList.contains('opacity-0')).toBe(false);

    // Mouse enters -> pause
    toast.dispatchEvent(new Event('mouseenter'));

    // Advance 4 more seconds (past initial 4000ms duration)
    vi.advanceTimersByTime(4000);
    // Should NOT have started dismissing because it was paused
    expect(toast.classList.contains('opacity-0')).toBe(false);
    expect(container.children.length).toBe(1);

    // Mouse leaves -> resumes remaining 2000ms
    toast.dispatchEvent(new Event('mouseleave'));

    vi.advanceTimersByTime(1999);
    expect(toast.classList.contains('opacity-0')).toBe(false);

    vi.advanceTimersByTime(1);
    expect(toast.classList.contains('opacity-0')).toBe(true);

    vi.advanceTimersByTime(700);
    expect(container.children.length).toBe(0);
  });

  it('renders and invokes action button', () => {
    const onClick = vi.fn();
    const onDismiss = vi.fn();
    showToast('With Action', {
      action: { label: 'Undo', onClick },
      onDismiss,
    });

    const container = document.getElementById('mythic-toast-hub');
    const actionBtn = container.querySelector('.toast-card__action-btn');
    expect(actionBtn).toBeTruthy();
    expect(actionBtn.textContent.trim()).toBe('Undo');

    actionBtn.click();
    expect(onClick).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
    expect(container.children[0].classList.contains('opacity-0')).toBe(true);

    vi.advanceTimersByTime(700);
    expect(container.children.length).toBe(0);
  });

  it('enforces maximum active toast limit to prevent flooding', () => {
    const container = document.getElementById('mythic-toast-hub') || document.createElement('div');
    showToast('Toast 1');
    showToast('Toast 2');
    showToast('Toast 3');
    showToast('Toast 4');

    const hub = document.getElementById('mythic-toast-hub');
    expect(hub.children.length).toBe(4);

    // Adding 5th toast should immediately trigger dismissal on the 1st toast
    showToast('Toast 5');
    expect(hub.children[0].classList.contains('toast-dismissing')).toBe(true);
    expect(hub.children[0].classList.contains('opacity-0')).toBe(true);
  });

  it('allows manual dismissal via showToast.dismiss and showToast.clear', () => {
    const t1 = showToast('First');
    const t2 = showToast('Second');
    const hub = document.getElementById('mythic-toast-hub');

    showToast.dismiss(t1);
    expect(t1.classList.contains('opacity-0')).toBe(true);

    showToast.clear();
    expect(t2.classList.contains('opacity-0')).toBe(true);

    vi.advanceTimersByTime(700);
    expect(hub.children.length).toBe(0);
  });

  it('supports touch swipe-to-dismiss gesture', () => {
    const toast = showToast('Swipe me', { duration: 10000 });

    // Touch start
    toast.dispatchEvent(
      new CustomEvent('touchstart', {
        detail: {},
      })
    );

    // Simulate touchstart, touchmove (> 75px), touchend
    const startEvent = new Event('touchstart');
    Object.defineProperty(startEvent, 'touches', {
      value: [{ clientX: 100, clientY: 100 }],
    });
    toast.dispatchEvent(startEvent);

    const moveEvent = new Event('touchmove');
    Object.defineProperty(moveEvent, 'touches', {
      value: [{ clientX: 200, clientY: 100 }], // deltaX = 100 > 75
    });
    toast.dispatchEvent(moveEvent);

    const endEvent = new Event('touchend');
    toast.dispatchEvent(endEvent);

    expect(toast.classList.contains('opacity-0')).toBe(true);
    vi.advanceTimersByTime(700);
    expect(document.getElementById('mythic-toast-hub').children.length).toBe(0);
  });
});
