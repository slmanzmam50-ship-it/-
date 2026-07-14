export type BranchCategory = string;
export type BranchStatus = 'مفتوح' | 'مغلق' | 'تحت الصيانة';
export type CongestionLevel = 'متاح' | 'متوسط' | 'مزدحم';

export interface WorkingHours {
    start: string; // e.g., "08:00"
    end: string;   // e.g., "22:00"
}

export interface Branch {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    categories: BranchCategory[];
    status: BranchStatus;
    workingHours: WorkingHours;
    address: string;
    phone: string;
    mapUrl?: string; // Original Google Maps link or source
    imageUrl?: string; // Photo of the branch
    maxCapacity?: number; 
    actualLoad?: number;  
    managerName?: string;
    username?: string;
    password?: string;
    email?: string; // Auto-generated for Firebase Auth
}

export interface NavigationIntent {
    id: string;
    branchId: string;
    createdAt: number; // ms timestamp
    etaMinutes: number;
    expiresAt: number; // ms timestamp (createdAt + (etaMinutes + 10) * 60000)
}

export interface Category {
    id: string;
    name: string;
    imageUrl?: string;
}

export interface ServiceRequest {
    id: string; // Request ID (e.g. RQ-1002 or random string)
    companyId: string;
    companyName: string;
    plateNumber: string;
    serviceDescription: string;
    status: 'active' | 'completed' | 'transferred' | 'rejected' | 'partial';
    createdAt: number;
    completedAt?: number;
    branchId?: string;
    branchName?: string;
    targetBranchIds: string[]; // Specific branch IDs, or ['all']
    rejectionReason?: string;
    remainingServices?: string;
    rating?: number;
    ratingComment?: string;
    ratedAt?: number;
    companyHiddenBranchIds?: string[];
}

export interface CompanyAccount {
    id: string;
    name: string;
    phone?: string;
    managerName?: string;
    createdAt: number;
    username?: string;
    password?: string;
    email?: string; // Auto-generated for Firebase Auth
    hiddenBranchIds?: string[];
}
