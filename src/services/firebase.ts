import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAdTZKrSsTVIQndTRCsrRjNMydn9ITSDVY",
    authDomain: "slman-zmam.firebaseapp.com",
    projectId: "slman-zmam",
    storageBucket: "slman-zmam.firebasestorage.app",
    messagingSenderId: "750725696422",
    appId: "1:750725696422:web:2e63633a124ad70754dd67",
    measurementId: "G-MTHHCWPVE2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);

export default app;
