// src/pages/profile/ai-name.js
// Suggests a fantasy character name from a user bio.
//
// Currently wired to Gemini. To switch to Claude or any other provider,
// replace the body of _callGemini() only — the public interface stays the same.
//
// Hook points for future swap:
//   - Export AI_PROVIDER constant and branch in suggestNameFromBio()
//   - Or replace _callGemini with _callClaude(bioText) returning Promise<string|null>

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Suggests a short fantasy character name based on the provided bio text.
 * Returns null if the input is too short, no API key is available, or the request fails.
 *
 * @param {string} bioText - The user's bio or character description
 * @param {string} [apiKey] - Gemini API key (injected by caller, not hardcoded here)
 * @returns {Promise<string|null>} Suggested character name or null on failure
 */
export async function suggestNameFromBio(bioText, apiKey) {
  if (!bioText || bioText.trim().length < 5) return null;
  if (!apiKey) {
    console.warn('[ai-name] No API key provided — name suggestion skipped.');
    return null;
  }

  return _callGemini(bioText, apiKey);
}

/**
 * Internal Gemini implementation.
 * Swap this function to change the AI provider without touching callers.
 *
 * @param {string} bioText
 * @param {string} apiKey
 * @returns {Promise<string|null>}
 */
async function _callGemini(bioText, apiKey) {
  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: bioText }] }],
        systemInstruction: {
          parts: [
            {
              text: 'Suggest ONE short fantasy character name (2–3 words max). Return ONLY the name, no punctuation.',
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      console.warn('[ai-name] Gemini request failed:', res.status);
      return null;
    }

    const json = await res.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return raw.replace(/['".,!?]/g, '').trim() || null;
  } catch (err) {
    console.error('[ai-name] Request error:', err);
    return null;
  }
}

/**
 * Hook point for Claude implementation (not yet active).
 * When ready: import { callClaude } from '@services/claude.js' and call here.
 *
 * @param {string} _bioText
 * @returns {Promise<string|null>}
 */
// eslint-disable-next-line no-unused-vars
async function _callClaude(_bioText) {
  // TODO: implement Claude name suggestion
  // const response = await fetch('https://api.anthropic.com/v1/messages', { ... });
  return null;
}
