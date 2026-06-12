// src/state/__tests__/app.state.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appState, setAppUser, setAppProfile, setAppReaderPrefs } from '../app.state.js';

describe('AppState', () => {
  beforeEach(() => {
    appState.userId = null;
    appState.profile = null;
    appState.prefsLoaded = false;
    appState.profileLoaded = false;
  });

  describe('setAppUser', () => {
    it('sets userId and resets flags', () => {
      appState.prefsLoaded = true;
      setAppUser('u123');
      expect(appState.userId).toBe('u123');
      expect(appState.prefsLoaded).toBe(false);
    });
  });

  describe('setAppProfile', () => {
    it('sets profile and marks as loaded', () => {
      setAppProfile('u1', { name: 'Hero' });
      expect(appState.profile.name).toBe('Hero');
      expect(appState.profileLoaded).toBe(true);
    });
  });

  describe('setAppReaderPrefs', () => {
    it('sets readerPrefs and marks as loaded', () => {
      setAppReaderPrefs({ theme: 'sepia' });
      expect(appState.readerPrefs.theme).toBe('sepia');
      expect(appState.prefsLoaded).toBe(true);
    });
  });
});
