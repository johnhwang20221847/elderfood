import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
// 1. Auth 모듈 임포트 추가
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

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

// 2. 외부 파일(app.js)에서 사용할 수 있도록 두 객체 모두 export
export const db = getFirestore(app);
export const auth = getAuth(app);
