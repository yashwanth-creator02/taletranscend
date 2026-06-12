// src/utils/__tests__/dom.utils.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import {
  qs,
  qsa,
  createEl,
  toggleClass,
  getInput,
  setInput,
  setSelect,
  setText,
} from '../dom.utils.ts';

describe('Dom Utils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('Selectors', () => {
    it('qs selects an element', () => {
      document.body.innerHTML = '<div id="test"></div>';
      expect(qs('#test')).toBeTruthy();
      expect(qs('#missing')).toBeNull();
    });

    it('qsa selects multiple elements', () => {
      document.body.innerHTML = '<div class="test"></div><div class="test"></div>';
      expect(qsa('.test')).toHaveLength(2);
      expect(qsa('.missing')).toHaveLength(0);
    });
  });

  describe('Creation', () => {
    it('createEl creates an element with attributes', () => {
      const el = createEl('div', { id: 'my-id', class: 'my-class' }, 'Hello');
      expect(el.tagName).toBe('DIV');
      expect(el.id).toBe('my-id');
      expect(el.className).toBe('my-class');
      expect(el.textContent).toBe('Hello');
    });
  });

  describe('Manipulation', () => {
    it('toggleClass toggles a class', () => {
      const el = document.createElement('div');
      toggleClass(el, 'active');
      expect(el.classList.contains('active')).toBe(true);
      toggleClass(el, 'active');
      expect(el.classList.contains('active')).toBe(false);
    });

    it('getInput gets trimmed input value', () => {
      document.body.innerHTML = '<input id="my-input" value="  hello  " />';
      expect(getInput('my-input')).toBe('hello');
    });

    it('setInput sets input value', () => {
      document.body.innerHTML = '<input id="my-input" />';
      setInput('my-input', 'new value');
      expect(document.getElementById('my-input').value).toBe('new value');
    });

    it('setSelect sets select value', () => {
      document.body.innerHTML = `
        <select id="my-select">
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
      `;
      setSelect('my-select', 'b');
      expect(document.getElementById('my-select').value).toBe('b');

      setSelect('my-select', 'non-existent');
      expect(document.getElementById('my-select').value).toBe('b'); // Unchanged
    });

    it('setText sets textContent', () => {
      document.body.innerHTML = '<div id="my-div"></div>';
      setText('my-div', 'Hello world');
      expect(document.getElementById('my-div').textContent).toBe('Hello world');
    });
  });
});
