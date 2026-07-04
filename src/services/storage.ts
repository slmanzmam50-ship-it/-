import type { Branch, NavigationIntent, Category, ServiceRequest, CompanyAccount } from '../types';
import { db, storage } from './firebase';
import { collection, onSnapshot, query, where, getDocs, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const COLLECTION_NAME = 'branches';
const CATEGORIES_COLLECTION = 'categories';
const INTENTS_COLLECTION = 'active_navigators';
const COMPANIES_COLLECTION = 'company_accounts';
const REQUESTS_COLLECTION = 'service_requests';

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
    const cleanData = { ...branch };
    Object.keys(cleanData).forEach(key => (cleanData as any)[key] === undefined && delete (cleanData as any)[key]);
    const newBranch = { ...cleanData, id: newId } as Branch;
    await setDoc(doc(db, COLLECTION_NAME, newId), newBranch);
    return newBranch;
};

export const updateBranch = async (updatedBranch: Branch): Promise<void> => {
    const branchRef = doc(db, COLLECTION_NAME, updatedBranch.id);
    const { id, ...dataToUpdate } = updatedBranch;
    Object.keys(dataToUpdate).forEach(key => (dataToUpdate as any)[key] === undefined && delete (dataToUpdate as any)[key]);
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

export const addCategory = async (name: string, imageUrl?: string): Promise<Category> => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newCat: any = { id, name };
    if (imageUrl !== undefined) newCat.imageUrl = imageUrl;
    await setDoc(doc(db, CATEGORIES_COLLECTION, id), newCat);
    return newCat;
};

export const updateCategory = async (category: Category): Promise<void> => {
    const catRef = doc(db, CATEGORIES_COLLECTION, category.id);
    const updateData: any = { name: category.name };
    if (category.imageUrl !== undefined) {
        updateData.imageUrl = category.imageUrl;
    }
    await updateDoc(catRef, updateData);
};

export const deleteCategory = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
};

// Initial data removed for brevity, assuming it was already seeded
export const seedDatabaseIfNeeded = async () => {};

// Helper to compress image client-side using Canvas
const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<File> => {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};

// Helper to convert File to Base64 data URL
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

// --- Storage Upload ---
export const uploadImage = async (file: File, path: string): Promise<string> => {
    try {
        const compressedFile = await compressImage(file);
        
        try {
            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const storageRef = ref(storage, `${path}/${fileName}`);
            
            // Promise.race with a 2-second timeout to prevent indefinite hanging if Firebase Storage is disabled/not created
            const uploadPromise = uploadBytes(storageRef, compressedFile);
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Firebase Storage upload timed out')), 2000)
            );
            
            const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            return downloadUrl;
        } catch (storageError) {
            console.warn("Firebase Storage failed or timed out, falling back to Base64:", storageError);
            return await fileToBase64(compressedFile);
        }
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
};

// --- Company Accounts CRUD ---
export const subscribeToCompanies = (callback: (companies: CompanyAccount[]) => void) => {
    return onSnapshot(collection(db, COMPANIES_COLLECTION), (snapshot) => {
        const companies: CompanyAccount[] = [];
        snapshot.forEach((doc) => {
            companies.push({ id: doc.id, ...doc.data() } as CompanyAccount);
        });
        callback(companies.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
        console.error("Error subscribing to companies:", error);
    });
};

export const addCompany = async (company: Omit<CompanyAccount, 'id' | 'createdAt'>): Promise<CompanyAccount> => {
    const id = 'CO-' + Date.now().toString() + Math.random().toString(36).substr(2, 4);
    const newCompany: CompanyAccount = {
        ...company,
        id,
        createdAt: Date.now()
    };
    await setDoc(doc(db, COMPANIES_COLLECTION, id), newCompany);
    return newCompany;
};

export const deleteCompany = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COMPANIES_COLLECTION, id));
};

// --- Service Requests CRUD ---
export const subscribeToServiceRequests = (callback: (requests: ServiceRequest[]) => void) => {
    return onSnapshot(collection(db, REQUESTS_COLLECTION), (snapshot) => {
        const requests: ServiceRequest[] = [];
        snapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() } as ServiceRequest);
        });
        callback(requests.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
        console.error("Error subscribing to service requests:", error);
    });
};

export const addServiceRequest = async (request: Omit<ServiceRequest, 'id' | 'status' | 'createdAt'>): Promise<ServiceRequest> => {
    const id = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit numeric-only code (e.g., 582491)
    const newRequest: ServiceRequest = {
        ...request,
        id,
        status: 'active',
        createdAt: Date.now()
    };
    await setDoc(doc(db, REQUESTS_COLLECTION, id), newRequest);
    return newRequest;
};

export const updateServiceRequestStatus = async (
    requestId: string,
    status: 'active' | 'completed' | 'transferred' | 'rejected' | 'partial',
    branchId?: string,
    branchName?: string,
    rejectionReason?: string,
    remainingServices?: string
): Promise<void> => {
    const reqRef = doc(db, REQUESTS_COLLECTION, requestId);
    const updates: any = { status };
    if (status === 'completed') {
        updates.completedAt = Date.now();
        if (branchId) updates.branchId = branchId;
        if (branchName) updates.branchName = branchName;
    } else if (status === 'transferred') {
        updates.targetBranchIds = ['all'];
        updates.completedAt = Date.now();
        if (branchId) updates.branchId = branchId;
        if (branchName) updates.branchName = branchName;
    } else if (status === 'rejected') {
        if (rejectionReason) updates.rejectionReason = rejectionReason;
        updates.completedAt = Date.now();
        if (branchId) updates.branchId = branchId;
        if (branchName) updates.branchName = branchName;
    } else if (status === 'partial') {
        if (remainingServices) updates.remainingServices = remainingServices;
        updates.completedAt = Date.now();
        if (branchId) updates.branchId = branchId;
        if (branchName) updates.branchName = branchName;
    }
    await updateDoc(reqRef, updates);
};

export const updateServiceRequestBranch = async (
    requestId: string,
    targetBranchIds: string[]
): Promise<void> => {
    const reqRef = doc(db, REQUESTS_COLLECTION, requestId);
    await updateDoc(reqRef, { 
        targetBranchIds, 
        status: 'active', 
        rejectionReason: '' 
    });
};

