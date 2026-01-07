import { initAuth } from "./auth.js";
import { subscribeToTales, stopTalesSubscription } from "./content.js";
import { renderLibrary } from "./ui.js";
import {
    setupNavigation,
    setupSearch,
    setupSidebarToggle
} from "./interactions.js";
import { initIcons } from "../ui/icons.js";

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
