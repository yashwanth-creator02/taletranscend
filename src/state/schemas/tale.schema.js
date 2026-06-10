// src/state/schemas/tale.schema.js
// Canonical shape for tale documents and chapter documents from Firestore.
// public/data/tales/{taleId} and public/data/tales/{taleId}/chapters/{index}

/* ─────────────────────────────────────────────
   Tale — tales/{taleId}
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} Tale
 * @property {string}   id
 * @property {string}   title
 * @property {string}   authorId
 * @property {string}   authorName
 * @property {string}   authorAvatarUrl
 * @property {string}   description
 * @property {string}   synopsis
 * @property {string}   coverUrl
 * @property {string}   era
 * @property {string[]} tags
 * @property {string}   tone
 * @property {string}   language
 * @property {string}   audience
 * @property {string}   visibility
 * @property {string[]} contentWarnings
 * @property {string}   worldSetting
 * @property {string}   authorNotes
 * @property {number}   chapterCount
 * @property {number}   wordCount
 * @property {number}   estimatedReadMins
 * @property {number}   readCount
 * @property {number}   commentCount
 * @property {number}   reactionCount
 * @property {number}   bookmarkCount
 * @property {string}   status
 * @property {import('firebase/firestore').Timestamp|null} submittedAt
 * @property {import('firebase/firestore').Timestamp|null} reviewedAt
 * @property {string|null} reviewedBy
 * @property {string|null} rejectionReason
 * @property {string|null} moderationNotes
 * @property {boolean}  isFeatured
 * @property {boolean}  isEditorsPick
 * @property {import('firebase/firestore').Timestamp|null} featuredAt
 * @property {string[]} searchKeywords
 * @property {import('firebase/firestore').Timestamp|null} publishedAt
 * @property {import('firebase/firestore').Timestamp|null} lastChapterAddedAt
 * @property {import('firebase/firestore').Timestamp|null} updatedAt
 * @property {import('firebase/firestore').Timestamp|null} createdAt
 */

/**
 * Merges raw Firestore tale document data with safe defaults.
 * Always pass id separately — it comes from snap.id, not snap.data().
 *
 * @param {string} id
 * @param {Partial<Tale>} data - Raw data from Firestore snap.data()
 * @returns {Tale}
 */
export function createTale(id, data = {}) {
  return {
    id,
    title: data.title || 'Untitled Tale',
    authorId: data.authorId ?? '',
    authorName: data.authorName ?? '',
    authorAvatarUrl: data.authorAvatarUrl ?? '',
    description: data.description ?? '',
    synopsis: data.synopsis ?? '',
    coverUrl: data.coverUrl ?? '',
    era: data.era ?? '',
    tags: data.tags ?? [],
    tone: data.tone ?? '',
    language: data.language ?? 'English',
    audience: data.audience ?? 'General',
    visibility: data.visibility ?? 'public',
    contentWarnings: data.contentWarnings ?? [],
    worldSetting: data.worldSetting ?? '',
    authorNotes: data.authorNotes ?? '',
    chapterCount: Number(data.chapterCount ?? 0),
    wordCount: Number(data.wordCount ?? 0),
    estimatedReadMins: Number(data.estimatedReadMins ?? 0),
    readCount: Number(data.readCount ?? 0),
    commentCount: Number(data.commentCount ?? 0),
    reactionCount: Number(data.reactionCount ?? 0),
    bookmarkCount: Number(data.bookmarkCount ?? 0),
    status: data.status ?? 'draft',
    submittedAt: data.submittedAt ?? null,
    reviewedAt: data.reviewedAt ?? null,
    reviewedBy: data.reviewedBy ?? null,
    rejectionReason: data.rejectionReason ?? null,
    moderationNotes: data.moderationNotes ?? null,
    isFeatured: data.isFeatured ?? false,
    isEditorsPick: data.isEditorsPick ?? false,
    featuredAt: data.featuredAt ?? null,
    searchKeywords: data.searchKeywords ?? [],
    publishedAt: data.publishedAt ?? null,
    lastChapterAddedAt: data.lastChapterAddedAt ?? null,
    updatedAt: data.updatedAt ?? null,
    createdAt: data.createdAt
      ? data.createdAt.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt)
      : new Date(),
  };
}

/* ─────────────────────────────────────────────
   Chapter — tales/{taleId}/chapters/{index}
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} Chapter
 * @property {string} id                   - The document ID (string index, e.g. "0", "1")
 * @property {number} chapterNum           - Human-facing chapter number (1-based)
 * @property {string} title
 * @property {string} content
 * @property {number} wordCount
 * @property {number} estimatedReadMins
 * @property {import('firebase/firestore').Timestamp|null} publishedAt
 * @property {import('firebase/firestore').Timestamp|null} updatedAt
 */

/**
 * Merges raw Firestore chapter document data with safe defaults.
 *
 * @param {string} id - Document ID from snap.id
 * @param {Partial<Chapter>} data - Raw data from snap.data()
 * @returns {Chapter}
 */
export function createChapter(id, data = {}) {
  const numId = parseInt(id, 10);
  return {
    id,
    chapterNum: data.chapterNum ?? (isNaN(numId) ? 1 : numId + 1),
    title: data.title || 'Untitled Chapter',
    content: data.content ?? '',
    wordCount: Number(data.wordCount ?? 0),
    estimatedReadMins: Number(data.estimatedReadMins ?? 0),
    publishedAt: data.publishedAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/* ─────────────────────────────────────────────
   Comment — tales/{taleId}/comments/{commentId}
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} Comment
 * @property {string}      id
 * @property {string}      taleId
 * @property {string}      text
 * @property {string}      type
 * @property {number|null} chapterIndex
 * @property {string}      authorId
 * @property {string}      authorName
 * @property {string}      authorAvatarUrl
 * @property {string|null} parentId
 * @property {number}      replyCount
 * @property {number}      depth
 * @property {number}      likeCount
 * @property {boolean}     isEdited
 * @property {import('firebase/firestore').Timestamp|null} editedAt
 * @property {boolean}     isPinned
 * @property {boolean}     isHidden
 * @property {number}      reportCount
 * @property {import('firebase/firestore').Timestamp|null} createdAt
 * @property {import('firebase/firestore').Timestamp|null} updatedAt
 */

/**
 * @param {string} id
 * @param {Partial<Comment>} data
 * @returns {Comment}
 */
export function createComment(id, data = {}) {
  return {
    id,
    taleId: data.taleId ?? '',
    text: data.text ?? '',
    type: data.type ?? 'general',
    chapterIndex: data.chapterIndex ?? null,
    authorId: data.authorId ?? '',
    authorName: data.authorName ?? '',
    authorAvatarUrl: data.authorAvatarUrl ?? '',
    parentId: data.parentId ?? null,
    replyCount: data.replyCount ?? 0,
    depth: data.depth ?? 0,
    likeCount: data.likeCount ?? 0,
    isEdited: data.isEdited ?? false,
    editedAt: data.editedAt ?? null,
    isPinned: data.isPinned ?? false,
    isHidden: data.isHidden ?? false,
    reportCount: data.reportCount ?? 0,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}
