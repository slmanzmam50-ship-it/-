import type { Branch, NavigationIntent, Category, ServiceRequest, CompanyAccount } from '../types';
import { db, storage } from './firebase';
import { collection, onSnapshot, query, where, orderBy, limit, getDocs, updateDoc, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const COLLECTION_NAME = 'branches';
const CATEGORIES_COLLECTION = 'categories';
const INTENTS_COLLECTION = 'active_navigators';
const COMPANIES_COLLECTION = 'company_accounts';
const REQUESTS_COLLECTION = 'service_requests';

// --- Security Utilities ---
export const generateSecureId = (prefix: string = '', length: number = 20): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            result += chars[array[i] % chars.length];
        }
    } else {
        for (let i = 0; i < length; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    return result;
};

// --- Authentication (Server-side validation simulation) ---
export const loginCompanyAccount = async (username: string, password: string): Promise<{ id: string, token: string, name: string } | null> => {
    const q = query(collection(db, COMPANIES_COLLECTION), where('username', '==', username), where('password', '==', password));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    const token = generateSecureId('ST-', 32);
    await updateDoc(docSnap.ref, { sessionToken: token });
    return { id: docSnap.id, token, name: docSnap.data().name };
};

export const loginBranchAccount = async (username: string, password: string): Promise<{ id: string, token: string, name: string } | null> => {
    const q = query(collection(db, COLLECTION_NAME), where('username', '==', username), where('password', '==', password));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    const token = generateSecureId('ST-', 32);
    await updateDoc(docSnap.ref, { sessionToken: token });
    return { id: docSnap.id, token, name: docSnap.data().name };
};

export const validateCompanySession = async (id: string, token: string): Promise<boolean> => {
    try {
        if (!id || !token) return false;
        const docRef = doc(db, COMPANIES_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return false;
        return docSnap.data().sessionToken === token;
    } catch (error) {
        console.error("Session validation error:", error);
        return false;
    }
};

export const validateBranchSession = async (id: string, token: string): Promise<boolean> => {
    try {
        if (!id || !token) return false;
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return false;
        return docSnap.data().sessionToken === token;
    } catch (error) {
        console.error("Session validation error:", error);
        return false;
    }
};

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
        callback([]);
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
        callback([]);
    });
};

export const subscribeToBranch = (id: string, callback: (branch: Branch | null) => void) => {
    return onSnapshot(doc(db, COLLECTION_NAME, id), (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as Branch);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error subscribing to branch:", error);
        callback(null);
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
    const newId = generateSecureId('BR-', 16);
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
    const id = generateSecureId('NAV-', 16);
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
    const id = generateSecureId('CAT-', 16);
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
        callback([]);
    });
};

export const subscribeToCompany = (id: string, callback: (company: CompanyAccount | null) => void) => {
    return onSnapshot(doc(db, COMPANIES_COLLECTION, id), (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as CompanyAccount);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error subscribing to company:", error);
        callback(null);
    });
};

export const addCompany = async (company: Omit<CompanyAccount, 'id' | 'createdAt'>): Promise<CompanyAccount> => {
    const id = generateSecureId('CO-', 16);
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

export const updateCompany = async (updatedCompany: CompanyAccount): Promise<void> => {
    const compRef = doc(db, COMPANIES_COLLECTION, updatedCompany.id);
    const { id, ...dataToUpdate } = updatedCompany;
    // Remove undefined values to avoid Firestore serialization errors
    Object.keys(dataToUpdate).forEach(key => (dataToUpdate as any)[key] === undefined && delete (dataToUpdate as any)[key]);
    await updateDoc(compRef, dataToUpdate);
};

// --- Service Requests CRUD ---
export const subscribeToServiceRequests = (callback: (requests: ServiceRequest[]) => void) => {
    // Admin query: Limit to 150 most recent requests to prevent crashing
    const q = query(
        collection(db, REQUESTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(150)
    );
    return onSnapshot(q, (snapshot) => {
        const requests: ServiceRequest[] = [];
        snapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() } as ServiceRequest);
        });
        callback(requests);
    }, (error) => {
        console.error("Error subscribing to service requests:", error);
        callback([]);
    });
};

export const subscribeToCompanyRequests = (
    companyId: string, 
    callback: (active: ServiceRequest[], completed: ServiceRequest[]) => void,
    onError: (errorMsg: string) => void
) => {
    // 1. Active Requests (No limit, sorted in memory to avoid composite index)
    const qActive = query(
        collection(db, REQUESTS_COLLECTION),
        where('companyId', '==', companyId),
        where('status', 'in', ['active', 'partial', 'rejected'])
    );

    // 2. Completed Requests (Limited to 20, ordered by date)
    // THIS REQUIRES A COMPOSITE INDEX: (companyId ASC, status ASC, createdAt DESC)
    const qCompleted = query(
        collection(db, REQUESTS_COLLECTION),
        where('companyId', '==', companyId),
        where('status', '==', 'completed'),
        orderBy('createdAt', 'desc'),
        limit(20)
    );

    let activeReqs: ServiceRequest[] = [];
    let completedReqs: ServiceRequest[] = [];
    
    const triggerCallback = () => {
        // Sort active requests in memory (descending)
        const sortedActive = [...activeReqs].sort((a, b) => b.createdAt - a.createdAt);
        callback(sortedActive, completedReqs);
    };

    const unsubActive = onSnapshot(qActive, (snapshot) => {
        activeReqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
        triggerCallback();
    }, (error: any) => {
        console.error("Error fetching active requests:", error);
        if (error.message?.includes('index')) onError(error.message);
    });

    const unsubCompleted = onSnapshot(qCompleted, (snapshot) => {
        completedReqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
        triggerCallback();
    }, (error: any) => {
        console.error("Error fetching completed requests:", error);
        if (error.message?.includes('index')) onError(error.message);
    });

    return () => {
        unsubActive();
        unsubCompleted();
    };
};

export const subscribeToBranchRequests = (
    branchId: string,
    callback: (requests: ServiceRequest[]) => void,
    onError: (errorMsg: string) => void
) => {
    // Branches only need to see requests that are targeted at them OR completed by them.
    // To keep it simple and avoid massive composite index requirements with array-contains:
    // We'll just fetch recent requests overall and filter in memory? No, that's bad.
    // Let's use two queries:
    // 1. Target Branch: array-contains targetBranchIds
    const qTarget = query(
        collection(db, REQUESTS_COLLECTION),
        where('targetBranchIds', 'array-contains', branchId),
        where('status', 'in', ['active', 'partial'])
    );

    // 2. Target All: array-contains 'all'
    const qAll = query(
        collection(db, REQUESTS_COLLECTION),
        where('targetBranchIds', 'array-contains', 'all'),
        where('status', 'in', ['active', 'partial'])
    );

    // 3. Completed by this branch (limit 20)
    // REQUIRES INDEX: (branchId ASC, status ASC, createdAt DESC)
    const qCompleted = query(
        collection(db, REQUESTS_COLLECTION),
        where('branchId', '==', branchId),
        where('status', '==', 'completed'),
        orderBy('createdAt', 'desc'),
        limit(20)
    );

    let targetReqs: ServiceRequest[] = [];
    let allReqs: ServiceRequest[] = [];
    let compReqs: ServiceRequest[] = [];

    const triggerCallback = () => {
        // Merge and deduplicate
        const map = new Map<string, ServiceRequest>();
        [...targetReqs, ...allReqs, ...compReqs].forEach(req => map.set(req.id, req));
        const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
        callback(merged);
    };

    const handleErr = (error: any) => {
        if (error.message?.includes('index')) onError(error.message);
    };

    const unsubTarget = onSnapshot(qTarget, snap => {
        targetReqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
        triggerCallback();
    }, handleErr);

    const unsubAll = onSnapshot(qAll, snap => {
        allReqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
        triggerCallback();
    }, handleErr);

    const unsubComp = onSnapshot(qCompleted, snap => {
        compReqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
        triggerCallback();
    }, handleErr);

    return () => { unsubTarget(); unsubAll(); unsubComp(); };
};

export const addServiceRequest = async (request: Omit<ServiceRequest, 'id' | 'status' | 'createdAt'>): Promise<ServiceRequest> => {
    const id = generateSecureId('REQ-', 12); // Secure, unguessable string ID
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

export const addServiceRequestRating = async (
    requestId: string,
    rating: number,
    ratingComment: string
): Promise<void> => {
    const reqRef = doc(db, REQUESTS_COLLECTION, requestId);
    await updateDoc(reqRef, {
        rating,
        ratingComment,
        ratedAt: Date.now()
    });
};

export const clearServiceRequestRatings = async (requestIds: string[]): Promise<void> => {
    const batchPromises = requestIds.map(async (id) => {
        const docRef = doc(db, REQUESTS_COLLECTION, id);
        await updateDoc(docRef, {
            rating: null,
            ratingComment: null,
            ratedAt: null
        });
    });
    await Promise.all(batchPromises);
};

export const deleteServiceRequestsByIds = async (ids: string[]): Promise<void> => {
    const batchPromises = ids.map(id => deleteDoc(doc(db, REQUESTS_COLLECTION, id)));
    await Promise.all(batchPromises);
};

