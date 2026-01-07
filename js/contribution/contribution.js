import { initContributionAuth } from "./auth.js";
import { initContributionUI } from "./ui.js";
import { submitTale } from "./submit.js";

/* boot */
initContributionAuth();
initContributionUI();

/* expose only what HTML needs */
window.submitTale = submitTale;
window.toggleEditor = () => {
    document.getElementById("story-editor")?.classList.toggle("hidden");
    document.body.style.overflow =
        document.getElementById("story-editor")?.classList.contains("hidden")
            ? "auto"
            : "hidden";
};
