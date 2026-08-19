// src/services/ai/ai.service.js
// Centralized AI Oracle Service.
// Interface for all generative and assistive features.

import { createLogger } from '@/utils';

const log = createLogger('AIService');

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Generates a mythic title based on a synopsis or draft content.
 *
 * @param {string} prompt - Synopsis or snippet
 * @returns {Promise<string|null>}
 */
export async function suggestTitle(prompt) {
  if (!prompt || prompt.trim().length < 10) {
    log.warn('suggestTitle called with invalid prompt');
    return null;
  }

  log.info('Requesting mythic title suggestion...');

  return _callAi(
    `Suggest ONE epic, mythic, or fantasy title for a story with this synopsis:

"${prompt}"

Return ONLY the title text, with no punctuation, quotes, markdown, or explanation.`
  );
}

/**
 * Refines text for grammar and "mythic" tone.
 *
 * @param {string} text - Raw text to refine
 * @returns {Promise<string|null>}
 */
export async function refineMythicText(text) {
  if (!text || text.trim().length < 20) {
    log.warn('refineMythicText called with invalid text');
    return null;
  }

  log.info('Requesting mythic text refinement...');

  return _callAi(
    `Rewrite the following paragraph to be more epic, mythic, and elevated in tone while fixing grammar.

Keep it roughly the same length.

Return ONLY the refined text.

"${text}"`
  );
}

/**
 * Suggests a mythic or folklore-inspired name based on a user bio.
 *
 * @param {string} bio - User biography
 * @returns {Promise<string|null>}
 */
export async function suggestName(bio) {
  if (!bio || bio.trim().length < 10) {
    log.warn('suggestName called with invalid bio');
    return null;
  }

  log.info('Requesting mythic name suggestion...');

  return _callAi(
    `Based on this user bio:

"${bio}"

Suggest ONE unique, mythic, or folklore-inspired name for a storyteller or chronicler.

Return ONLY the name, with no punctuation, quotes, markdown, or explanation.`
  );
}

/**
 * Sanitizes input before sending it to Gemini.
 *
 * @param {string} input
 * @returns {string}
 */
function sanitizePrompt(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove control characters.
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 8000);
}

/**
 * Ensures an API key exists and calls Gemini.
 *
 * This function is intentionally defensive:
 * any unexpected error results in null instead of
 * breaking the UI.
 *
 * @param {string} text
 * @param {{maxRetries?: number}} options
 * @returns {Promise<string|null>}
 */
async function _callAi(text, { maxRetries = 2 } = {}) {
  try {
    const { ensureApiKey } = await import('@shared/components/apiKeyModal/apiKeyModal.js');

    if (typeof ensureApiKey !== 'function') {
      log.error('ensureApiKey is not available');
      return null;
    }

    let apiKey;

    try {
      apiKey = await ensureApiKey();
    } catch (error) {
      log.error('Failed to obtain Gemini API key', error);
      return null;
    }

    if (!apiKey || typeof apiKey !== 'string') {
      log.info('No API key available. User may have cancelled.');
      return null;
    }

    return await _callGemini(text, apiKey, { maxRetries });
  } catch (error) {
    log.error('Unexpected AI service error', error);
    return null;
  }
}

/**
 * Calls Gemini with retries.
 *
 * @param {string} text
 * @param {string} apiKey
 * @param {{maxRetries?: number}} options
 * @returns {Promise<string|null>}
 */
async function _callGemini(text, apiKey, { maxRetries = 2 } = {}) {
  const cleanText = sanitizePrompt(text);

  if (!cleanText) {
    log.warn('Gemini request skipped because prompt is empty');
    return null;
  }

  if (!apiKey) {
    log.warn('Gemini request skipped because API key is missing');
    return null;
  }

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      log.debug('Calling Gemini API', {
        model: GEMINI_MODEL,
        attempt: attempt + 1,
        maxRetries,
      });

      const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                },
              ],
            },
          ],

          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 500,
          },

          safetySettings: [
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        }),
      });

      /*
       * Always try to parse the response.
       * Gemini returns useful error information in JSON
       * even when response.ok is false.
       */
      let data = null;
      let responseText = '';

      try {
        responseText = await response.text();

        if (responseText) {
          try {
            data = JSON.parse(responseText);
          } catch {
            data = null;
          }
        }
      } catch (error) {
        log.error('Failed to read Gemini response body', error);
      }

      if (response.ok) {
        const result = extractGeminiText(data);

        if (result) {
          log.info('Gemini response received successfully');
          return result;
        }

        log.warn('Gemini returned no usable text', {
          finishReason: data?.candidates?.[0]?.finishReason,
          promptFeedback: data?.promptFeedback,
          response: data,
        });

        return null;
      }

      /*
       * Extract Google's actual error message.
       */
      const errorMessage =
        data?.error?.message || data?.error?.status || responseText || 'Unknown Gemini API error';

      log.error('Gemini API request failed', {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage,
        attempt: attempt + 1,
      });

      /*
       * Invalid / expired API key.
       */
      if (response.status === 400) {
        log.error('Gemini rejected the request as invalid.', {
          message: errorMessage,
        });

        return null;
      }

      /*
       * Unauthorized / forbidden.
       */
      if (response.status === 401 || response.status === 403) {
        log.error('Gemini API key is invalid, expired, or unauthorized.', {
          message: errorMessage,
        });

        return null;
      }

      /*
       * Model not found.
       */
      if (response.status === 404) {
        log.error('Gemini model or endpoint was not found.', {
          model: GEMINI_MODEL,
          endpoint: GEMINI_ENDPOINT,
          message: errorMessage,
        });

        return null;
      }

      /*
       * Rate limited.
       */
      if (response.status === 429) {
        attempt++;

        if (attempt <= maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);

          log.warn(`Gemini rate limited. Retrying in ${delay}ms...`);

          await sleep(delay);
          continue;
        }

        log.error('Gemini rate limit retries exhausted');
        return null;
      }

      /*
       * Server errors.
       */
      if (response.status >= 500 && response.status <= 599) {
        attempt++;

        if (attempt <= maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);

          log.warn(`Gemini server error. Retrying in ${delay}ms...`);

          await sleep(delay);
          continue;
        }

        log.error('Gemini server error retries exhausted');
        return null;
      }

      /*
       * Any other HTTP error.
       * Do not retry because it is probably a request/configuration
       * problem rather than a temporary failure.
       */
      return null;
    } catch (error) {
      /*
       * Network errors, CORS errors, AbortErrors, etc.
       */
      log.error('Gemini fetch failed', {
        error,
        message: error?.message,
        name: error?.name,
      });

      attempt++;

      if (attempt <= maxRetries) {
        const delay = Math.min(1000 * 2 ** attempt, 8000);

        log.warn(`Network error. Retrying in ${delay}ms...`);

        await sleep(delay);
        continue;
      }

      log.error('Gemini network retries exhausted');
      return null;
    }
  }

  return null;
}

/**
 * Extracts text safely from a Gemini response.
 *
 * @param {object|null} data
 * @returns {string|null}
 */
function extractGeminiText(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const candidates = data.candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const parts = candidates[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return null;
  }

  const text = parts
    .map((part) => part?.text)
    .filter((value) => typeof value === 'string')
    .join('\n')
    .trim();

  return text || null;
}

/**
 * Promise based delay.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
