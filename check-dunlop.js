import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAdTZKrSsTVIQndTRCsrRjNMydn9ITSDVY",
    authDomain: "slman-zmam.firebaseapp.com",
    projectId: "slman-zmam",
    storageBucket: "slman-zmam.firebasestorage.app",
    messagingSenderId: "750725696422",
    appId: "1:750725696422:web:2e63633a124ad70754dd67"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
    try {
        const querySnapshot = await getDocs(collection(db, "branches"));
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.name.includes("دنلوب")) {
                console.log("Found Dunlop branch:", data);
            }
        });
    } catch (error) {
        console.error("Error:", error);
    }
    process.exit(0);
}

test();
