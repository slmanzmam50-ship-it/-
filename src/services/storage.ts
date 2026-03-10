import type { Branch } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'khaldi_branches';

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

export const getBranches = (): Branch[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);

        // If no data at all, populate and return initial
        if (!data) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialBranches));
            return initialBranches;
        }

        const parsedData = JSON.parse(data);

        // If data exists but is an empty array (produced by previous bugs or manual clears), 
        // force populate it again so the user sees something.
        if (Array.isArray(parsedData) && parsedData.length === 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialBranches));
            return initialBranches;
        }

        // Make sure we are actually returning an array of branches
        if (Array.isArray(parsedData) && parsedData.length > 0) {
            return parsedData as Branch[];
        }

        // Fallback if data is corrupted (e.g. an object instead of array)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialBranches));
        return initialBranches;

    } catch (error) {
        console.error("Error reading from localStorage", error);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialBranches));
        return initialBranches;
    }
};

export const addBranch = (branch: Omit<Branch, 'id'>): Branch => {
    const branches = getBranches();
    const newBranch = { ...branch, id: uuidv4() };
    branches.push(newBranch);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(branches));
    return newBranch;
};

export const updateBranch = (updatedBranch: Branch): void => {
    let branches = getBranches();
    branches = branches.map(b => b.id === updatedBranch.id ? updatedBranch : b);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(branches));
};

export const deleteBranch = (id: string): void => {
    let branches = getBranches();
    branches = branches.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(branches));
};
