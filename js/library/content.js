import { db, appId } from "../firebase.js";
import { collection, onSnapshot } 
from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let unsubscribe = null;

export function subscribeToTales(onUpdate, onError) {
    const talesCol = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "community_tales"
    );

    unsubscribe = onSnapshot(
        talesCol,
        (snap) => {
            const tales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            onUpdate(tales);
        },
        onError
    );
}

export function stopTalesSubscription() {
    if (unsubscribe) unsubscribe();
}
