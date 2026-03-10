export type BranchCategory = 'صيانة عامة' | 'غيار زيت' | 'إطارات' | 'فحص شامل';
export type BranchStatus = 'مفتوح' | 'مغلق';

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
}
