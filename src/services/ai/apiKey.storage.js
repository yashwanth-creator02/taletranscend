// src/services/ai/apiKey.storage.js

const STORAGE_KEY = 'taletranscend:gemini_api_key';

/** Returns the stored API key, or null if none is set. */
export function getStoredApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/** Returns true if a non-empty API key is currently stored. */
export function hasApiKey() {
  const key = getStoredApiKey();
  return typeof key === 'string' && key.trim().length > 0;
}

/** Stores the given API key. Throws if `key` is empty/not a string, so
 *  callers (the modal) can show a validation error instead of silently
 *  saving nothing. */
export function setApiKey(key) {
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new Error('API key must be a non-empty string.');
  }
  localStorage.setItem(STORAGE_KEY, key.trim());
}

/** Clears the stored API key. */
export function clearApiKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
