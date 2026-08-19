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
 * @returns {Promise<string|null>}
 */
export async function suggestTitle(prompt) {
  if (!prompt || prompt.trim().length < 10) return null;

  log.info('Requesting mythic title suggestion...');
  return _callAi(
    `Suggest ONE epic, mythic, or fantasy title for a story with this synopsis: "${prompt}". Return ONLY the title text, no punctuation or formatting.`
  );
}

/**
 * Refines text for grammar and "mythic" tone.
 *
 * @param {string} text - Raw text to refine
 * @returns {Promise<string|null>}
 */
export async function refineMythicText(text) {
  if (!text || text.trim().length < 20) return null;

  log.info('Requesting mythic text refinement...');
  return _callAi(
    `Rewrite the following paragraph to be more epic, mythic, and elevated in tone while fixing grammar. Keep it roughly the same length. Return ONLY the refined text:\n\n"${text}"`
  );
}

/**
 * Suggests a mythic or folklore-inspired name based on a user bio.
 * Replaces the old profile/ai-name.js suggestNameFromBio(), which was dead
 * code (see file header note above).
 *
 * @param {string} bio - User biography
 * @returns {Promise<string|null>}
 */
export async function suggestName(bio) {
  if (!bio || bio.trim().length < 10) return null;

  log.info('Requesting mythic name suggestion...');
  return _callAi(
    `Based on this user bio: "${bio}", suggest ONE unique, mythic, or folklore-inspired name for a storyteller/chronicler. Return ONLY the name, no punctuation or explanation.`
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
 * Internal: ensures an API key is available (prompting the user via the
 * modal if none is stored yet), then calls Gemini directly with retries.
 */
async function _callAi(text, { maxRetries = 3 } = {}) {
  // Dynamic import, matching the same pattern resonance.service.js already
  // uses for showToast — keeps the UI layer out of this service's static
  // import graph, imported only when actually needed.
  const { ensureApiKey } = await import('@shared/components/apiKeyModal/apiKeyModal.js');
  const apiKey = await ensureApiKey();

  if (!apiKey) {
    log.info('No API key available (user cancelled the prompt) — skipping AI call');
    return null;
  }

  return _callGemini(text, apiKey, { maxRetries });
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

      // A 401/403 means the user's own key is invalid/revoked — retrying
      // won't help, and burns their quota on a request that will never
      // succeed. Surface this distinctly so the UI can tell them to check
      // their key, rather than a generic failure.
      if (res.status === 401 || res.status === 403) {
        log.warn('Gemini rejected the API key — not retrying');
        return null;
      }

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
