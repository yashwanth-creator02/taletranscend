// src/features/profile/ai-name.js
// AI helper for profile name suggestions.

import { createLogger } from '@/utils';

const log = createLogger('AIName');

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Suggests a mythic or folklore-inspired name based on a user bio.
 *
 * @param {string} bio - User biography
 * @param {string} apiKey - Gemini API Key
 * @returns {Promise<string|null>}
 */
export async function suggestNameFromBio(bio, apiKey) {
  if (!bio || !apiKey) return null;

  try {
    const prompt = `Based on this user bio: "${bio}", suggest ONE unique, mythic, or folklore-inspired name for a storyteller/chronicler. Return ONLY the name, no punctuation or explanation.`;

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return raw.trim() || null;
  } catch (err) {
    log.error('Suggestion failed:', err);
    return null;
  }
}
