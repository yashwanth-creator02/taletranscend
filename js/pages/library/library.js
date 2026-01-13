// NEW
import { initAuth ,subscribeToTales, stopTalesSubscription ,renderLibrary ,initIcons,
    setupNavigation,
    setupSearch,
    setupSidebarToggle} from "./index.js";

let allTales = [];

setupSidebarToggle();

initAuth(() => {
    subscribeToTales(
        (tales) => {
            allTales = tales;
            renderLibrary(tales);
            initIcons();
        },
        () => {
            document.getElementById("cards-grid").innerHTML = `
                <div class="col-span-full text-center py-20 text-red-500">
                    Database connection failed.
                </div>
            `;
        }
    );

    setupNavigation();
    setupSearch(() => allTales, renderLibrary);
});

window.addEventListener("beforeunload", stopTalesSubscription);
