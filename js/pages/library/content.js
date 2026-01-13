import { db, appId , collection, onSnapshot } from "../../core/firebase/index.js";

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
