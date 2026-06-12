// src/firebase/__tests__/index.test.js
import { describe, it, expect, vi } from 'vitest';

vi.mock('../auth.js', () => ({
  auth: { uid: 'mock-auth' },
}));

vi.mock('../db.js', () => ({
  db: { id: 'mock-db' },
}));

vi.mock('../refs.js', () => ({
  refs: { tales: vi.fn() },
}));

vi.mock('../paths.js', () => ({
  PATHS: {},
  APP_ROOT: 'v1',
}));

vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({ debug: vi.fn() })),
}));

describe('firebase/index', () => {
  it('exports firebase modules', async () => {
    const firebase = await import('../index.js');
    expect(firebase.auth).toBeDefined();
    expect(firebase.db).toBeDefined();
    expect(firebase.refs).toBeDefined();
  });
});
