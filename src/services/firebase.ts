import { initializeApp } from "firebase/app";
import { doc, setDoc, getDoc, deleteDoc, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAdTZKrSsTVIQndTRCsrRjNMydn9ITSDVY",
    authDomain: "slman-zmam.firebaseapp.com",
    projectId: "slman-zmam",
    storageBucket: "slman-zmam.firebasestorage.app",
    messagingSenderId: "750725696422",
    appId: "1:750725696422:web:2e63633a124ad70754dd67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Storage
export const storage = getStorage(app);

// Use initializeFirestore to enable long-polling (helps if streams are blocked)
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

// --- Firebase Connection Test ---
export const testFirebaseConnection = async (): Promise<{ canRead: boolean; canWrite: boolean; error?: string }> => {
    const testDocRef = doc(db, '_connection_test', 'ping');
    let canRead = false;
    let canWrite = false;
    let error: string | undefined;

    try {
        // Simple timeout for the write operation specifically
        const writePromise = setDoc(testDocRef, { timestamp: Date.now(), source: 'connection_test' });
        await Promise.race([
            writePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Write Timeout')), 4000))
        ]);
        canWrite = true;

        const snap = await getDoc(testDocRef);
        canRead = snap.exists();
        
        // Cleanup (don't await, don't care if it fails)
        deleteDoc(testDocRef).catch(() => {});
    } catch (e: any) {
        console.error("Test connection error:", e);
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
