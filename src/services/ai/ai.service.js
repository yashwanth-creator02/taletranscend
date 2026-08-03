// src/services/ai/ai.service.js
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
 * Sanitizes input to prevent prompt injection and remove control characters.
 */
function sanitizePrompt(input) {
  if (!input) return '';
  // Remove control characters and limit length
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 2000);
}

/**
 * Internal Gemini implementation with retries and safety.
 */
async function _callGemini(text, apiKey, { maxRetries = 3 } = {}) {
  const cleanText = sanitizePrompt(text);
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      log.debug('Calling Gemini API', { model: GEMINI_MODEL, attempt });
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: cleanText }] }],
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const result = raw.trim() || null;

        if (result) {
          log.info('Gemini response received and parsed successfully');
        } else {
          log.warn('Gemini returned an empty or invalid response');
        }

        return result;
      }

      log.warn('Gemini request failed', {
        status: res.status,
        statusText: res.statusText,
        attempt,
      });

      // Retry on 429 (Rate Limit) or 5xx (Server Error)
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        attempt++;
        if (attempt <= maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          log.info(`Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      return null;
    } catch (err) {
      log.error('AI Request error', err);
      attempt++;
      if (attempt <= maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return null;
    }
  }

  return null;
}
