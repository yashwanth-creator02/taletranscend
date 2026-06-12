// src/state/schemas/__tests__/achievement.schema.test.js
import { describe, it, expect } from 'vitest';
import { createAchievement, ACHIEVEMENT_REGISTRY } from '../achievement.schema.js';

describe('AchievementSchema', () => {
  it('creates achievement with defaults', () => {
    const a = createAchievement('a1');
    expect(a.id).toBe('a1');
    expect(a.tier).toBe('bronze');
    expect(a.isUnlocked).toBe(false);
  });

  it('merges partial data', () => {
    const a = createAchievement('a1', { tier: 'gold', progress: 50 });
    expect(a.tier).toBe('gold');
    expect(a.progress).toBe(50);
  });

  it('registry contains expected items', () => {
    expect(ACHIEVEMENT_REGISTRY.length).toBeGreaterThan(0);
    expect(ACHIEVEMENT_REGISTRY.some((a) => a.id === 'first_tale_read')).toBe(true);
  });
});
