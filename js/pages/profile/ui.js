export function initProfileUI() {
  // reserved for future UI wiring
}

export function updateProfileUI(data) {
  setText('desktop-display-name', data.name || 'Explorer');
  setText('mobile-display-name', data.name || 'Explorer');
  setText('desktop-display-bio', data.bio || 'Preserving legends...');
  setText('mobile-display-bio', data.bio || 'Preserving legends...');

  setInput('input-name', data.name);
  setInput('input-bio', data.bio);
}

/* helpers */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function setInput(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined) el.value = value;
}
