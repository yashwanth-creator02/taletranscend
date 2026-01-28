export function createTaleCard(tale, readTimeMap = {}) {
  const {
    id = '0000',
    title = 'Untitled Echo',
    coverUrl,
    description = 'No description provided.',
    era = 'Unknown Era',
    progress = 0,
    chapterCount = 0,
    estimatedReadTime = '—',
  } = tale;

  const menuId = `menu-${id}`;

  const totalMs = readTimeMap[id] || 0;
  const minutes = Math.floor(totalMs / 60000);
  const progressPercent = Math.min(100, Math.max(0, progress));

  const time = `
        <div class="flex items-center gap-2">
            <i data-lucide="clock" class="w-3.5 h-3.5 text-zinc-600"></i>
            <span class="text-[9px] font-bold uppercase text-zinc-500 tracking-widest">
                ${minutes > 0 ? `${minutes}m` : estimatedReadTime}
            </span>
        </div>
    `;

  const cover =
    coverUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800';

  return `
    <div class="glass-panel group relative p-5 rounded-[2.5rem] hover:border-indigo-500/40 transition-all cursor-pointer tale-card-glow overflow-visible" data-id="${id}">
        
        <!-- HEADER -->
        <div class="flex justify-between items-start mb-4">
            <div class="flex flex-col">
                <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-md w-fit mb-1">
                    ${era}
                </span>
                <span class="text-[8px] text-zinc-500 uppercase tracking-tighter">
                    ID: ${id.slice(0, 6)}
                </span>
            </div>

            <div class="relative">
                <button
                    data-action="options"
                    data-menu-id="${menuId}"
                    class="p-2 hover:bg-white/5 rounded-full transition text-zinc-500 hover:text-white">
                    <i data-lucide="more-vertical" class="w-4 h-4"></i>
                </button>

                <div id="${menuId}" class="options-menu hidden absolute right-0 mt-2 w-56 bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60] py-3">
                    <div class="px-4 py-1 mb-2">
                        <span class="text-[7px] font-black text-zinc-600 uppercase tracking-[0.3em]">Quick Actions</span>
                    </div>

                    <button class="w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold text-zinc-400 hover:text-white hover:bg-indigo-500/10 transition flex items-center gap-3">
                        <i data-lucide="share-2" class="w-3.5 h-3.5"></i> Share Signal
                    </button>
                    <button class="w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold text-zinc-400 hover:text-white hover:bg-indigo-500/10 transition flex items-center gap-3">
                        <i data-lucide="link" class="w-3.5 h-3.5"></i> Copy Universal Link
                    </button>
                    <button class="w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold text-zinc-400 hover:text-white hover:bg-indigo-500/10 transition flex items-center gap-3">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i> Force Offline Sync
                    </button>

                    <div class="h-[1px] bg-white/5 my-2 mx-2"></div>

                    <div class="px-4 py-1 mb-1">
                        <span class="text-[7px] font-black text-zinc-600 uppercase tracking-[0.3em]">Management</span>
                    </div>

                    <button class="w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold text-zinc-400 hover:text-white hover:bg-indigo-500/10 transition flex items-center gap-3">
                        <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Export as PDF
                    </button>
                    <button class="w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold text-zinc-400 hover:text-white hover:bg-indigo-500/10 transition flex items-center gap-3">
                        <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Mark Finished
                    </button>
                    <button class="w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold text-orange-400/80 hover:text-orange-400 hover:bg-orange-500/10 transition flex items-center gap-3">
                        <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Report Anomaly
                    </button>

                    <div class="h-[1px] bg-white/5 my-2 mx-2"></div>

                    <button class="w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold text-red-400 hover:bg-red-500/20 transition flex items-center gap-3">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Decouple Fragment
                    </button>
                </div>
            </div>
        </div>

        <!-- COVER -->
        <div class="relative h-56 bg-zinc-900 rounded-[1.8rem] mb-6 overflow-hidden">
            <img src="${cover}" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700">

            <div class="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/5">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-[8px] text-zinc-400 uppercase font-bold tracking-widest">Reading Progress</span>
                    <span class="text-[8px] text-indigo-400 font-black">${progressPercent}%</span>
                </div>

                <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div class="h-full bg-indigo-500" style="width:${progressPercent}%"></div>
                </div>
            </div>
        </div>

        <!-- CONTENT -->
        <div class="px-2">
            <h3 class="text-xl font-bold text-white uppercase tracking-wider mb-2 group-hover:text-indigo-400 transition-colors">
                ${title}
            </h3>

            <p class="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4 italic">
                ${description}
            </p>

            <div class="grid grid-cols-2 gap-4 py-4 border-t border-white/5">
                <div class="flex items-center gap-2">
                    <i data-lucide="layers" class="w-3.5 h-3.5 text-zinc-600"></i>
                    <span class="text-[9px] font-bold uppercase text-zinc-500 tracking-widest">
                        ${chapterCount} Chapters
                    </span>
                </div>

                ${time}
            </div>

            <div class="mt-4 flex items-center justify-end">
                <button
                    data-action="resume"
                    data-id="${id}"
                    class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:text-indigo-400 transition group/btn">
                    Resume Link
                    <i data-lucide="arrow-right-circle" class="w-4 h-4 transition-transform group-hover/btn:translate-x-1"></i>
                </button>
            </div>
        </div>
    </div>
    `;
}
