// js/core/firebase/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import  firebaseConfig  from "../../../config/firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the initialized app instance
export default app;