export type BranchCategory = string;
export type BranchStatus = 'مفتوح' | 'مغلق';
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
    maxCapacity?: number; 
    actualLoad?: number;  
    managerName?: string;
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
}
