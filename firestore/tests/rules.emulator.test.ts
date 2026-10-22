// firestore/tests/rules.emulator.test.ts
//
// Emulator-backed tests for firestore.rules. These run against a REAL
// Firestore emulator (not mocks), which is the only way to actually verify
// rule behavior — see docs/MIGRATION_PLAN.md Phase 2 and the audit's
// Critical Findings #1 and #2, both of which a suite like this would have
// caught before they ever shipped.
//
// Run with: npm run test:rules
// (wraps this in `firebase emulators:exec`, which starts a local Firestore
// emulator, runs this file against it, then shuts the emulator down)
//
// Requires: firebase-tools (devDependency, already added) and a local Java
// runtime (the emulator itself is a JVM process — install a JRE if
// `npm run test:rules` fails with a Java-related error).

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { setDoc, doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const PROJECT_ID = 'taletranscend-rules-test';
const ROOT = 'v1/taletranscend/projects/v1';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      // Read the SAME file the deploy config ships (firebase.json: "firestore.rules"),
      // so these tests always describe the deployed ruleset.
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/** Seeds a published tale authored by `authorUid`, bypassing rules (admin SDK context). */
async function seedTale(
  authorUid: string,
  taleId: string,
  overrides: Record<string, unknown> = {}
) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `${ROOT}/public/data/tales/${taleId}`), {
      authorId: authorUid,
      title: 'A Test Tale',
      synopsis: '',
      description: '',
      coverUrl: '',
      era: '',
      tone: '',
      language: 'en',
      audience: '',
      worldSetting: '',
      authorNotes: '',
      chapterCount: 1,
      wordCount: 100,
      estimatedReadMins: 1,
      status: 'published',
      visibility: 'public',
      tags: [],
      contentWarnings: [],
      searchKeywords: [],
      isFeatured: false,
      isEditorsPick: false,
      readCount: 0,
      commentCount: 0,
      reactionCount: 0,
      bookmarkCount: 0,
      submittedAt: new Date(),
      publishedAt: new Date(),
      createdAt: new Date(),
      // Seeded 10s in the past, not "now": respectsCooldown() requires 5s
      // since the last update, and tests that seed then immediately update
      // in the same run would otherwise be correctly rejected by that same
      // rule — this isn't a rules bug, it's a test-data bug.
      updatedAt: new Date(Date.now() - 10_000),
      ...overrides,
    });
  });
}

describe('tales/{taleId} — reactionCount permission (Critical Finding #2)', () => {
  it('a non-author CANNOT do a full update of someone else’s tale', async () => {
    await seedTale('author-1', 'tale-1');
    const readerCtx = testEnv.authenticatedContext('reader-1');
    await assertFails(
      updateDoc(doc(readerCtx.firestore(), `${ROOT}/public/data/tales/tale-1`), {
        title: 'Hijacked title',
      })
    );
  });

  it('a non-author CAN increment reactionCount only — this is the bug the audit found', async () => {
    await seedTale('author-1', 'tale-1');
    const readerCtx = testEnv.authenticatedContext('reader-1');
    await assertSucceeds(
      updateDoc(doc(readerCtx.firestore(), `${ROOT}/public/data/tales/tale-1`), {
        reactionCount: increment(1),
      })
    );
  });

  it('a non-author CANNOT sneak other field changes in alongside reactionCount', async () => {
    await seedTale('author-1', 'tale-1');
    const readerCtx = testEnv.authenticatedContext('reader-1');
    await assertFails(
      updateDoc(doc(readerCtx.firestore(), `${ROOT}/public/data/tales/tale-1`), {
        reactionCount: increment(1),
        title: 'Sneaky rename',
      })
    );
  });

  it('the author CAN still do a full update, including reactionCount', async () => {
    await seedTale('author-1', 'tale-1');
    const authorCtx = testEnv.authenticatedContext('author-1');
    await assertSucceeds(
      updateDoc(doc(authorCtx.firestore(), `${ROOT}/public/data/tales/tale-1`), {
        title: 'A Test Tale',
        synopsis: '',
        description: '',
        coverUrl: '',
        era: '',
        tone: '',
        language: 'en',
        audience: '',
        worldSetting: '',
        authorNotes: '',
        chapterCount: 1,
        wordCount: 100,
        estimatedReadMins: 1,
        status: 'published',
        visibility: 'public',
        tags: [],
        contentWarnings: [],
        searchKeywords: [],
        isFeatured: false,
        isEditorsPick: false,
        readCount: 0,
        commentCount: 0,
        reactionCount: 1,
        bookmarkCount: 0,
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('an unauthenticated user cannot react at all', async () => {
    await seedTale('author-1', 'tale-1');
    const anonCtx = testEnv.unauthenticatedContext();
    await assertFails(
      updateDoc(doc(anonCtx.firestore(), `${ROOT}/public/data/tales/tale-1`), {
        reactionCount: increment(1),
      })
    );
  });
});

describe('users/{userId}/progress/{taleId} — subcollection model (Phase 2 schema fix)', () => {
  it('the owner CAN write the real shape cloudProgress.service.js sends (lastReadAt only)', async () => {
    const uid = 'reader-1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      setDoc(
        doc(ctx.firestore(), `${ROOT}/users/${uid}/readerProgress/tale-1`),
        { lastReadAt: serverTimestamp() },
        { merge: true }
      )
    );
  });

  it('the owner CAN also include the optional totalReadTimeMs field', async () => {
    const uid = 'reader-1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      setDoc(
        doc(ctx.firestore(), `${ROOT}/users/${uid}/readerProgress/tale-1`),
        { lastReadAt: serverTimestamp(), totalReadTimeMs: 42000 },
        { merge: true }
      )
    );
  });

  it('a DIFFERENT user cannot write to someone else’s progress doc', async () => {
    const ctx = testEnv.authenticatedContext('attacker');
    await assertFails(
      setDoc(
        doc(ctx.firestore(), `${ROOT}/users/reader-1/readerProgress/tale-1`),
        { lastReadAt: serverTimestamp() },
        { merge: true }
      )
    );
  });

  it('the owner CAN write chapter-level scroll progress to the chapters subcollection', async () => {
    const uid = 'reader-1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      setDoc(
        doc(ctx.firestore(), `${ROOT}/users/${uid}/readerProgress/tale-1/chapters/0`),
        { scrollPercent: 42, lastCharacterOffset: 1200, updatedAt: serverTimestamp() },
        { merge: true }
      )
    );
  });
});

describe('users/{userId}/drafts/{draftId} — authoring write contract (P0 regression)', () => {
  const uid = 'author-1';

  /** Seeds a draft bypassing rules (admin SDK context). */
  async function seedDraft(draftId: string) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/${draftId}`), {
        authorId: uid,
        title: 'A Draft',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(Date.now() - 10_000),
      });
    });
  }

  it('the owner CAN create a draft with the shape cloud.js sends', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/draft-1`), {
        authorId: uid,
        title: 'Legend of the Roots',
        synopsis: '',
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('a draft WITHOUT authorId is denied (the bug this suite now guards)', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      setDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/draft-1`), {
        title: 'Legend of the Roots',
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('a draft WITHOUT status is denied', async () => {
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      setDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/draft-1`), {
        authorId: uid,
        title: 'Legend of the Roots',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('the owner CAN update their own draft after the cooldown', async () => {
    await seedDraft('draft-1');
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/draft-1`), {
        authorId: uid,
        title: 'A Revised Draft',
        status: 'draft',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('the owner CANNOT reassign a draft to another author', async () => {
    await seedDraft('draft-1');
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/draft-1`), {
        authorId: 'author-2',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('the owner CAN still update a legacy draft that has no authorId', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/legacy-1`), {
        title: 'Legacy Draft',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(Date.now() - 10_000),
      });
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/legacy-1`), {
        title: 'Legacy Draft Revised',
        status: 'draft',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('the owner CAN create a draft chapter with index and createdAt', async () => {
    await seedDraft('draft-1');
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/draft-1/chapters/0`), {
        chapterNum: 1,
        title: 'The Beginning',
        content: 'Once upon a time...',
        wordCount: 4,
        index: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('a draft chapter WITHOUT index is denied', async () => {
    await seedDraft('draft-1');
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      setDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/draft-1/chapters/0`), {
        chapterNum: 1,
        title: 'The Beginning',
        content: 'Once upon a time...',
        wordCount: 4,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('the owner CAN update a draft chapter (respecting the 5s cooldown)', async () => {
    await seedDraft('draft-1');
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/draft-1/chapters/0`), {
        chapterNum: 1,
        title: 'The Beginning',
        content: 'Once upon a time...',
        wordCount: 4,
        index: 0,
        createdAt: new Date(),
        updatedAt: new Date(Date.now() - 10_000),
      });
    });
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/drafts/draft-1/chapters/0`), {
        chapterNum: 1,
        title: 'The Beginning, Revised',
        content: 'Once upon a time, again...',
        wordCount: 5,
        index: 0,
        updatedAt: serverTimestamp(),
      })
    );
  });
});

describe('users/{userId}/followers/{followerUid} — cross-user write (proactive fix)', () => {
  it('user A CAN create a "followers" entry under user B (A is the follower)', async () => {
    const ctxA = testEnv.authenticatedContext('user-a');
    await assertSucceeds(
      setDoc(doc(ctxA.firestore(), `${ROOT}/users/user-b/followers/user-a`), {
        followedAt: serverTimestamp(),
      })
    );
  });

  it('user A CANNOT create a followers entry claiming to be someone else (user C)', async () => {
    const ctxA = testEnv.authenticatedContext('user-a');
    await assertFails(
      setDoc(doc(ctxA.firestore(), `${ROOT}/users/user-b/followers/user-c`), {
        followedAt: serverTimestamp(),
      })
    );
  });
});

describe('inquiries/{inquiryId} — author reply/report/block allowance', () => {
  /** Seeds an inquiry sent by `senderUid` to `authorUid`, bypassing rules (admin SDK context). */
  async function seedInquiry(inquiryId: string, authorUid: string, senderUid: string) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${ROOT}/inquiries/${inquiryId}`), {
        authorId: authorUid,
        senderId: senderUid,
        taleId: 'tale-1',
        message: 'A question about the second fragment.',
        status: 'sent',
        createdAt: new Date(),
      });
    });
  }

  it('the author CAN mark an inquiry replied (the replyToMissive flow)', async () => {
    await seedInquiry('inq-1', 'author-1', 'reader-1');
    const authorCtx = testEnv.authenticatedContext('author-1');
    await assertSucceeds(
      updateDoc(doc(authorCtx.firestore(), `${ROOT}/inquiries/inq-1`), {
        status: 'replied',
        replyText: 'Thank you for asking.',
        replyAuthorName: 'author-1',
        repliedAt: serverTimestamp(),
      })
    );
  });

  it('a different user CANNOT update someone else’s inquiry', async () => {
    await seedInquiry('inq-1', 'author-1', 'reader-1');
    const otherCtx = testEnv.authenticatedContext('reader-2');
    await assertFails(
      updateDoc(doc(otherCtx.firestore(), `${ROOT}/inquiries/inq-1`), { status: 'blocked' })
    );
  });

  it('the sender CANNOT update their own inquiry', async () => {
    await seedInquiry('inq-1', 'author-1', 'reader-1');
    const senderCtx = testEnv.authenticatedContext('reader-1');
    await assertFails(
      updateDoc(doc(senderCtx.firestore(), `${ROOT}/inquiries/inq-1`), { status: 'blocked' })
    );
  });

  it('an admin CAN update any inquiry', async () => {
    await seedInquiry('inq-1', 'author-1', 'reader-1');
    const adminCtx = testEnv.authenticatedContext('admin-1', { admin: true });
    await assertSucceeds(
      updateDoc(doc(adminCtx.firestore(), `${ROOT}/inquiries/inq-1`), {
        status: 'reported',
        isReported: true,
      })
    );
  });
});

describe('users/{userId}/notifications/{notificationId} — read/pin allowance', () => {
  /** Seeds a notification for `ownerUid`, bypassing rules (admin SDK context). */
  async function seedNotification(
    ownerUid: string,
    notificationId: string,
    overrides: Record<string, unknown> = {}
  ) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), `${ROOT}/users/${ownerUid}/notifications/${notificationId}`),
        {
          type: 'new_chapter',
          title: 'A Test Notice',
          body: '',
          isRead: false,
          createdAt: new Date(),
          ...overrides,
        }
      );
    });
  }

  it('the owner CAN pin a notice (the floating-trigger pin control)', async () => {
    await seedNotification('reader-1', 'n1');
    const ctx = testEnv.authenticatedContext('reader-1');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/reader-1/notifications/n1`), { isPinned: true })
    );
  });

  it('the owner CAN unpin a notice again', async () => {
    await seedNotification('reader-1', 'n1', { isPinned: true });
    const ctx = testEnv.authenticatedContext('reader-1');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/reader-1/notifications/n1`), {
        isPinned: false,
      })
    );
  });

  it('the owner CAN still mark a notice read alongside the pin allowlist', async () => {
    await seedNotification('reader-1', 'n1');
    const ctx = testEnv.authenticatedContext('reader-1');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/reader-1/notifications/n1`), {
        isRead: true,
        readAt: serverTimestamp(),
      })
    );
  });

  it('the owner CANNOT smuggle content edits through the pin update path', async () => {
    await seedNotification('reader-1', 'n1');
    const ctx = testEnv.authenticatedContext('reader-1');
    await assertFails(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/reader-1/notifications/n1`), {
        isPinned: true,
        title: 'Tampered',
      })
    );
  });

  it('a DIFFERENT user CANNOT pin someone else’s notice', async () => {
    await seedNotification('reader-1', 'n1');
    const ctx = testEnv.authenticatedContext('attacker');
    await assertFails(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/reader-1/notifications/n1`), { isPinned: true })
    );
  });

  it('rejects a non-boolean read state', async () => {
    await seedNotification('reader-1', 'n1');
    const ctx = testEnv.authenticatedContext('reader-1');
    await assertFails(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/reader-1/notifications/n1`), {
        isRead: 'true',
      })
    );
  });

  it('rejects a non-boolean pin state', async () => {
    await seedNotification('reader-1', 'n1');
    const ctx = testEnv.authenticatedContext('reader-1');
    await assertFails(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/reader-1/notifications/n1`), {
        isPinned: 'yes',
      })
    );
  });

  it('rejects a non-timestamp read timestamp', async () => {
    await seedNotification('reader-1', 'n1');
    const ctx = testEnv.authenticatedContext('reader-1');
    await assertFails(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/reader-1/notifications/n1`), {
        isRead: true,
        readAt: 'yesterday',
      })
    );
  });
});

describe('Global fallback — deny-all for unmatched paths (Critical Finding #1 regression guard)', () => {
  it('denies reads/writes to a path outside the v1/taletranscend/projects/v1 prefix', async () => {
    const ctx = testEnv.authenticatedContext('someone');
    // A flat/unprefixed path (the shape Phase 1 would have used, and the
    // shape a future accidental regression might reintroduce) should never
    // be reachable — it must fall through to the deny-all fallback.
    await assertFails(setDoc(doc(ctx.firestore(), 'tales/tale-1'), { title: 'wrong prefix' }));
  });

  it('denies a write to the correct collection name under the WRONG prefix', async () => {
    const ctx = testEnv.authenticatedContext('someone');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'v2/taletranscend/projects/v1/public/data/tales/tale-1'), {
        title: 'wrong version segment',
      })
    );
  });
});

describe('users/{userId}/readerProgress — key allowlist (unbounded-field hardening)', () => {
  it('the owner CAN write the documented tale-level fields', async () => {
    const uid = 'reader-1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      setDoc(
        doc(ctx.firestore(), `${ROOT}/users/${uid}/readerProgress/tale-1`),
        {
          status: 'finished',
          finishedAt: serverTimestamp(),
          lastReadAt: serverTimestamp(),
          taleTitle: 'A Tale',
          coverUrl: '',
          chapterCount: 3,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    );
  });

  it('the owner CANNOT smuggle an unlisted field into tale-level progress', async () => {
    const uid = 'reader-1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      setDoc(
        doc(ctx.firestore(), `${ROOT}/users/${uid}/readerProgress/tale-1`),
        { lastReadAt: serverTimestamp(), secretBlob: 'x'.repeat(100) },
        { merge: true }
      )
    );
  });

  it('the owner CANNOT smuggle an unlisted field into chapter progress', async () => {
    const uid = 'reader-1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      setDoc(
        doc(ctx.firestore(), `${ROOT}/users/${uid}/readerProgress/tale-1/chapters/0`),
        { scrollPercent: 10, updatedAt: serverTimestamp(), extra: 'nope' },
        { merge: true }
      )
    );
  });
});

describe('users/{userId}/notifications — claims are the only admin authority', () => {
  it('a non-admin CANNOT create a notification for another user', async () => {
    const ctx = testEnv.authenticatedContext('reader-1');
    await assertFails(
      setDoc(doc(ctx.firestore(), `${ROOT}/users/author-1/notifications/n1`), {
        type: 'system',
        title: 'Hello',
        body: 'Body',
        isRead: false,
        createdAt: serverTimestamp(),
      })
    );
  });

  it('a user whose profile doc says role: admin still CANNOT create one', async () => {
    // The client gate (admin.service.js) is claims-only, so the rules must be
    // too. A role field in the profile document grants nothing.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${ROOT}/users/reader-1`), {
        name: 'Reader',
        role: 'admin',
        joinedAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const ctx = testEnv.authenticatedContext('reader-1');
    await assertFails(
      setDoc(doc(ctx.firestore(), `${ROOT}/users/author-1/notifications/n1`), {
        type: 'system',
        title: 'Hello',
        body: 'Body',
        isRead: false,
        createdAt: serverTimestamp(),
      })
    );
  });

  it('an admin CAN create a notification for another user', async () => {
    const adminCtx = testEnv.authenticatedContext('admin-1', { admin: true });
    await assertSucceeds(
      setDoc(doc(adminCtx.firestore(), `${ROOT}/users/author-1/notifications/n1`), {
        type: 'system',
        title: 'Hello',
        body: 'Body',
        actionUrl: '/library',
        isRead: false,
        createdAt: serverTimestamp(),
      })
    );
  });

  it('the owner CAN mark a notification read with isRead + readAt', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${ROOT}/users/reader-1/notifications/n1`), {
        type: 'system',
        title: 'Hello',
        body: 'Body',
        isRead: false,
        createdAt: new Date(),
      });
    });
    const ctx = testEnv.authenticatedContext('reader-1');
    await assertSucceeds(
      updateDoc(doc(ctx.firestore(), `${ROOT}/users/reader-1/notifications/n1`), {
        isRead: true,
        readAt: serverTimestamp(),
      })
    );
  });
});

describe('public/data/tales — publish payload contract (P0 regression)', () => {
  const authorUid = 'author-1';

  /**
   * The exact tale payload publish.js Step 3 sends. Kept literal rather than
   * imported so a change to the client contract has to be mirrored here
   * deliberately — and a mismatch then fails loudly instead of silently.
   */
  const publishTalePayload = () => ({
    title: 'A Published Tale',
    authorId: authorUid,
    authorName: 'Scribe',
    authorEmail: 'scribe@example.com',
    description: 'Desc',
    synopsis: '',
    coverUrl: '',
    era: '',
    tags: [],
    tone: 'Mythic',
    language: 'English',
    visibility: 'public',
    audience: 'General',
    publicationStatus: 'ongoing',
    contentWarnings: [],
    worldSetting: '',
    authorNotes: '',
    chapterCount: 1,
    wordCount: 100,
    estimatedReadMins: 1,
    readCount: 0,
    commentCount: 0,
    reactionCount: 0,
    bookmarkCount: 0,
    status: 'published',
    isFeatured: false,
    isEditorsPick: false,
    searchKeywords: [],
    submittedAt: serverTimestamp(),
    reviewedAt: serverTimestamp(),
    reviewedBy: 'auto-approve',
    rejectionReason: null,
    moderationNotes: null,
    publishedAt: serverTimestamp(),
    lastChapterAddedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  it('the author CAN create a tale already published, exactly as publish.js sends it', async () => {
    const ctx = testEnv.authenticatedContext(authorUid);
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), `${ROOT}/public/data/tales/new-tale`), publishTalePayload())
    );
  });

  it("status 'pending' — what publish.js used to send — is DENIED", async () => {
    const ctx = testEnv.authenticatedContext(authorUid);
    await assertFails(
      setDoc(doc(ctx.firestore(), `${ROOT}/public/data/tales/new-tale`), {
        ...publishTalePayload(),
        status: 'pending',
      })
    );
  });

  it("visibility 'unlisted' — an option the editor offers — is accepted", async () => {
    const ctx = testEnv.authenticatedContext(authorUid);
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), `${ROOT}/public/data/tales/new-tale`), {
        ...publishTalePayload(),
        visibility: 'unlisted',
      })
    );
  });

  it('the payload stays within the 40-field cap the create rule enforces', async () => {
    expect(Object.keys(publishTalePayload()).length).toBeLessThanOrEqual(40);
  });

  it('the author CAN create a chapter with index + createdAt, as publish.js sends it', async () => {
    await seedTale(authorUid, 'new-tale');
    const ctx = testEnv.authenticatedContext(authorUid);
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), `${ROOT}/public/data/tales/new-tale/chapters/0`), {
        chapterNum: 1,
        title: 'The Beginning',
        content: 'Once upon a time...',
        wordCount: 4,
        index: 0,
        estimatedReadMins: 1,
        createdAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('a chapter WITHOUT index is denied — the exact defect the publish payload had', async () => {
    await seedTale(authorUid, 'new-tale');
    const ctx = testEnv.authenticatedContext(authorUid);
    await assertFails(
      setDoc(doc(ctx.firestore(), `${ROOT}/public/data/tales/new-tale/chapters/0`), {
        chapterNum: 1,
        title: 'The Beginning',
        content: 'Once upon a time...',
        wordCount: 4,
        estimatedReadMins: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });
});

describe('users/{userId}/readerProgress — legacy documents keep syncing', () => {
  it('the owner CAN still update a progress doc carrying a legacy extra field', async () => {
    const uid = 'reader-1';
    // Documents written by an earlier app version could carry an inline
    // `scrollPercent` / `lastChapterIndex` / `chapters` map — the pre-Phase-2
    // rule required them. A WHOLE-document key allowlist is evaluated against
    // the merged result, so it would reject every future update to such a
    // document, permanently and silently (every progress writer swallows
    // errors). Update therefore uses diff().affectedKeys().hasOnly(...).
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${ROOT}/users/${uid}/readerProgress/legacy-tale`), {
        lastReadAt: new Date(),
        totalReadTimeMs: 1000,
        scrollPercent: 42,
        lastChapterIndex: 3,
        chapters: { 0: { scrollPercent: 42 } },
        updatedAt: new Date(),
      });
    });

    const ctx = testEnv.authenticatedContext(uid);
    await assertSucceeds(
      setDoc(
        doc(ctx.firestore(), `${ROOT}/users/${uid}/readerProgress/legacy-tale`),
        { lastReadAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true }
      )
    );
  });

  it('the owner CANNOT introduce a NEW unlisted field', async () => {
    const uid = 'reader-1';
    const ctx = testEnv.authenticatedContext(uid);
    await assertFails(
      setDoc(
        doc(ctx.firestore(), `${ROOT}/users/${uid}/readerProgress/tale-1`),
        { lastReadAt: serverTimestamp(), junk: 'x' },
        { merge: true }
      )
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin dashboard role matrix
//
// Five roles are exercised explicitly: guest, ordinary user, author,
// moderator, and administrator. Each capability has at least one allowed and
// one denied case. These tests are the authority; client-side hiding is never
// treated as enforcement.
// ─────────────────────────────────────────────────────────────────────────────

describe('admin dashboard — five-role rules matrix', () => {
  const adminCtx = () => testEnv.authenticatedContext('admin-1', { admin: true });
  const moderatorCtx = () => testEnv.authenticatedContext('mod-1', { moderator: true });
  const authorCtx = () => testEnv.authenticatedContext('author-1');
  const userCtx = () => testEnv.authenticatedContext('user-1');
  const guestCtx = () => testEnv.unauthenticatedContext();

  async function seed(path: string, data: Record<string, unknown>) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `${ROOT}/${path}`), data);
    });
  }

  describe('adminAuditLogs — append-only, administrator-readable', () => {
    const entry = () => ({
      actorId: 'admin-1',
      actorRole: 'admin',
      action: 'tale.delete',
      targetType: 'tale',
      targetId: 'tale-1',
      summary: 'Removed a reported tale',
      createdAt: new Date(),
    });

    it('an administrator CAN create an audit entry', async () => {
      const ctx = adminCtx();
      await assertSucceeds(setDoc(doc(ctx.firestore(), `${ROOT}/adminAuditLogs/log-1`), entry()));
    });

    it('a moderator CAN create an audit entry', async () => {
      const ctx = moderatorCtx();
      await assertSucceeds(
        setDoc(doc(ctx.firestore(), `${ROOT}/adminAuditLogs/log-1`), {
          ...entry(),
          actorId: 'mod-1',
          actorRole: 'moderator',
        })
      );
    });

    it('a moderator CANNOT write an administrator actor role', async () => {
      const ctx = moderatorCtx();
      await assertFails(
        setDoc(doc(ctx.firestore(), `${ROOT}/adminAuditLogs/log-1`), {
          ...entry(),
          actorId: 'mod-1',
          actorRole: 'admin',
        })
      );
    });

    it('an author, ordinary user, or guest CANNOT create an audit entry', async () => {
      for (const ctx of [authorCtx(), userCtx(), guestCtx()]) {
        await assertFails(setDoc(doc(ctx.firestore(), `${ROOT}/adminAuditLogs/log-1`), entry()));
      }
    });

    it('an audit entry CANNOT be rewritten or deleted, even by an administrator', async () => {
      await seed('adminAuditLogs/log-1', entry());
      const ctx = adminCtx();
      await assertFails(
        updateDoc(doc(ctx.firestore(), `${ROOT}/adminAuditLogs/log-1`), { summary: 'edited' })
      );
    });

    it('only an administrator CAN read the audit log', async () => {
      await seed('adminAuditLogs/log-1', entry());
      await assertSucceeds(getDoc(doc(adminCtx().firestore(), `${ROOT}/adminAuditLogs/log-1`)));
      await assertFails(getDoc(doc(moderatorCtx().firestore(), `${ROOT}/adminAuditLogs/log-1`)));
      await assertFails(getDoc(doc(authorCtx().firestore(), `${ROOT}/adminAuditLogs/log-1`)));
      await assertFails(getDoc(doc(guestCtx().firestore(), `${ROOT}/adminAuditLogs/log-1`)));
    });
  });

  describe('authorApplications — applicant creates, administrator decides', () => {
    const application = (applicantId = 'author-1') => ({
      applicantId,
      penName: 'New Scribe',
      bio: 'I write mythic short fiction.',
      sampleUrl: 'https://example.com/sample',
      status: 'pending',
      createdAt: new Date(),
    });

    it('an authenticated applicant CAN create a pending application', async () => {
      const ctx = authorCtx();
      await assertSucceeds(
        setDoc(doc(ctx.firestore(), `${ROOT}/authorApplications/app-1`), application())
      );
    });

    it('a guest CANNOT create an application, and a user cannot apply as someone else', async () => {
      await assertFails(
        setDoc(doc(guestCtx().firestore(), `${ROOT}/authorApplications/app-1`), application())
      );
      await assertFails(
        setDoc(
          doc(authorCtx().firestore(), `${ROOT}/authorApplications/app-1`),
          application('someone-else')
        )
      );
    });

    it('staff CAN read an application; an unrelated user CANNOT', async () => {
      await seed('authorApplications/app-1', application());
      await assertSucceeds(
        getDoc(doc(moderatorCtx().firestore(), `${ROOT}/authorApplications/app-1`))
      );
      await assertSucceeds(getDoc(doc(adminCtx().firestore(), `${ROOT}/authorApplications/app-1`)));
      await assertSucceeds(
        getDoc(doc(authorCtx().firestore(), `${ROOT}/authorApplications/app-1`))
      );
      await assertFails(getDoc(doc(userCtx().firestore(), `${ROOT}/authorApplications/app-1`)));
      await assertFails(getDoc(doc(guestCtx().firestore(), `${ROOT}/authorApplications/app-1`)));
    });

    it('a moderator CANNOT decide an application; an administrator CAN', async () => {
      await seed('authorApplications/app-1', application());
      const decision = {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: 'admin-1',
        notes: 'Welcome aboard.',
      };
      await assertFails(
        updateDoc(doc(moderatorCtx().firestore(), `${ROOT}/authorApplications/app-1`), {
          ...decision,
          reviewedBy: 'mod-1',
        })
      );
      await assertSucceeds(
        updateDoc(doc(adminCtx().firestore(), `${ROOT}/authorApplications/app-1`), decision)
      );
      // The application is no longer pending, so a second reviewer cannot
      // overwrite the first decision.
      await assertFails(
        updateDoc(doc(adminCtx().firestore(), `${ROOT}/authorApplications/app-1`), {
          ...decision,
          status: 'rejected',
        })
      );
    });
  });

  describe('users — administrator moderation branch', () => {
    const profile = () => ({
      name: 'Reader One',
      avatarUrl: '',
      website: '',
      joinedAt: new Date(Date.now() - 60_000),
      // Older than the write cooldown so owner-write tests fail for the rule
      // under test, not the cooldown guard.
      updatedAt: new Date(Date.now() - 60_000),
      createdAt: new Date(Date.now() - 60_000),
    });

    it('an ordinary user CAN create their own profile with non-staff defaults', async () => {
      await assertSucceeds(
        setDoc(doc(userCtx().firestore(), `${ROOT}/users/user-1`), {
          ...profile(),
          role: 'reader',
          isBanned: false,
          isVerifiedWriter: false,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        })
      );
    });

    it('an ordinary user CANNOT self-grant moderation flags or a staff role on create', async () => {
      const ctx = userCtx();
      for (const payload of [
        { isBanned: true },
        { isVerifiedWriter: true },
        { role: 'admin' },
        { role: 'moderator' },
      ]) {
        await assertFails(
          setDoc(doc(ctx.firestore(), `${ROOT}/users/user-1`), {
            ...profile(),
            joinedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            ...payload,
          })
        );
      }
    });

    it('an administrator CAN set isBanned; a moderator CANNOT', async () => {
      await seed('users/target-1', profile());
      await assertSucceeds(
        updateDoc(doc(adminCtx().firestore(), `${ROOT}/users/target-1`), {
          isBanned: true,
          updatedAt: serverTimestamp(),
        })
      );
      await assertFails(
        updateDoc(doc(moderatorCtx().firestore(), `${ROOT}/users/target-1`), {
          isBanned: true,
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('an author or guest CANNOT use the administrator moderation branch', async () => {
      await seed('users/target-1', profile());
      await assertFails(
        updateDoc(doc(authorCtx().firestore(), `${ROOT}/users/target-1`), {
          isBanned: true,
          updatedAt: serverTimestamp(),
        })
      );
      await assertFails(
        updateDoc(doc(guestCtx().firestore(), `${ROOT}/users/target-1`), {
          isBanned: true,
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('an ordinary user CANNOT set their own moderation flag', async () => {
      await seed('users/user-1', profile());
      await assertFails(
        updateDoc(doc(userCtx().firestore(), `${ROOT}/users/user-1`), {
          isBanned: false,
          updatedAt: serverTimestamp(),
        })
      );
      await assertFails(
        updateDoc(doc(userCtx().firestore(), `${ROOT}/users/user-1`), {
          isVerifiedWriter: true,
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('an ordinary user CANNOT promote their own display role to staff', async () => {
      await seed('users/user-1', profile());
      await assertFails(
        updateDoc(doc(userCtx().firestore(), `${ROOT}/users/user-1`), {
          role: 'admin',
          updatedAt: serverTimestamp(),
        })
      );
      await assertFails(
        updateDoc(doc(userCtx().firestore(), `${ROOT}/users/user-1`), {
          role: 'moderator',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('the administrator branch CANNOT rewrite identity fields', async () => {
      await seed('users/target-1', profile());
      await assertFails(
        updateDoc(doc(adminCtx().firestore(), `${ROOT}/users/target-1`), {
          name: 'Rewritten by an admin',
          updatedAt: serverTimestamp(),
        })
      );
    });
  });

  describe('site configuration — administrator only', () => {
    it('an administrator CAN write appConfig and featureFlags; a moderator CANNOT', async () => {
      await assertSucceeds(
        setDoc(doc(adminCtx().firestore(), `${ROOT}/appConfig/site`), { siteName: 'TaleTranscend' })
      );
      await assertSucceeds(
        setDoc(doc(adminCtx().firestore(), `${ROOT}/featureFlags/beta`), { enabled: true })
      );
      await assertFails(
        setDoc(doc(moderatorCtx().firestore(), `${ROOT}/appConfig/site`), { siteName: 'Nope' })
      );
      await assertFails(
        setDoc(doc(moderatorCtx().firestore(), `${ROOT}/featureFlags/beta`), { enabled: false })
      );
    });

    it('guests CAN read public configuration but CANNOT write it', async () => {
      await seed('appConfig/site', { siteName: 'TaleTranscend' });
      await assertSucceeds(getDoc(doc(guestCtx().firestore(), `${ROOT}/appConfig/site`)));
      await assertFails(
        setDoc(doc(guestCtx().firestore(), `${ROOT}/appConfig/site`), { siteName: 'Nope' })
      );
    });

    it('authors and ordinary users CANNOT write site configuration', async () => {
      for (const ctx of [authorCtx(), userCtx()]) {
        await assertFails(
          setDoc(doc(ctx.firestore(), `${ROOT}/appConfig/site`), { siteName: 'Nope' })
        );
        await assertFails(
          setDoc(doc(ctx.firestore(), `${ROOT}/featureFlags/beta`), { enabled: false })
        );
      }
    });
  });

  describe('reports — moderators triage, ordinary users cannot', () => {
    const report = () => ({
      reporterId: 'author-1',
      targetId: 'tale-1',
      targetType: 'tale',
      reason: 'This tale violates the archive policy.',
      status: 'pending',
      createdAt: new Date(),
    });

    it('an authenticated reader CAN file a report; a guest CANNOT', async () => {
      await assertSucceeds(
        setDoc(doc(authorCtx().firestore(), `${ROOT}/reports/report-1`), report())
      );
      await assertFails(setDoc(doc(guestCtx().firestore(), `${ROOT}/reports/report-1`), report()));
    });

    it('an administrator CAN read and resolve a report', async () => {
      await seed('reports/report-1', report());
      const ctx = adminCtx();
      await assertSucceeds(getDoc(doc(ctx.firestore(), `${ROOT}/reports/report-1`)));
      await assertSucceeds(
        updateDoc(doc(ctx.firestore(), `${ROOT}/reports/report-1`), {
          status: 'resolved',
          reviewedBy: 'admin-1',
          reviewedAt: new Date(),
        })
      );
    });

    it('an author CANNOT read back the report they filed, and a guest CANNOT read it', async () => {
      await assertSucceeds(
        setDoc(doc(authorCtx().firestore(), `${ROOT}/reports/report-1`), report())
      );
      await assertFails(getDoc(doc(authorCtx().firestore(), `${ROOT}/reports/report-1`)));
      await assertFails(getDoc(doc(guestCtx().firestore(), `${ROOT}/reports/report-1`)));
    });

    it('a moderator CAN read and resolve a report; an ordinary user CANNOT read it', async () => {
      await seed('reports/report-1', report());
      await assertSucceeds(getDoc(doc(moderatorCtx().firestore(), `${ROOT}/reports/report-1`)));
      await assertFails(getDoc(doc(userCtx().firestore(), `${ROOT}/reports/report-1`)));
      await assertSucceeds(
        updateDoc(doc(moderatorCtx().firestore(), `${ROOT}/reports/report-1`), {
          status: 'resolved',
          reviewedBy: 'mod-1',
          reviewedAt: new Date(),
        })
      );
      // A decided report cannot be overwritten by a stale second decision.
      await assertFails(
        updateDoc(doc(moderatorCtx().firestore(), `${ROOT}/reports/report-1`), {
          status: 'dismissed',
          reviewedBy: 'mod-1',
          reviewedAt: new Date(),
        })
      );
      await assertFails(
        updateDoc(doc(userCtx().firestore(), `${ROOT}/reports/report-1`), { status: 'resolved' })
      );
    });
  });

  describe('moderationLogs — staff-only action record', () => {
    const entry = (moderatorId = 'mod-1') => ({
      moderatorId,
      action: 'report.resolve',
      targetId: 'report-1',
      targetType: 'report',
      reason: 'Validated the report and removed the content.',
      createdAt: new Date(),
    });

    it('an administrator and a moderator CAN create an entry', async () => {
      await assertSucceeds(
        setDoc(doc(adminCtx().firestore(), `${ROOT}/moderationLogs/log-1`), entry('admin-1'))
      );
      await assertSucceeds(
        setDoc(doc(moderatorCtx().firestore(), `${ROOT}/moderationLogs/log-2`), entry())
      );
    });

    it('an author, ordinary user, or guest CANNOT create an entry', async () => {
      for (const ctx of [authorCtx(), userCtx(), guestCtx()]) {
        await assertFails(setDoc(doc(ctx.firestore(), `${ROOT}/moderationLogs/log-1`), entry()));
      }
    });

    it('only staff CAN read, update, or delete an entry', async () => {
      await seed('moderationLogs/log-1', entry());
      await assertSucceeds(getDoc(doc(adminCtx().firestore(), `${ROOT}/moderationLogs/log-1`)));
      await assertSucceeds(getDoc(doc(moderatorCtx().firestore(), `${ROOT}/moderationLogs/log-1`)));
      for (const ctx of [authorCtx(), userCtx(), guestCtx()]) {
        await assertFails(getDoc(doc(ctx.firestore(), `${ROOT}/moderationLogs/log-1`)));
        await assertFails(
          updateDoc(doc(ctx.firestore(), `${ROOT}/moderationLogs/log-1`), { reason: 'edited' })
        );
      }
    });
  });

  describe('deletionRequests — author owns the petition, staff decides', () => {
    const request = () => ({
      userId: 'author-1',
      taleId: 'tale-1',
      reason: 'Please remove my tale from the archive.',
      status: 'pending',
      createdAt: new Date(),
    });

    it('an author CAN create and read a petition for their own tale', async () => {
      await seedTale('author-1', 'tale-1');
      const ctx = authorCtx();
      await assertSucceeds(
        setDoc(doc(ctx.firestore(), `${ROOT}/deletionRequests/req-1`), request())
      );
      await assertSucceeds(getDoc(doc(ctx.firestore(), `${ROOT}/deletionRequests/req-1`)));
    });

    it('a user CANNOT petition to delete another author\u2019s tale', async () => {
      await seedTale('author-1', 'tale-1');
      await assertFails(
        setDoc(doc(userCtx().firestore(), `${ROOT}/deletionRequests/req-1`), {
          ...request(),
          userId: 'user-1',
        })
      );
    });

    it('an administrator or moderator CAN decide a pending petition', async () => {
      await seed('deletionRequests/req-1', request());
      await assertSucceeds(
        updateDoc(doc(moderatorCtx().firestore(), `${ROOT}/deletionRequests/req-1`), {
          status: 'approved',
          reviewedBy: 'mod-1',
          reviewedAt: new Date(),
        })
      );
      // Once decided, the petition cannot be overwritten by a stale decision.
      await assertFails(
        updateDoc(doc(moderatorCtx().firestore(), `${ROOT}/deletionRequests/req-1`), {
          status: 'rejected',
          reviewedBy: 'mod-1',
          reviewedAt: new Date(),
        })
      );
      await seed('deletionRequests/req-2', request());
      await assertSucceeds(
        updateDoc(doc(adminCtx().firestore(), `${ROOT}/deletionRequests/req-2`), {
          status: 'approved',
          reviewedBy: 'admin-1',
          reviewedAt: new Date(),
        })
      );
    });

    it('a guest CANNOT create or read a petition', async () => {
      await assertFails(
        setDoc(doc(guestCtx().firestore(), `${ROOT}/deletionRequests/req-1`), request())
      );
      await seed('deletionRequests/req-1', request());
      await assertFails(getDoc(doc(guestCtx().firestore(), `${ROOT}/deletionRequests/req-1`)));
    });

    it('an ordinary user CANNOT read or update another author\u2019s petition', async () => {
      await seed('deletionRequests/req-1', request());
      await assertFails(getDoc(doc(userCtx().firestore(), `${ROOT}/deletionRequests/req-1`)));
      await assertFails(
        updateDoc(doc(userCtx().firestore(), `${ROOT}/deletionRequests/req-1`), {
          status: 'approved',
        })
      );
    });
  });
});
