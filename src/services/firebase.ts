import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

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
export const db = getFirestore(app);

// --- Firebase Connection Diagnostic ---
export const testFirebaseConnection = async (): Promise<{ canRead: boolean; canWrite: boolean; error?: string }> => {
    const testDocRef = doc(db, '_connection_test', 'ping');
    let canRead = false;
    let canWrite = false;
    let error: string | undefined;

    try {
        // Test Write
        await setDoc(testDocRef, { timestamp: Date.now(), test: true });
        canWrite = true;

        // Test Read
        const snap = await getDoc(testDocRef);
        canRead = snap.exists();

        // Clean up
        await deleteDoc(testDocRef);
    } catch (e: any) {
        console.error("Firebase connection test failed:", e);
        const code = e?.code || '';
        if (code.includes('permission-denied')) {
            error = 'PERMISSION_DENIED';
        } else if (code.includes('not-found') || code.includes('unavailable')) {
            error = 'FIRESTORE_NOT_CREATED';
        } else {
            error = e?.message || 'UNKNOWN_ERROR';
        }
    }

    return { canRead, canWrite, error };
};

export default app;
