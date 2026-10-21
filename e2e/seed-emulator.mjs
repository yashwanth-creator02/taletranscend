#!/usr/bin/env node
// Seeds the Firestore emulator with a small, deterministic library.
//
// The e2e suite asserts on real tale cards, which used to require production
// credentials. This script runs before Playwright inside `emulators:exec` and
// writes through the emulator's admin bypass, so no rules or auth are needed.

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-taletranscend';
const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const COLLECTION = 'v1/taletranscend/projects/v1/public/data/tales';
const SEED_COUNT = 25;

const now = Date.now();

function timestamp(offsetMs) {
  return new Date(now - offsetMs).toISOString();
}

function taleFields(index) {
  const publishedAt = timestamp(index * 60_000);
  return {
    title: { stringValue: `Ember Archive Tale ${String(index).padStart(2, '0')}` },
    authorId: { stringValue: 'seed-author' },
    authorName: { stringValue: 'Ember Scribe' },
    description: { stringValue: `Seeded tale ${index} for the CI archive.` },
    synopsis: { stringValue: `Seeded tale ${index} for the CI archive.` },
    coverUrl: { stringValue: '' },
    era: { stringValue: 'Second Age' },
    tags: { arrayValue: { values: [{ stringValue: 'ember' }, { stringValue: 'seed' }] } },
    tone: { stringValue: 'Mythic' },
    language: { stringValue: 'English' },
    audience: { stringValue: 'General' },
    visibility: { stringValue: 'public' },
    contentWarnings: { arrayValue: { values: [] } },
    chapterCount: { integerValue: '1' },
    wordCount: { integerValue: '1200' },
    estimatedReadMins: { integerValue: '6' },
    readCount: { integerValue: '0' },
    commentCount: { integerValue: '0' },
    reactionCount: { integerValue: '0' },
    bookmarkCount: { integerValue: '0' },
    status: { stringValue: 'published' },
    isFeatured: { booleanValue: false },
    isEditorsPick: { booleanValue: false },
    publishedAt: { timestampValue: publishedAt },
    createdAt: { timestampValue: publishedAt },
    updatedAt: { timestampValue: publishedAt },
  };
}

async function main() {
  const base = `http://${HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}`;

  for (let index = 1; index <= SEED_COUNT; index += 1) {
    const id = `seed-tale-${String(index).padStart(2, '0')}`;
    // PATCH creates the document when absent and replaces it when present, so
    // re-running the script on a warm emulator is idempotent.
    const res = await fetch(`${base}/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer owner',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: taleFields(index) }),
    });
    if (!res.ok) {
      throw new Error(`seed ${id} failed: ${res.status} ${await res.text()}`);
    }
  }

  console.log(`seeded ${SEED_COUNT} published tales into ${PROJECT_ID}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
