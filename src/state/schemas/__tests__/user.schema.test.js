import { describe, it, expect } from 'vitest';
import { createUserProfile, createReaderPreferences } from '../user.schema.js';

describe('createUserProfile', () => {
  it('creates profile with defaults', () => {
    const user = createUserProfile('uid-123');

    expect(user.uid).toBe('uid-123');
    expect(user.name).toBe('Anonymous Reader');
    expect(user.role).toBe('reader');
    expect(user.isBanned).toBe(false);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('merges provided data', () => {
    const user = createUserProfile('uid-456', {
      name: 'Yashwanth',
      bio: 'Developer',
      role: 'writer',
    });

    expect(user.name).toBe('Yashwanth');
    expect(user.bio).toBe('Developer');
    expect(user.role).toBe('writer');
  });
});

describe('createReaderPreferences', () => {
  it('has default theme and font', () => {
    const prefs = createReaderPreferences();

    expect(prefs.theme).toBe('dark');
    expect(prefs.fontFamily).toBe('inter');
    expect(prefs.fontSize).toBe(18);
    expect(prefs.lineHeight).toBe(1.6);
  });
});
