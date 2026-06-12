// src/state/__tests__/index.test.js
import { describe, it, expect } from 'vitest';
import * as state from '../index.js';

describe('state/index', () => {
  it('exports schema factories', () => {
    expect(state.createUserProfile).toBeDefined();
    expect(state.createTale).toBeDefined();
    expect(state.createDraft).toBeDefined();
    expect(state.appState).toBeDefined();
  });
});
