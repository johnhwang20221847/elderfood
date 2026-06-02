import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAxjdIZc5eDEgzo86SWLOrXCAwoQHyETa8",
  authDomain: "elder-food-safety.firebaseapp.com",
  projectId: "elder-food-safety",
  storageBucket: "elder-food-safety.firebasestorage.app",
  messagingSenderId: "929697381233",
  appId: "1:929697381233:web:fbcb7a36a86fe166a454d0",
  measurementId: "G-1W7BBHZG4C"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
