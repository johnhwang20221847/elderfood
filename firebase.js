import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "elder-food-safety.firebaseapp.com",
  projectId: "elder-food-safety",
  storageBucket: "elder-food-safety.firebasestorage.app",
  messagingSenderId: "929697381233",
  appId: "1:929697381233:web:fbc..."
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
