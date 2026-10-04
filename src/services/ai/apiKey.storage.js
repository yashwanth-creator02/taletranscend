// src/services/ai/apiKey.storage.js
// Local storage manager for user's Gemini API key (BYOK design).
// Keeps the key strictly in the user's browser localStorage.

import { STORAGE_KEYS, AI_API_KEY } from '@config/app.config.js';

const STORAGE_KEY = STORAGE_KEYS.geminiApiKey || 'tt-gemini-api-key';

/**
 * Retrieves the Gemini API key from localStorage or fallback env var.
 * @returns {string}
 */
export function getStoredApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || AI_API_KEY || '';
  } catch {
    return AI_API_KEY || '';
  }
}

/**
 * Saves the Gemini API key to localStorage.
 * @param {string} key
 */
export function setStoredApiKey(key) {
  try {
    if (!key || !key.trim()) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, key.trim());
    }
  } catch {
    // Ignore storage quota/permission errors
  }
}

/**
 * Clears the stored Gemini API key.
 */
export function clearStoredApiKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Checks if a Gemini API key is available.
 * @returns {boolean}
 */
export function hasApiKey() {
  return Boolean(getStoredApiKey());
}
