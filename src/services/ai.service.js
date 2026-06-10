// src/services/ai.service.js
// Centralized AI Oracle Service.
// Interface for all generative and assistive features.

import { createLogger } from '@/utils';

const log = createLogger('AIService');

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Generates a mythic title based on a synopsis or draft content.
 *
 * @param {string} prompt - Synopsis or snippet
 * @param {string} apiKey - API Key
 * @returns {Promise<string|null>}
 */
export async function suggestTitle(prompt, apiKey) {
  if (!prompt || prompt.trim().length < 10) return null;

  log.info('Requesting mythic title suggestion...');
  return _callGemini(
    `Suggest ONE epic, mythic, or fantasy title for a story with this synopsis: "${prompt}". Return ONLY the title text, no punctuation or formatting.`,
    apiKey
  );
}

/**
 * Refines text for grammar and "mythic" tone.
 *
 * @param {string} text - Raw text to refine
 * @param {string} apiKey - API Key
 * @returns {Promise<string|null>}
 */
export async function refineMythicText(text, apiKey) {
  if (!text || text.trim().length < 20) return null;

  log.info('Requesting mythic text refinement...');
  return _callGemini(
    `Rewrite the following paragraph to be more epic, mythic, and elevated in tone while fixing grammar. Keep it roughly the same length. Return ONLY the refined text:\n\n"${text}"`,
    apiKey
  );
}

/**
 * Internal Gemini implementation.
 */
async function _callGemini(text, apiKey) {
  log.debug('Calling Gemini API', { model: GEMINI_MODEL });
  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
      }),
    });

    if (!res.ok) {
      log.warn('Gemini request failed', { status: res.status, statusText: res.statusText });
      return null;
    }

    const json = await res.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const result = raw.trim() || null;

    if (result) {
      log.info('Gemini response received and parsed successfully');
    } else {
      log.warn('Gemini returned an empty or invalid response');
    }

    return result;
  } catch (err) {
    log.error('AI Request error', err);
    return null;
  }
}
