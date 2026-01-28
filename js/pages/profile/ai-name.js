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
