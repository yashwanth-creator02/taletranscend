// src/pages/home/__tests__/reliquary.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_ARTIFACTS,
  generateArtifactForTale,
  getReliquaryArtifacts,
} from '../reliquary.data.js';
import { initReliquary, teardownReliquary } from '../reliquary.js';

describe('Archive Reliquary (Scholar’s Tableau)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="archive-reliquary-container"></div>
    `;
  });

  afterEach(() => {
    teardownReliquary();
  });

  describe('Reliquary Data & Registry', () => {
    it('has all core centerpiece artifacts configured in DEFAULT_ARTIFACTS', () => {
      expect(DEFAULT_ARTIFACTS.length).toBeGreaterThanOrEqual(6);

      const types = DEFAULT_ARTIFACTS.map((a) => a.type);
      expect(types).toContain('book');
      expect(types).toContain('lamp');
      expect(types).toContain('watch');
      expect(types).toContain('map');
      expect(types).toContain('quill');
      expect(types).toContain('spectacles');

      DEFAULT_ARTIFACTS.forEach((item) => {
        expect(item.id).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.era).toBeDefined();
        expect(item.lore).toBeDefined();
        expect(item.asset).toBeDefined();
        expect(item.position).toHaveProperty('left');
        expect(item.position).toHaveProperty('top');
      });
    });

    it('generates an artifact correctly for a given tale', () => {
      const mockTale = {
        id: 'tale-atlantis',
        title: 'Atlantis: The Drowned Kingdom',
        era: 'Classical Greece',
        description: 'An ancient dialogue regarding the lost realm beneath the waves.',
      };

      const artifact = generateArtifactForTale(mockTale, 0);
      expect(artifact.taleId).toBe('tale-atlantis');
      expect(artifact.taleTitle).toBe('Atlantis: The Drowned Kingdom');
      expect(artifact.readUrl).toContain('tale.html?id=tale-atlantis');
      expect(artifact.asset).toBeDefined();
    });

    it('returns default artifacts when dynamic generation is inactive', () => {
      const artifacts = getReliquaryArtifacts([]);
      expect(artifacts).toEqual(DEFAULT_ARTIFACTS);
    });
  });

  describe('Reliquary Component Mounting & Interactivity', () => {
    it('mounts the reliquary tableau and nodes into the DOM', () => {
      initReliquary('archive-reliquary-container');

      const container = document.getElementById('archive-reliquary-container');
      expect(container.querySelector('.archive-reliquary')).not.toBeNull();
      expect(container.querySelector('.reliquary-lamp-halo')).not.toBeNull();
      expect(container.querySelector('.reliquary-stage')).not.toBeNull();

      const items = container.querySelectorAll('.reliquary-item');
      expect(items.length).toBe(DEFAULT_ARTIFACTS.length);
    });

    it('updates the inspector HUD when an artifact is clicked or hovered', () => {
      initReliquary('archive-reliquary-container');

      const items = document.querySelectorAll('.reliquary-item');
      const secondItem = items[1];
      const secondData = DEFAULT_ARTIFACTS[1];

      // Simulate click
      secondItem.click();

      expect(secondItem.classList.contains('is-selected')).toBe(true);
      expect(secondItem.getAttribute('aria-expanded')).toBe('true');

      const titleEl = document.getElementById('relic-inspector-title');
      const eraEl = document.getElementById('relic-inspector-era');
      const linkEl = document.getElementById('relic-inspector-link');

      expect(titleEl.textContent).toBe(secondData.title);
      expect(eraEl.textContent).toBe(secondData.era);
      expect(linkEl.getAttribute('href')).toBe(secondData.readUrl);
    });

    it('handles keyboard activation with Enter key', () => {
      initReliquary('archive-reliquary-container');

      const items = document.querySelectorAll('.reliquary-item');
      const targetItem = items[2];
      const targetData = DEFAULT_ARTIFACTS[2];

      targetItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(targetItem.classList.contains('is-selected')).toBe(true);
      const titleEl = document.getElementById('relic-inspector-title');
      expect(titleEl.textContent).toBe(targetData.title);
    });
  });
});
