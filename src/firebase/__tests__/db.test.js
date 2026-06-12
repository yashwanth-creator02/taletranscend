import { describe, it, expect, vi } from 'vitest';
import { db, doc, collection } from '../db.js';

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ type: 'firestore-instance' })),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  where: vi.fn(),
  increment: vi.fn(),
  getCountFromServer: vi.fn(),
}));

vi.mock('../app.js', () => ({
  default: {},
}));

vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('firebase/db', () => {
  it('initializes firestore instance', () => {
    expect(db).toBeDefined();
    expect(db.type).toBe('firestore-instance');
  });

  it('exports firestore utilities', () => {
    expect(doc).toBeDefined();
    expect(collection).toBeDefined();
  });
});
