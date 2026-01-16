import { resolveResumePoint } from "../../core/services/reader/index.js";

/* ======================================
   CARD NAVIGATION (WHOLE CARD)
====================================== */

export function setupNavigation() {
    const grid = document.getElementById("cards-grid");
    if (!grid) return;

    grid.addEventListener("click", (e) => {
        // Ignore clicks coming from resume or options
        if (
            e.target.closest(".play-btn") ||
            e.target.closest('[data-action="resume"]') ||
            e.target.closest('[data-action="options"]') ||
            e.target.closest(".options-menu")
        ) {
            return;
        }

        const card = e.target.closest(".tale-card");
        if (!card) return;

        const id = card.dataset.id;
        window.location.href = `tale.html?id=${id}`;
    });
}

/* ======================================
   RESUME (PLAY BUTTON ONLY)
====================================== */

export function jumptoReader(userId) {
    const grid = document.getElementById("cards-grid");
    if (!grid) return;

    grid.addEventListener("click", (e) => {
        const playBtn =
            e.target.closest(".play-btn") ||
            e.target.closest('[data-action="resume"]');

        if (!playBtn) return;

        e.stopPropagation();

        const taleCard = playBtn.closest(".tale-card");
        if (!taleCard) return;

        const taleId = taleCard.dataset.id;
        const resume = resolveResumePoint({ userId, taleId });

        if (!resume) {
            window.location.href =
                `reader.html?taleId=${taleId}&chapterId=0`;
            return;
        }

        window.location.href =
            `reader.html?taleId=${taleId}&chapterId=${resume.chapterIndex}`;
    });
}

/* ======================================
   OPTIONS MENU
====================================== */

export function setupOptionsMenu() {
    const grid = document.getElementById("cards-grid");
    if (!grid) return;

    // Toggle menu
    grid.addEventListener("click", (e) => {
        const optionsBtn = e.target.closest('[data-action="options"]');
        if (!optionsBtn) return;

        e.stopPropagation();

        const menuId = optionsBtn.dataset.menuId;

        document.querySelectorAll(".options-menu").forEach(menu => {
            if (menu.id !== menuId) {
                menu.classList.add("hidden");
            }
        });

        const menu = document.getElementById(menuId);
        menu?.classList.toggle("hidden");
    });

    // Close menus on outside click
    document.addEventListener("click", () => {
        document
            .querySelectorAll(".options-menu")
            .forEach(menu => menu.classList.add("hidden"));
    });
}

/* ======================================
   SEARCH
====================================== */

export function setupSearch(getAllTales, onFilter, initIcons) {
    const input = document.getElementById("search-input");
    if (!input) return;

    input.addEventListener("input", async (e) => {
        const term = e.target.value.toLowerCase();

        const filtered = getAllTales().filter(t =>
            (t.title || "").toLowerCase().includes(term) ||
            (t.description || "").toLowerCase().includes(term) ||
            (t.era || "").toLowerCase().includes(term)
        );

        await onFilter(filtered);
        initIcons();
    });
}

/* ======================================
   SIDEBAR
====================================== */

export function setupSidebarToggle() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("toggle-sidebar");

    if (!sidebar || !toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
    });
}
