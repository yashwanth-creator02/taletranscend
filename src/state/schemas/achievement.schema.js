// src/state/schemas/achievement.schema.js
// Canonical shape for achievement documents.
// users/{uid}/achievements/{achievementId}

/**
 * @typedef {'bronze'|'silver'|'gold'|'platinum'} AchievementTier
 *
 * @typedef {Object} Achievement
 * @property {string}           id           - Slug e.g. 'first_tale_read', 'ten_tales_complete'
 * @property {string}           title        - Display name e.g. 'First Legend'
 * @property {string}           description  - e.g. 'Read your first tale'
 * @property {string}           icon         - Lucide icon name e.g. 'book-open'
 * @property {AchievementTier}  tier
 * @property {boolean}          isUnlocked
 * @property {number}           progress     - 0–100 for progressive achievements
 * @property {import('firebase/firestore').Timestamp|null} unlockedAt
 */

/**
 * @param {string} id
 * @param {Partial<Achievement>} data
 * @returns {Achievement}
 */
export function createAchievement(id, data = {}) {
  return {
    id,
    title:       data.title       ?? '',
    description: data.description ?? '',
    icon:        data.icon        ?? 'award',
    tier:        data.tier        ?? 'bronze',
    isUnlocked:  data.isUnlocked  ?? false,
    progress:    data.progress    ?? 0,
    unlockedAt:  data.unlockedAt  ?? null,
  };
}

/* ─────────────────────────────────────────────
   Achievement Registry
   Static definitions for all achievements in the app.
   These are the source of truth — Firestore stores only
   progress/unlock state, keyed by the same id slug.
   ───────────────────────────────────────────── */

/**
 * @type {Array<Omit<Achievement, 'isUnlocked'|'progress'|'unlockedAt'>>}
 */
export const ACHIEVEMENT_REGISTRY = [
  // Reader achievements
  {
    id:          'first_tale_read',
    title:       'First Legend',
    description: 'Read your first tale',
    icon:        'book-open',
    tier:        'bronze',
  },
  {
    id:          'ten_tales_complete',
    title:       'Myth Keeper',
    description: 'Complete 10 tales',
    icon:        'library',
    tier:        'silver',
  },
  {
    id:          'fifty_tales_complete',
    title:       'Lore Warden',
    description: 'Complete 50 tales',
    icon:        'scroll',
    tier:        'gold',
  },
  {
    id:          'century_reader',
    title:       'Centurion of Stories',
    description: 'Complete 100 tales',
    icon:        'crown',
    tier:        'platinum',
  },
  {
    id:          'night_reader',
    title:       'Midnight Scholar',
    description: 'Read for over 10 hours total',
    icon:        'moon',
    tier:        'silver',
  },
  // Writer achievements
  {
    id:          'first_tale_published',
    title:       'Voice of Legend',
    description: 'Publish your first tale',
    icon:        'feather',
    tier:        'bronze',
  },
  {
    id:          'ten_tales_published',
    title:       'Master of Myths',
    description: 'Publish 10 tales',
    icon:        'pen-line',
    tier:        'gold',
  },
  {
    id:          'ten_thousand_words',
    title:       'Wordsmith',
    description: 'Write 10,000 words across all tales',
    icon:        'type',
    tier:        'bronze',
  },
  {
    id:          'hundred_thousand_words',
    title:       'Epic Chronicler',
    description: 'Write 100,000 words',
    icon:        'pencil',
    tier:        'platinum',
  },
  // Social achievements
  {
    id:          'first_bookmark',
    title:       'Collector',
    description: 'Bookmark your first tale',
    icon:        'bookmark',
    tier:        'bronze',
  },
  {
    id:          'first_follower',
    title:       'Rising Voice',
    description: 'Gain your first follower',
    icon:        'users',
    tier:        'bronze',
  },
  {
    id:          'hundred_readers',
    title:       'Storyteller',
    description: 'Reach 100 readers across your tales',
    icon:        'globe',
    tier:        'silver',
  },
];
