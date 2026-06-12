// src/state/schemas/__tests__/notification.schema.test.js
import { describe, it, expect } from 'vitest';
import { createNotification } from '../notification.schema.js';

describe('NotificationSchema', () => {
  it('creates notification with defaults', () => {
    const n = createNotification('n1');
    expect(n.id).toBe('n1');
    expect(n.type).toBe('new_comment');
    expect(n.isRead).toBe(false);
  });

  it('merges partial data', () => {
    const n = createNotification('n1', { type: 'reply', title: 'New Reply' });
    expect(n.type).toBe('reply');
    expect(n.title).toBe('New Reply');
  });
});
