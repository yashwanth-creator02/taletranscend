import { describe, it, expect } from 'vitest';
import { createUserProfile, createReaderPreferences, profileToFirestore } from '../user.schema.js';

describe('UserSchema', () => {
  describe('createUserProfile', () => {
    it('creates profile with defaults', () => {
      const p = createUserProfile('u1');
      expect(p.uid).toBe('u1');
      expect(p.name).toBe('Anonymous Reader');
      expect(p.role).toBe('reader');
      expect(p.readingGoal).toBe(30);
    });

    it('merges partial data', () => {
      const p = createUserProfile('u1', { name: 'Hero', role: 'writer', readingGoal: 50 });
      expect(p.name).toBe('Hero');
      expect(p.role).toBe('writer');
      expect(p.readingGoal).toBe(50);
    });

    it('handles firebase timestamp', () => {
      const mockDate = new Date();
      const p = createUserProfile('u1', {
        createdAt: { toDate: () => mockDate },
      });
      expect(p.createdAt).toEqual(mockDate);
    });
  });

  describe('createReaderPreferences', () => {
    it('creates preferences with defaults', () => {
      const prefs = createReaderPreferences();
      expect(prefs.theme).toBe('dark');
      expect(prefs.fontSize).toBe(18);
    });

    it('merges partial data', () => {
      const prefs = createReaderPreferences({ theme: 'sepia', fontSize: 24 });
      expect(prefs.theme).toBe('sepia');
      expect(prefs.fontSize).toBe(24);
    });
  });

  describe('profileToFirestore', () => {
    it('strips uid from profile', () => {
      const p = createUserProfile('u1', { name: 'Hero' });
      const data = profileToFirestore(p);
      expect(data.uid).toBeUndefined();
      expect(data.name).toBe('Hero');
    });
  });
});
