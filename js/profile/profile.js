import { initAuth } from "../core/index.js";
import { initProfileUI } from "./ui.js";
import { saveProfile , startProfileSync } from "./sync.js";

/* boot */
initAuth((user) => {
    if (user) {
        startProfileSync(user.uid);
    }
})
initProfileUI();

/* expose only what HTML needs */
window.saveProfile = saveProfile;
