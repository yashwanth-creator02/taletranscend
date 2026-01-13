export function setupNavigation() {
    document.getElementById("cards-grid")
        .addEventListener("click", (e) => {
            const card = e.target.closest(".tale-card");
            if (!card) return;

            const id = card.dataset.id;
            window.location.href = `tale.html?id=${id}`;
        });
}

export function setupSearch(getAllTales, onFilter) {
    const input = document.getElementById("search-input");

    input.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();

        const filtered = getAllTales().filter(t =>
            (t.title || "").toLowerCase().includes(term) ||
            (t.description || "").toLowerCase().includes(term) ||
            (t.era || "").toLowerCase().includes(term)
        );

        onFilter(filtered);
    });
}

export function setupSidebarToggle() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("toggle-sidebar");

    toggleBtn.onclick = () => sidebar.classList.toggle("collapsed");
}
