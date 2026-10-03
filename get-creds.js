import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "dummy",
    projectId: "salman-zemam-al-khalidi" // I don't know the exact project id. I should look in src/services/firebase.ts
};
