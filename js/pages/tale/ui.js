export function renderTale(tale, taleId) {
    document.getElementById('loading-indicator').innerText = "Transcription Successful";
    document.getElementById('display-title').innerText = tale.title || "Untitled Legend";
    document.getElementById('display-title').style.opacity = 1;
    document.getElementById('display-title').style.transform = "translateY(0)";
    document.getElementById('meta-container').style.opacity = 1;
    document.getElementById("display-author").innerText = tale.authorName || `Scribe ${taleId.slice(0,5)}`;
    document.getElementById("display-chapters").innerText = `${tale.chapterCount || 0} Fragments`;
    document.getElementById("display-description").innerText = tale.description || "A mysterious tale waiting to be uncovered...";

    if (tale.coverUrl) {
        document.getElementById("display-cover").src = tale.coverUrl;
        document.getElementById("hero-section").style.setProperty("--bg-url", `url('${tale.coverUrl}')`);
    }
}

export function renderChapters(chapters, taleId) {
    const list = document.getElementById("chapter-list");

    if (!chapters.length) {
        list.innerHTML = `<p class="text-[10px] text-zinc-700 font-black uppercase tracking-widest italic py-10">
            No chronicles detected.
        </p>`;
        return;
    }

    list.innerHTML = chapters.map((ch, idx) => `
        <div  data-chapter-index="${idx}"
             class="chapter-item glass-card p-8 rounded-3xl flex justify-between items-center group hover:border-indigo-500/40 transition-all cursor-pointer">
            <div>
                <span class="text-[9px] text-indigo-500 font-black block mb-2 uppercase tracking-[0.3em]">
                    Fragment ${String(idx + 1).padStart(2, "0")}
                </span>
                <h3 class="text-xl font-black text-white uppercase tracking-tighter">
                    ${ch.title || "Untitled Fragment"}
                </h3>
            </div>
        </div>
    `).join("");
}
