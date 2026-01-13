// js/reader/navigation.js

export function applyNavigation(navigation, taleId) {
  const prev = document.getElementById("prev-link");
  const next = document.getElementById("next-link");

  if (navigation.hasPrev) {
    prev.href = `reader.html?taleId=${taleId}&chapterId=${navigation.prevIndex}`;
    prev.classList.remove("hidden");
    const prevTitle = document.getElementById("prev-title");
    if (prevTitle) prevTitle.textContent = navigation.prevTitle;
  } else {
    prev.classList.add("hidden");
  }

  if (navigation.hasNext) {
    next.href = `reader.html?taleId=${taleId}&chapterId=${navigation.nextIndex}`;
    next.classList.remove("hidden");
    const nextTitle = document.getElementById("next-title");
    if (nextTitle) nextTitle.textContent = navigation.nextTitle;
  } else {
    next.classList.add("hidden");
  }
}

export function goBackToTale(taleId) {
  window.location.href = `tale.html?id=${taleId}`;
}
