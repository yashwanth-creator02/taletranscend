import { db, appId, auth , collection,
    onSnapshot,
    addDoc,
    serverTimestamp } from "../../core/firebase/index.js";

/**
 * Start listening to comments in real-time
 */
export function listenToComments(taleId) {
    const commentsRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "community_tales",
        taleId,
        "comments"
    );

    onSnapshot(commentsRef, (snap) => {
        const list = document.getElementById("comments-list");
        if (!list) return;

        const items = snap.docs
            .map(d => d.data())
            .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        list.innerHTML = items.length
            ? items.map(renderComment).join("")
            : emptyState();
    });
}

/**
 * Post a new comment
 */
export async function postComment(taleId) {
    const input = document.getElementById("comment-text");
    const text = input?.value.trim();

    if (!text || !auth.currentUser) return;

    const commentsRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "community_tales",
        taleId,
        "comments"
    );

    await addDoc(commentsRef, {
        text,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || "Anonymous Scribe",
        timestamp: serverTimestamp()
    });

    input.value = "";
}

/* ---------------- UI helpers ---------------- */

function renderComment(c) {
    const date = c.timestamp
        ? new Date(c.timestamp.seconds * 1000).toLocaleDateString()
        : "Syncing";

    return `
        <div class="glass-card p-8 rounded-[2rem] border-l-4 border-l-indigo-600 bg-white/[0.02]">
            <div class="flex justify-between items-center mb-4">
                <span class="text-[10px] text-indigo-400 font-black uppercase tracking-widest">
                    ${c.authorName || "Unknown"}
                </span>
                <span class="text-[8px] text-zinc-600 font-black uppercase tracking-widest">
                    ${date}
                </span>
            </div>
            <p class="text-sm text-zinc-400 leading-relaxed font-medium">
                ${escapeHTML(c.text)}
            </p>
        </div>
    `;
}

function emptyState() {
    return `
        <p class="text-[10px] text-zinc-700 font-black uppercase tracking-widest text-center py-20">
            The echoes remain silent.
        </p>
    `;
}

/* Prevent XSS (important even for MVPs) */
function escapeHTML(str = "") {
    return str
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
