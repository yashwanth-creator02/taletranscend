// src/pages/profile/ai-name.js
// Suggests a fantasy character name from a user bio using the Gemini API.
// API key must be provided via the calling environment.

/**
 * Suggests a short fantasy character name based on the provided bio text.
 * Returns null if the input is too short or the request fails.
 *
 * @param {string} bioText - The user's bio or character description
 * @returns {Promise<string|null>} Suggested character name or null on failure
 */
export async function suggestNameFromBio(bioText) {
  if (!bioText || bioText.length < 5) return null;

  const model = 'gemini-2.5-flash-preview-09-2025';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const payload = {
    contents: [{ parts: [{ text: bioText }] }],
    systemInstruction: {
      parts: [{ text: 'Suggest ONE short fantasy character name. Return ONLY the name.' }],
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/['"]/g, '').trim() || null;
  } catch {
    return null;
  }
}
