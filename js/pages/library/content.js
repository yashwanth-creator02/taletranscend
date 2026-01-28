import { db, appId, collection, onSnapshot, auth } from '@core/firebase/index.js';

let unsubscribe = null;

export function subscribeToTales(onUpdate, onError) {
  // DEBUG LOGS - Check your console for these!
  console.log('--- Connection Debug ---');
  console.log('Current AppID:', appId);
  console.log('Current User:', auth.currentUser ? auth.currentUser.uid : 'NOT LOGGED IN');

  const talesCol = collection(db, 'artifacts', appId, 'public', 'data', 'community_tales');

  console.log('Target Path:', talesCol.path);

  unsubscribe = onSnapshot(
    talesCol,
    (snap) => {
      console.log('Success! Found tales:', snap.size);
      const tales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(tales);
    },
    (error) => {
      // Detailed Error Reporting
      console.error('PERMISSION ERROR DATA:');
      console.error('Error Code:', error.code);
      console.error('Auth Status at failure:', auth.currentUser ? 'Logged In' : 'Logged Out');
      console.error('Attempted Path:', talesCol.path);
      onError(error);
    }
  );
}

export function stopTalesSubscription() {
  if (unsubscribe) unsubscribe();
}
