import { initAuth, initProfileUI, saveProfile, startProfileSync } from './index.js';
/* boot */
initAuth((user) => {
  if (user) {
    startProfileSync(user.uid);
  }
});
initProfileUI();

/* expose only what HTML needs */
window.saveProfile = saveProfile;
