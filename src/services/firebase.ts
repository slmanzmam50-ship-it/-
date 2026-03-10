import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCSy4P169IsP0UHK5nOFNJgMa2P2m_kIyk",
    authDomain: "basmh-87425.firebaseapp.com",
    projectId: "basmh-87425",
    storageBucket: "basmh-87425.firebasestorage.app",
    messagingSenderId: "71938062457",
    appId: "1:71938062457:web:326afb074f75cbcab6bca8",
    measurementId: "G-21PD7B8R4H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);

export default app;
