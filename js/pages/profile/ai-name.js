/**
 * Suggests a short fantasy character name based on a given bio.
 * Uses Google's generative language API (Gemini 2.5).
 *
 * @param {string} bioText - The character's bio or description
 * @returns {Promise<string|null>} Suggested character name, or null on error
 */
export async function suggestNameFromBio(bioText) {
  // Ignore invalid or too short bio input
  if (!bioText || bioText.length < 5) return null;

  // Model and endpoint for text generation
  const model = 'gemini-2.5-flash-preview-09-2025';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // Request payload with system instruction to return only ONE short fantasy name
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

    // Extract the suggested name from the API response, removing quotes and trimming
    return json.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/['"]/g, '').trim() || null;
  } catch {
    // Return null on any fetch or parsing error
    return null;
  }
}
