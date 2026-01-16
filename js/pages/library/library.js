// NEW
import { initAuth ,subscribeToTales, stopTalesSubscription ,renderLibrary ,initIcons,
    setupNavigation,
    setupSearch,jumptoReader,setupOptionsMenu,
    setupSidebarToggle} from "./index.js";

let allTales = [];

setupSidebarToggle();

initAuth(async (user) => {
    const userId = user.uid;
    subscribeToTales(
        async (tales) => {
            allTales = tales;
            await renderLibrary(userId, tales); // <-- REQUIRED
            initIcons(); // now icons exist
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
    jumptoReader(userId);
    setupOptionsMenu();

    setupSearch(
        () => allTales,
        (filtered) => renderLibrary(userId, filtered),
        initIcons
    );
});

window.addEventListener("beforeunload", stopTalesSubscription);
