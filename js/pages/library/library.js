// NEW
import {
  initAuth,
  subscribeToTales,
  stopTalesSubscription,
  renderCardsGrid,
  initIcons,
  setupNavigation,
  setupSearch,
  jumptoReader,
  setupOptionsMenu,
  setupSidebarToggle,
  db,
} from './index.js';

let allTales = [];
console.log('Checking Firestore connection...');
console.log('Current Database Instance:', db);
setupSidebarToggle();

initAuth(async (user) => {
  const userId = user.uid;
  subscribeToTales(
    async (tales) => {
      allTales = tales;
      await renderCardsGrid(userId, tales); // <-- REQUIRED
      initIcons(); // now icons exist
    },
    (error) => {
      console.error('Detailed Error:', error);
      document.getElementById('cards-grid').innerHTML = `
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
    (filtered) => renderCardsGrid(userId, filtered),
    initIcons
  );
});

window.addEventListener('beforeunload', stopTalesSubscription);
