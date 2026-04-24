import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBDzMy8NUGGknBSVjVYwd2hBpQ2uR-O6n4",
  authDomain: "safe-app-58b85.firebaseapp.com",
  projectId: "safe-app-58b85",
  storageBucket: "safe-app-58b85.firebasestorage.app",
  messagingSenderId: "348822076296",
  appId: "1:348822076296:web:0872fcb304e8534c54183d",
  measurementId: "G-2BWL825F9B"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();