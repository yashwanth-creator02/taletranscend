// src/pages/profile/state.js
// Centralised mutable state for the profile page.

/**
 * @typedef {Object} ProfileState
 * @property {string|null}   uid
 * @property {string}        name
 * @property {string}        bio
 * @property {string}        pronouns
 * @property {string}        avatarUrl
 * @property {string}        location
 * @property {string}        website
 * @property {string}        twitterHandle
 * @property {string}        instagramHandle
 * @property {number}        readingGoal        - books per year target
 * @property {string[]}      favouriteGenres
 * @property {string}        joinedAt           - ISO date string from Firebase auth
 * @property {number}        totalWordsWritten  - computed from drafts + published
 * @property {number}        totalReaders       - sum of readers across published tales
 * @property {number}        writingStreak      - days in a row with activity
 * @property {string}        activeModalTab     - 'basic' | 'identity' | 'social' | 'goals'
 * @property {(() => void)|null} unsubscribeProfile - Firestore listener cleanup
 */

/** @type {ProfileState} */
export const profileState = {
  uid: null,
  name: '',
  bio: '',
  pronouns: '',
  avatarUrl: '',
  location: '',
  website: '',
  twitterHandle: '',
  instagramHandle: '',
  readingGoal: 12,
  favouriteGenres: [],
  joinedAt: '',
  totalWordsWritten: 0,
  totalReaders: 0,
  writingStreak: 0,
  activeModalTab: 'basic',
  unsubscribeProfile: null,
};

/** All available genre options shown in the multi-select */
export const GENRE_OPTIONS = [
  'Folklore',
  'Mythology',
  'Fantasy',
  'Dark Fantasy',
  'Horror',
  'Romance',
  'Adventure',
  'Mystery',
  'Sci-Fi',
  'Historical',
  'Fable',
  'Epic',
  'Gothic',
  'Children',
  'Thriller',
];
