// src/state/schemas/user.schema.js
// Canonical shape for all user-related data pulled from Firestore.
// Every service that reads users/{uid} or users/{uid}/preferences/reader
// must pass the raw Firestore data through these factories before storing it.
// This makes the in-memory shape explicit and prevents implicit undefined access.

/* ─────────────────────────────────────────────
   Profile — users/{uid}
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} UserProfile
 * @property {string}      uid
 * @property {string}      name
 * @property {string}      bio
 * @property {string}      pronouns
 * @property {string}      avatarUrl
 * @property {string}      location
 * @property {string}      website
 * @property {string}      twitterHandle
 * @property {string}      instagramHandle
 * @property {number}      followingCount
 * @property {number}      followerCount
 * @property {number}      totalReadTimeMs
 * @property {number}      totalTalesCompleted
 * @property {number}      totalChaptersRead
 * @property {number}      readingGoal
 * @property {string[]}    favouriteGenres
 * @property {number}      totalWordsWritten
 * @property {number}      totalTalesPublished
 * @property {number}      totalReaders
 * @property {number}      writingStreak
 * @property {import('firebase/firestore').Timestamp|null} lastWrittenAt
 * @property {string}      role
 * @property {boolean}     isBanned
 * @property {boolean}     isVerifiedWriter
 * @property {import('firebase/firestore').Timestamp|null} joinedAt
 * @property {import('firebase/firestore').Timestamp|null} lastActiveAt
 * @property {import('firebase/firestore').Timestamp|null} createdAt
 * @property {import('firebase/firestore').Timestamp|null} updatedAt
 */

/**
 * Merges raw Firestore user document data with safe defaults.
 * Always pass uid separately — it is not stored inside the document itself.
 *
 * @param {string} uid
 * @param {Partial<UserProfile>} data - Raw data from Firestore snap.data()
 * @returns {UserProfile}
 */
export function createUserProfile(uid, data = {}) {
  return {
    uid,
    name:               data.name              ?? '',
    bio:                data.bio               ?? '',
    pronouns:           data.pronouns          ?? '',
    avatarUrl:          data.avatarUrl         ?? '',
    location:           data.location          ?? '',
    website:            data.website           ?? '',
    twitterHandle:      data.twitterHandle     ?? '',
    instagramHandle:    data.instagramHandle   ?? '',
    followingCount:     data.followingCount    ?? 0,
    followerCount:      data.followerCount     ?? 0,
    totalReadTimeMs:    data.totalReadTimeMs   ?? 0,
    totalTalesCompleted: data.totalTalesCompleted ?? 0,
    totalChaptersRead:  data.totalChaptersRead ?? 0,
    readingGoal:        data.readingGoal       ?? 30,
    favouriteGenres:    data.favouriteGenres   ?? [],
    totalWordsWritten:  data.totalWordsWritten ?? 0,
    totalTalesPublished: data.totalTalesPublished ?? 0,
    totalReaders:       data.totalReaders      ?? 0,
    writingStreak:      data.writingStreak     ?? 0,
    lastWrittenAt:      data.lastWrittenAt     ?? null,
    role:               data.role              ?? 'reader',
    isBanned:           data.isBanned          ?? false,
    isVerifiedWriter:   data.isVerifiedWriter  ?? false,
    joinedAt:           data.joinedAt          ?? null,
    lastActiveAt:       data.lastActiveAt      ?? null,
    createdAt:          data.createdAt         ?? null,
    updatedAt:          data.updatedAt         ?? null,
  };
}

/* ─────────────────────────────────────────────
   Reader Preferences — users/{uid}/preferences/reader
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} ReaderPreferences
 * @property {string}   theme
 * @property {string}   fontFamily
 * @property {number}   fontSize
 * @property {number}   lineHeight
 * @property {number}   measure
 * @property {string}   readingWidth
 * @property {string[]} contentFilters
 * @property {string}   preferredLanguage
 * @property {boolean}  notifyOnNewChapter
 * @property {boolean}  notifyOnComment
 * @property {boolean}  notifyOnFollow
 * @property {import('firebase/firestore').Timestamp|null} updatedAt
 */

/**
 * Merges raw Firestore preferences/reader document with safe defaults.
 *
 * @param {Partial<ReaderPreferences>} data
 * @returns {ReaderPreferences}
 */
export function createReaderPreferences(data = {}) {
  return {
    theme:              data.theme             ?? 'noir',
    fontFamily:         data.fontFamily        ?? 'serif',
    fontSize:           data.fontSize          ?? 18,
    lineHeight:         data.lineHeight        ?? 1.75,
    measure:            data.measure           ?? 68,
    readingWidth:       data.readingWidth      ?? 'normal',
    contentFilters:     data.contentFilters    ?? [],
    preferredLanguage:  data.preferredLanguage ?? 'English',
    notifyOnNewChapter: data.notifyOnNewChapter ?? true,
    notifyOnComment:    data.notifyOnComment   ?? true,
    notifyOnFollow:     data.notifyOnFollow    ?? true,
    updatedAt:          data.updatedAt         ?? null,
  };
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

/**
 * Extracts only the fields that are safe to write back to Firestore
 * from a UserProfile object. Strips uid and any client-only runtime fields.
 *
 * @param {Partial<UserProfile>} profile
 * @returns {Object}
 */
export function profileToFirestore(profile) {
  const { uid, ...rest } = profile;
  return rest;
}
