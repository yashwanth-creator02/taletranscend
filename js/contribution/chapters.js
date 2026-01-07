import { state } from "./state.js";

/* ---------------------------
   CHAPTER MANAGEMENT
---------------------------- */
export function addNewChapter() {
  state.chapters.push({
    title: "Untitled Chapter",
    content: ""
  });

  state.currentChapterIndex = state.chapters.length - 1;
  renderChapterList();
  loadCurrentChapter();
}

export function renderChapterList() {
  const list = document.getElementById("chapter-list");
  list.innerHTML = "";

  state.chapters.forEach((ch, index) => {
    const item = document.createElement("div");
    item.className =
      "px-6 py-3 text-xs cursor-pointer text-zinc-400 hover:text-white";
    item.textContent = ch.title;

    item.onclick = () => {
      state.currentChapterIndex = index;
      loadCurrentChapter();
    };

    list.appendChild(item);
  });
}

export function loadCurrentChapter() {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  document.getElementById("current-chapter-title").value = chapter.title;
  document.getElementById("chapter-content").value = chapter.content;
}

export function updateSidebarTitle(value) {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  chapter.title = value;
  renderChapterList();
}
