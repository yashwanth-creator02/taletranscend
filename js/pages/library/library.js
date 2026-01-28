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

/* ==================== Global Variables ==================== */
// Stores all tales fetched from Firestore
let allTales = [];

/* ==================== Debugging ==================== */
console.log('Checking Firestore connection...');
console.log('Current Database Instance:', db);

/* ==================== UI Initialization ==================== */
// Set up sidebar toggle button behavior
setupSidebarToggle();

/* ==================== Firebase Auth & Tales Subscription ==================== */
initAuth(async (user) => {
  const userId = user.uid;

  // Subscribe to community tales updates
  subscribeToTales(
    async (tales) => {
      allTales = tales;

      // Render the tale cards grid for this user
      await renderCardsGrid(userId, tales);

      // Initialize icons now that cards exist
      initIcons();
    },
    (error) => {
      console.error('Detailed Error:', error);

      // Show database error in UI
      document.getElementById('cards-grid').innerHTML = `
        <div class="col-span-full text-center py-20 text-red-500">
            Database connection failed.
        </div>
      `;
    }
  );

  /* ==================== UI Event Handlers ==================== */
  setupNavigation(); // Card-wide click navigation
  jumptoReader(userId); // Resume reading on play buttons
  setupOptionsMenu(); // Options menus for each tale card

  setupSearch(
    () => allTales, // Function to get all tales
    (filtered) => renderCardsGrid(userId, filtered), // Render filtered results
    initIcons // Re-initialize icons after filtering
  );
});

/* ==================== Cleanup ==================== */
// Unsubscribe from Firestore updates when the page is closed or refreshed
window.addEventListener('beforeunload', stopTalesSubscription);
