import type { Branch, NavigationIntent, Category } from '../types';
import { db } from './firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc, setDoc, query, where, addDoc } from 'firebase/firestore';

const COLLECTION_NAME = 'branches';
const CATEGORIES_COLLECTION = 'categories';
const INTENTS_COLLECTION = 'active_navigators';

// --- Initial seed data ---
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

const initialCategories: Category[] = [
    { id: 'cat1', name: 'صيانة عامة' },
    { id: 'cat2', name: 'غيار زيت' },
    { id: 'cat3', name: 'إطارات' },
    { id: 'cat4', name: 'فحص شامل' }
];

// --- Controlled seeding (called explicitly, not on module load) ---
let hasSeeded = false;
export const seedDatabaseIfNeeded = async () => {
    if (hasSeeded) return;
    hasSeeded = true;
    
    try {
        const branchSnapshot = await getDocs(collection(db, COLLECTION_NAME));
        if (branchSnapshot.empty) {
            console.log("Seeding initial branches...");
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
        console.error("Error seeding DB:", error);
        hasSeeded = false; // Allow retry
    }
}

// --- Helper: Promise with timeout ---
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
};

// --- Branches CRUD ---
export const getBranches = async (): Promise<Branch[]> => {
    try {
        const querySnapshot = await withTimeout(
            getDocs(collection(db, COLLECTION_NAME)),
            8000,
            null
        );
        if (!querySnapshot) {
            console.warn("getBranches timed out");
            return [];
        }
        const branches: Branch[] = [];
        querySnapshot.forEach((doc) => {
            branches.push({ id: doc.id, ...doc.data() } as Branch);
        });
        return branches;
    } catch (error) {
        console.error("Error fetching branches:", error);
        return [];
    }
};

export const addBranch = async (branch: Omit<Branch, 'id'>): Promise<Branch> => {
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newBranch = { ...branch, id: newId };
    await setDoc(doc(db, COLLECTION_NAME, newId), newBranch);
    return newBranch;
};

export const updateBranch = async (updatedBranch: Branch): Promise<void> => {
    const branchRef = doc(db, COLLECTION_NAME, updatedBranch.id);
    const { id, ...dataToUpdate } = updatedBranch;
    await updateDoc(branchRef, dataToUpdate);
};

export const deleteBranch = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
};

// --- Navigation Intents ---
export const addNavigationIntent = async (branchId: string, etaMinutes: number): Promise<string> => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const now = Date.now();
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
};

export const getActiveNavigatorsCount = async (branchId: string): Promise<number> => {
    try {
        // Use a simple query instead of compound query to avoid needing composite index
        const querySnapshot = await withTimeout(
            getDocs(collection(db, INTENTS_COLLECTION)),
            3000,
            null
        );
        if (!querySnapshot) return 0;
        
        const now = Date.now();
        let count = 0;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.branchId === branchId && data.expiresAt > now) {
                count++;
            }
        });
        return count;
    } catch (error) {
        console.error("Error fetching navigators:", error);
        return 0;
    }
};

// --- Category CRUD ---
export const getCategories = async (): Promise<Category[]> => {
    try {
        const querySnapshot = await withTimeout(
            getDocs(collection(db, CATEGORIES_COLLECTION)),
            8000,
            null
        );
        if (!querySnapshot) {
            console.warn("getCategories timed out");
            return [];
        }
        const categories: Category[] = [];
        querySnapshot.forEach((doc) => {
            categories.push({ id: doc.id, ...doc.data() } as Category);
        });
        return categories;
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
};

export const addCategory = async (name: string): Promise<Category> => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newCat: Category = { id, name };
    await setDoc(doc(db, CATEGORIES_COLLECTION, id), newCat);
    return newCat;
};

export const deleteCategory = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
};
