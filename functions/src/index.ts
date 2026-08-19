// functions/src/index.ts

import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { onReactionWrite } from './triggers/onReactionWrite.js';
export { onCommentWrite } from './triggers/onCommentWrite.js';
export { setModeratorClaim } from './admin/setModeratorClaim.js';
