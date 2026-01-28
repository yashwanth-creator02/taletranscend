import { db, appId, collection, onSnapshot, auth } from '@core/firebase/index.js';

// Holds the active Firestore unsubscribe function
// Used to stop the real-time listener when no longer needed
let unsubscribe = null;

/**
 * Subscribes to real-time updates for public community tales.
 * @param {Function} onUpdate - Callback invoked with updated tales data
 * @param {Function} onError - Callback invoked when a Firestore error occurs
 */
export function subscribeToTales(onUpdate, onError) {
  // -------------------- DEBUG LOGGING --------------------
  // These logs help verify Firebase connection, app identity,
  // and authentication state during development
  console.log('--- Connection Debug ---');
  console.log('Current AppID:', appId);
  console.log('Current User:', auth.currentUser ? auth.currentUser.uid : 'NOT LOGGED IN');

  // Reference to the Firestore collection storing public community tales
  // Path structure:
  // artifacts/{appId}/public/data/community_tales
  const talesCol = collection(db, 'artifacts', appId, 'public', 'data', 'community_tales');

  // Log the resolved Firestore path for verification and debugging
  console.log('Target Path:', talesCol.path);

  // Establish a real-time listener on the tales collection
  unsubscribe = onSnapshot(
    talesCol,

    // Triggered whenever the collection data changes
    (snap) => {
      console.log('Success! Found tales:', snap.size);

      // Convert Firestore documents into plain JS objects
      // and attach document IDs
      const tales = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Pass the updated tales list to the caller
      onUpdate(tales);
    },

    // Triggered if the listener encounters a permission or network error
    (error) => {
      // -------------------- ERROR DIAGNOSTICS --------------------
      // These logs provide context for debugging permission issues
      console.error('PERMISSION ERROR DATA:');
      console.error('Error Code:', error.code);
      console.error('Auth Status at failure:', auth.currentUser ? 'Logged In' : 'Logged Out');
      console.error('Attempted Path:', talesCol.path);

      // Forward the error to the caller for UI handling
      onError(error);
    }
  );
}

/**
 * Stops the active real-time subscription to the tales collection.
 * Should be called when the consuming component unmounts.
 */
export function stopTalesSubscription() {
  if (unsubscribe) unsubscribe();
}
