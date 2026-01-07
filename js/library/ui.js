export function renderLibrary(tales) {
    const container = document.getElementById("cards-grid");

    if (!tales.length) {
        container.innerHTML = `
            <div class="col-span-full text-center py-20 text-zinc-600 italic">
                No tales found in the archives...
            </div>
        `;
        return;
    }

    container.innerHTML = tales.map(createTaleCard).join("");
}

function createTaleCard(tale) {
    const {
        id = "0000",
        title = "Untitled Echo",
        coverUrl,
        description = "No description provided for this archive entry.",
        authorName = "Scribe Unknown",
        era = "Unknown Era",
        progress = 0
    } = tale;

    const cover =
        coverUrl ||
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800";

    return `
        <div data-id="${id}" 
             class="tale-card cursor-pointer rounded-[2rem] overflow-hidden border border-white/5 bg-zinc-900/40 group">
            <div class="aspect-[2/3] overflow-hidden relative">
                <img src="${cover}" class="tale-image w-full h-full object-cover grayscale-[20%]">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"></div>
            </div>
            <div class="p-6">
                <h3 class="text-xl font-black text-white uppercase tracking-tighter">
                    ${title}
                </h3>
                <p class="text-[11px] text-zinc-500 mt-2 line-clamp-3">
                    ${description}
                </p>
                <div class="mt-4 flex justify-between text-[9px] text-zinc-500">
                    <span>${authorName}</span>
                    <span>${progress}%</span>
                </div>
            </div>
        </div>
    `;
}
