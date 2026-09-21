// src/pages/contribution/__tests__/contribution.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setStatus, updateChecklist } from '../contribution.js';
import { state } from '../state.js';

describe('Contribution Page Controller', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="stat-status"></div>
      <div id="check-title-synopsis"></div>
      <div id="check-cover-era"></div>
      <div id="check-chapter"></div>
      <input id="tale-title" />
      <textarea id="tale-synopsis"></textarea>
      <input id="tale-era" />
    `;
    state.chapters = [];
  });

  describe('setStatus', () => {
    it('updates status text and color', () => {
      setStatus('Saving...', 'neutral');
      const status = document.getElementById('stat-status');
      expect(status.textContent).toBe('Saving...');
      expect(status.classList.contains('text-zinc-500')).toBe(true);

      setStatus('Error!', 'error');
      expect(status.textContent).toBe('Error!');
      expect(status.classList.contains('text-red-400')).toBe(true);

      setStatus('Success!', 'success');
      expect(status.textContent).toBe('Success!');
      expect(status.classList.contains('text-emerald-400')).toBe(true);
    });
  });

  describe('updateChecklist', () => {
    it('marks items as passed when requirements are met', () => {
      document.getElementById('tale-title').value = 'Test Title';
      document.getElementById('tale-synopsis').value = 'Test Synopsis';
      document.getElementById('tale-era').value = 'Test Era';
      state.chapters = [{ content: 'Test Content' }];

      updateChecklist();

      expect(document.getElementById('check-title-synopsis').classList.contains('opacity-50')).toBe(
        false
      );
      expect(document.getElementById('check-cover-era').classList.contains('opacity-50')).toBe(
        false
      );
      expect(document.getElementById('check-chapter').classList.contains('opacity-50')).toBe(false);
    });

    it('marks items as failed when requirements are missing', () => {
      document.getElementById('tale-title').value = '';
      updateChecklist();
      expect(document.getElementById('check-title-synopsis').classList.contains('opacity-50')).toBe(
        true
      );
    });
  });
});
