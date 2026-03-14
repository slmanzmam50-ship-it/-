import type { Branch, NavigationIntent, Category } from '../types';
import { db } from './firebase';
import { collection, onSnapshot, query, where, getDocs, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';

const COLLECTION_NAME = 'branches';
const CATEGORIES_COLLECTION = 'categories';
const INTENTS_COLLECTION = 'active_navigators';

// --- Branches Real-time Sync ---
export const subscribeToBranches = (callback: (branches: Branch[]) => void) => {
    return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
        const branches: Branch[] = [];
        snapshot.forEach((doc) => {
            branches.push({ id: doc.id, ...doc.data() } as Branch);
        });
        callback(branches);
    }, (error) => {
        console.error("Error subscribing to branches:", error);
    });
};

export const subscribeToCategories = (callback: (categories: Category[]) => void) => {
    return onSnapshot(collection(db, CATEGORIES_COLLECTION), (snapshot) => {
        const categories: Category[] = [];
        snapshot.forEach((doc) => {
            categories.push({ id: doc.id, ...doc.data() } as Category);
        });
        callback(categories);
    }, (error) => {
        console.error("Error subscribing to categories:", error);
    });
};

// --- Branches CRUD ---
export const getBranches = async (): Promise<Branch[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
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

// --- Navigation Intents (Optimized) ---
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

export const subscribeToActiveNavigators = (branchId: string, callback: (count: number) => void) => {
    const now = Date.now();
    const q = query(
        collection(db, INTENTS_COLLECTION),
        where('branchId', '==', branchId),
        where('expiresAt', '>', now)
    );

    return onSnapshot(q, (snapshot) => {
        callback(snapshot.size);
    }, (error) => {
        console.error("Error subscribing to navigators:", error);
    });
};

export const getActiveNavigatorsCount = async (branchId: string): Promise<number> => {
    const now = Date.now();
    const q = query(
        collection(db, INTENTS_COLLECTION),
        where('branchId', '==', branchId),
        where('expiresAt', '>', now)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
};

// --- Category CRUD ---
export const getCategories = async (): Promise<Category[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
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

export const updateCategory = async (category: Category): Promise<void> => {
    const catRef = doc(db, CATEGORIES_COLLECTION, category.id);
    await updateDoc(catRef, { name: category.name });
};

export const deleteCategory = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
};

// Initial data removed for brevity, assuming it was already seeded
export const seedDatabaseIfNeeded = async () => {};
