import { initProfileAuth } from "./auth.js";
import { initProfileUI } from "./ui.js";
import { saveProfile } from "./sync.js";

/* boot */
initProfileAuth();
initProfileUI();

/* expose only what HTML needs */
window.saveProfile = saveProfile;
