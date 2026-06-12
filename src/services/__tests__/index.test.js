// src/services/__tests__/index.test.js
import { describe, it, expect } from 'vitest';
import * as services from '../index.js';

describe('services/index', () => {
  it('exports all services', () => {
    expect(services.getTaleMeta).toBeDefined();
    expect(services.getChapter).toBeDefined();
    expect(services.getBookmarks).toBeDefined();
    expect(services.toggleResonance).toBeDefined();
    expect(services.suggestTitle).toBeDefined();
  });
});
