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

import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { setDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const PROJECT_ID = 'taletranscend-rules-test';
const ROOT = 'v1/taletranscend/projects/v1';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore/firestore.rules', 'utf8'),
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
