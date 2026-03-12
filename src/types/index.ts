export type BranchCategory = 'صيانة عامة' | 'غيار زيت' | 'إطارات' | 'فحص شامل';
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
    category: BranchCategory;
    status: BranchStatus;
    workingHours: WorkingHours;
    address: string;
    phone: string;
    maxCapacity?: number; // Optional max capacity for congestion calculation
    actualLoad?: number;  // Optional manual or sensor-based actual load
}

export interface NavigationIntent {
    id: string;
    branchId: string;
    createdAt: number; // ms timestamp
    etaMinutes: number;
    expiresAt: number; // ms timestamp (createdAt + (etaMinutes + 10) * 60000)
}
