import { initAuth } from "./auth.js";
import { loadTale, loadChapters } from "./content.js";
import { renderTale, renderChapters } from "./ui.js";
import { bindChapterClicks, setupTabs, setupStartReading } from "./interactions.js";
import { listenToComments, postComment } from "./comments.js";
import { initIcons } from "../ui/icons.js";

const taleId = new URLSearchParams(window.location.search).get("id");
if (!taleId) location.href = "library.html";

initAuth(async (user) => {
    const tale = await loadTale(taleId, user);
    if (!tale) return;

    renderTale(tale, taleId);

    const chapters = await loadChapters(taleId);
    renderChapters(chapters, taleId);

    bindChapterClicks(taleId);
    setupStartReading(taleId, chapters);   // ✅ FIX
    setupTabs();

    listenToComments(taleId);
    window.postComment = () => postComment(taleId);
});

initIcons();

