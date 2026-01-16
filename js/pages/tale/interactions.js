import { resolveResumePoint } from "../../core/services/reader/index.js";

export function bindChapterClicks(taleId) {
    const list = document.getElementById("chapter-list");
    if (!list) return;

    list.addEventListener("click", (e) => {
        const item = e.target.closest(".chapter-item");
        if (!item) return;

        const chapterId = item.dataset.chapterIndex;
        window.location.href = `reader.html?taleId=${taleId}&chapterId=${chapterId}`;
    });
}
export function setupTabs() {
    window.switchTab = (tabKey) => {
        document.querySelectorAll('.tab-btn')
            .forEach(btn => btn.classList.remove('active'));

        document.querySelectorAll('.tab-content')
            .forEach(p => p.classList.add('hidden'));

        document.getElementById(`tab-${tabKey}`)?.classList.add('active');
        document.getElementById(`content-${tabKey}`)?.classList.remove('hidden');
    };
}

export function setupStartReading(taleId, chapters) {
    const btn = document.getElementById("start-btn");
    if(!btn) return;
    btn.addEventListener("click",(e) => {
        if (!chapters || !chapters.length) return;
        const firstChapter = chapters[0];
        window.location.href =
            `reader.html?taleId=${taleId}&chapterId=${firstChapter.id}`;
    });
}
export function setupResumeReading(userId,taleId) {
    const btn = document.getElementById("resume-btn");
    if(!btn) return;
    btn.addEventListener("click",(e) => {
        const resume = resolveResumePoint({ userId, taleId });

        if (!resume) {
            // Start fresh
            window.location.href = `reader.html?taleId=${taleId}&chapterId=0`;
            return;
        }

        window.location.href =
            `reader.html?taleId=${taleId}&chapterId=${resume.chapterIndex}`;
    });
}