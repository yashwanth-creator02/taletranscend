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
    window.startReading = () => {
        if (!chapters || !chapters.length) return;

        const firstChapter = chapters[0];
        window.location.href =
            `reader.html?taleId=${taleId}&chapterId=${firstChapter.id}`;
    };
}
