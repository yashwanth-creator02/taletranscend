import { initAuth,loadTale, loadChapters,renderTale, renderChapters,bindChapterClicks, setupTabs, setupStartReading ,listenToComments, postComment, initIcons} from "./index.js";

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

