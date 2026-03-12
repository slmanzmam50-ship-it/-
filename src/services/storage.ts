import type { Branch, NavigationIntent, Category } from '../types';
import { db } from './firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc, setDoc, query, where } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION_NAME = 'branches';

const initialBranches: Branch[] = [
    {
        id: '1',
        name: 'الفرع الرئيسي - الرياض (طريق الملك فهد)',
        latitude: 24.7136,
        longitude: 46.6753,
        category: 'صيانة عامة',
        status: 'مفتوح',
        workingHours: { start: '08:00', end: '22:00' },
        address: 'طريق الملك فهد، الرياض',
        phone: '0500000001'
    },
    {
        id: '2',
        name: 'فرع الصناعية القديمة - غيار زيت سريع',
        latitude: 24.6436,
        longitude: 46.7353,
        category: 'غيار زيت',
        status: 'مفتوح',
        workingHours: { start: '07:00', end: '23:00' },
        address: 'الصناعية القديمة، الرياض',
        phone: '0500000002'
    },
    {
        id: '3',
        name: 'فرع النسيم - إطارات وبطاريات',
        latitude: 24.7436,
        longitude: 46.8353,
        category: 'إطارات',
        status: 'مغلق',
        workingHours: { start: '09:00', end: '21:00' },
        address: 'حي النسيم، الرياض',
        phone: '0500000003'
    },
    {
        id: '4',
        name: 'فرع الياسمين - فحص شامل (كمبيوتر)',
        latitude: 24.8236,
        longitude: 46.6253,
        category: 'فحص شامل',
        status: 'مفتوح',
        workingHours: { start: '08:00', end: '18:00' },
        address: 'حي الياسمين، الرياض',
        phone: '0500000004'
    }
];

// --- Categories Management ---
const CATEGORIES_COLLECTION = 'categories';

const initialCategories: Category[] = [
    { id: 'cat1', name: 'صيانة عامة' },
    { id: 'cat2', name: 'غيار زيت' },
    { id: 'cat3', name: 'إطارات' },
    { id: 'cat4', name: 'فحص شامل' }
];

const seedDatabaseIfNeeded = async () => {
    try {
        const branchSnapshot = await getDocs(collection(db, COLLECTION_NAME));
        if (branchSnapshot.empty) {
            console.log("Database is empty, seeding initial branches...");
            for (const branch of initialBranches) {
                await setDoc(doc(db, COLLECTION_NAME, branch.id), branch);
            }
        }

        const categorySnapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
        if (categorySnapshot.empty) {
            console.log("Seeding initial categories...");
            for (const cat of initialCategories) {
                await setDoc(doc(db, CATEGORIES_COLLECTION, cat.id), cat);
            }
        }
    } catch (error) {
        console.error("Error checking/seeding DB:", error);
    }
}

// Call once on load, not awaiting
seedDatabaseIfNeeded();

export const getBranches = async (): Promise<Branch[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        const branches: Branch[] = [];
        querySnapshot.forEach((doc) => {
            branches.push({ id: doc.id, ...doc.data() } as Branch);
        });

        // Return sorted or just the array
        return branches;
    } catch (error) {
        console.error("Error fetching branches from Firestore:", error);
        return [];
    }
};

export const addBranch = async (branch: Omit<Branch, 'id'>): Promise<Branch> => {
    try {
        const newId = uuidv4();
        const newBranch = { ...branch, id: newId };
        await setDoc(doc(db, COLLECTION_NAME, newId), newBranch);
        return newBranch;
    } catch (error) {
        console.error("Error adding branch:", error);
        throw error;
    }
};

export const updateBranch = async (updatedBranch: Branch): Promise<void> => {
    try {
        const branchRef = doc(db, COLLECTION_NAME, updatedBranch.id);
        const { id, ...dataToUpdate } = updatedBranch; // Remove id from payload
        await updateDoc(branchRef, dataToUpdate);
    } catch (error) {
        console.error("Error updating branch:", error);
        throw error;
    }
};

export const deleteBranch = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Error deleting branch:", error);
        throw error;
    }
};

// --- Navigation Intents (Hybrid Congestion System) ---
const INTENTS_COLLECTION = 'active_navigators';

export const addNavigationIntent = async (branchId: string, etaMinutes: number): Promise<string> => {
    try {
        const id = uuidv4();
        const now = Date.now();
        // Add a 10-minute buffer to the ETA, after which it expires if the user hasn't arrived
        const expiresAt = now + ((etaMinutes + 10) * 60000); 

        const intent: NavigationIntent = {
            id,
            branchId,
            createdAt: now,
            etaMinutes,
            expiresAt
        };

        await setDoc(doc(db, INTENTS_COLLECTION, id), intent);
        return id;
    } catch (error) {
        console.error("Error adding navigation intent:", error);
        throw error;
    }
};

export const getActiveNavigatorsCount = async (branchId: string): Promise<number> => {
    try {
        const now = Date.now();
        // We only want intents that haven't expired yet
        const q = query(
            collection(db, INTENTS_COLLECTION),
            where("branchId", "==", branchId),
            where("expiresAt", ">", now)
        );

        const querySnapshot = await getDocs(q);
        // Valid active navigators intended for this branch
        return querySnapshot.size;
    } catch (error) {
        console.error("Error fetching active navigators:", error);
        return 0;
    }
};

// --- Export Category CRUD ---
export const getCategories = async (): Promise<Category[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
        const categories: Category[] = [];
        querySnapshot.forEach((doc) => {
            categories.push(doc.data() as Category);
        });
        return categories;
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
};

export const addCategory = async (name: string): Promise<Category> => {
    try {
        const id = uuidv4();
        const newCat: Category = { id, name };
        await setDoc(doc(db, CATEGORIES_COLLECTION, id), newCat);
        return newCat;
    } catch (error) {
        console.error("Error adding category:", error);
        throw error;
    }
};

export const deleteCategory = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
    } catch (error) {
        console.error("Error deleting category:", error);
        throw error;
    }
};
