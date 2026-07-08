import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    addBranch, 
    updateBranch, 
    deleteBranch, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    subscribeToBranches, 
    subscribeToCategories,
    uploadImage,
    subscribeToCompanies,
    addCompany,
    deleteCompany,
    updateCompany,
    subscribeToServiceRequests,
    addServiceRequest,
    clearServiceRequestRatings,
    deleteServiceRequestsByIds
} from '../services/storage';
import type { Branch, Category, CompanyAccount, ServiceRequest } from '../types';
import BranchForm from '../components/BranchForm';
import { Plus, Edit2, Trash2, Loader2, Search, Check, X as CloseIcon, AlertCircle, FileDown, Layers, Database, Image as ImageIcon, FileText, Car, Wrench, MapPin, Globe, Flame, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { utils, writeFile } from 'xlsx';


const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | undefined>(undefined);
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [activeTab, setActiveTab] = useState<'branches' | 'categories' | 'companies' | 'requests' | 'settings'>('branches');
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [categoryEditName, setCategoryEditName] = useState('');
    const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');
    const [newCategoryFile, setNewCategoryFile] = useState<File | null>(null);
    const [categoryEditImageUrl, setCategoryEditImageUrl] = useState('');
    const [categoryEditFile, setCategoryEditFile] = useState<File | null>(null);
    const [lang, setLang] = useState<'ar' | 'en'>(() => (localStorage.getItem('lang') as 'ar' | 'en') || 'ar');
    const [isBatchFetching, setIsBatchFetching] = useState(false);

    // Settings tab states for data deletion and MS Word exports
    const [ratingsDownloaded, setRatingsDownloaded] = useState(false);
    const [requestsDownloaded, setRequestsDownloaded] = useState(false);
    const [isClearingRatings, setIsClearingRatings] = useState(false);
    const [isClearingRequests, setIsClearingRequests] = useState(false);

    // New corporate/request states
    const [companies, setCompanies] = useState<CompanyAccount[]>([]);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyPhone, setNewCompanyPhone] = useState('');
    const [newCompanyManager, setNewCompanyManager] = useState('');
    const [newCompanyUsername, setNewCompanyUsername] = useState('');
    const [newCompanyPassword, setNewCompanyPassword] = useState('');
    const [isAddingCompany, setIsAddingCompany] = useState(false);
    const [managingHiddenBranchCompany, setManagingHiddenBranchCompany] = useState<CompanyAccount | null>(null);
    const [tempHiddenBranchIds, setTempHiddenBranchIds] = useState<string[]>([]);

    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [requestSearch, setRequestSearch] = useState('');
    const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

    // Admin acting on behalf of corporations to create requests
    const [isAdminCreatingRequest, setIsAdminCreatingRequest] = useState(false);
    const [adminSelectedCompanyId, setAdminSelectedCompanyId] = useState('');
    const [adminPlateNumber, setAdminPlateNumber] = useState('');
    const [adminServiceDescription, setAdminServiceDescription] = useState('');
    const [adminTargetBranchIds, setAdminTargetBranchIds] = useState<string[]>(['all']);
    const [isAdminSubmittingRequest, setIsAdminSubmittingRequest] = useState(false);
    const [adminBranchSearch, setAdminBranchSearch] = useState('');

    const getAdminBranchScore = (branchId: string) => {
        if (!adminSelectedCompanyId) return 0;
        const companyReqs = requests.filter(r => r.companyId === adminSelectedCompanyId);
        const completedCount = companyReqs.filter(r => r.branchId === branchId && r.status === 'completed').length;
        const targetedCount = companyReqs.filter(r => r.targetBranchIds?.includes(branchId)).length;
        return completedCount * 3 + targetedCount;
    };

    useEffect(() => {
        const checkLang = setInterval(() => {
            const currentLang = (localStorage.getItem('lang') as 'ar' | 'en') || 'ar';
            if (currentLang !== lang) setLang(currentLang);
        }, 500);
        return () => clearInterval(checkLang);
    }, [lang]);

    useEffect(() => {
        setIsLoading(true);
        const unsubBranches = subscribeToBranches((data) => {
            setBranches(data);
            setIsLoading(false);
        });
        const unsubCats = subscribeToCategories(setCategories);
        const unsubCompanies = subscribeToCompanies(setCompanies);
        const unsubRequests = subscribeToServiceRequests(setRequests);
        return () => {
             unsubBranches();
             unsubCats();
             unsubCompanies();
             unsubRequests();
        };
    }, []);

    const stateRef = React.useRef({ activeTab, isFormOpen, isAddingCategory, editingCategoryId, isAddingCompany, managingHiddenBranchCompany, isAdminCreatingRequest });
    stateRef.current = { activeTab, isFormOpen, isAddingCategory, editingCategoryId, isAddingCompany, managingHiddenBranchCompany, isAdminCreatingRequest };

    const depth = (activeTab !== 'branches' ? 1 : 0) + 
                  ((isFormOpen || isAddingCategory || editingCategoryId !== null || isAddingCompany || managingHiddenBranchCompany !== null || isAdminCreatingRequest) ? 1 : 0);
    const prevDepth = React.useRef(0);
    const isHardwareBack = React.useRef(false);
    const ignoreNextPop = React.useRef(false);

    useEffect(() => {
        if (depth > prevDepth.current) {
            window.history.pushState({ trap: depth }, '');
        } else if (depth < prevDepth.current) {
            if (isHardwareBack.current) {
                isHardwareBack.current = false;
            } else {
                if (window.history.state?.trap) {
                    ignoreNextPop.current = true;
                    window.history.go(depth - prevDepth.current);
                }
            }
        }
        prevDepth.current = depth;
    }, [depth]);

    useEffect(() => {
        const handlePopState = () => {
            if (ignoreNextPop.current) {
                ignoreNextPop.current = false;
                return;
            }
            isHardwareBack.current = true;
            const s = stateRef.current;
            if (s.isFormOpen || s.isAddingCategory || s.editingCategoryId !== null || s.isAddingCompany || s.managingHiddenBranchCompany !== null || s.isAdminCreatingRequest) {
                setIsFormOpen(false);
                setIsAddingCategory(false);
                setEditingCategoryId(null);
                setIsAddingCompany(false);
                setManagingHiddenBranchCompany(null);
                setIsAdminCreatingRequest(false);
            } else if (s.activeTab !== 'branches') {
                setActiveTab('branches');
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const filteredBranches = branches.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalBranches = branches.length;
    const openBranchesCount = branches.filter(b => b.status === 'مفتوح').length;

    const handleSaveBranch = async (branchData: Omit<Branch, 'id'> | Branch) => {
        try {
            if ('id' in branchData) {
                await updateBranch(branchData as Branch);
                toast.success('تم تعديل الفرع بنجاح ✅');
            } else {
                // Check for duplicates
                const isDuplicate = branches.some(b => 
                    b.name.trim().toLowerCase() === branchData.name.trim().toLowerCase() ||
                    (Math.abs(b.latitude - branchData.latitude) < 0.0001 && Math.abs(b.longitude - branchData.longitude) < 0.0001)
                );

                if (isDuplicate) {
                    toast.error(lang === 'ar' ? 'هذا الفرع موجود مسبقاً (تطابق في الاسم أو الموقع) ❌' : 'This branch already exists ❌');
                    return; // Stop execution, don't close form
                }

                await addBranch(branchData);
                toast.success('تم إضافة الفرع بنجاح ✅');
            }
            setIsFormOpen(false);
            setEditingBranch(undefined);
        } catch (error: any) {
            toast.error('فشل في حفظ البيانات');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(lang === 'ar' ? `هل أنت متأكد من حذف فرع "${name}"؟` : `Are you sure you want to delete branch "${name}"?`)) {
            try {
                await deleteBranch(id);
                toast.success(lang === 'ar' ? 'تم حذف الفرع بنجاح' : 'Branch deleted successfully');
            } catch (error: any) {
                toast.error('حدث خطأ أثناء الحذف');
            }
        }
    };

    const handleAddCategory = async () => {
        const name = newCategoryName.trim();
        if (!name) return;
        setIsAddingCategory(true);
        try {
            let finalImageUrl = newCategoryImageUrl;
            if (newCategoryFile) {
                toast.loading('جاري رفع الصورة...', { id: 'catUpload' });
                finalImageUrl = await uploadImage(newCategoryFile, 'categories');
                toast.success('تم رفع الصورة بنجاح', { id: 'catUpload' });
            }
            await addCategory(name, finalImageUrl);
            setNewCategoryName('');
            setNewCategoryImageUrl('');
            setNewCategoryFile(null);
            toast.success('تم إضافة القسم بنجاح');
        } catch (error: any) {
            toast.error('حدث خطأ أثناء إضافة القسم', { id: 'catUpload' });
        } finally {
            setIsAddingCategory(false);
        }
    };

    const handleUpdateCategory = async (id: string) => {
        try {
            let finalImageUrl = categoryEditImageUrl;
            if (categoryEditFile) {
                toast.loading('جاري التحديث ورفع الصورة...', { id: 'catUpload' });
                finalImageUrl = await uploadImage(categoryEditFile, 'categories');
                toast.success('تم رفع الصورة بنجاح', { id: 'catUpload' });
            }
            await updateCategory({ id, name: categoryEditName, imageUrl: finalImageUrl });
            setEditingCategoryId(null);
            setCategoryEditFile(null);
            toast.success('تم تحديث القسم');
        } catch (error: any) {
            toast.error('فشل التحديث', { id: 'catUpload' });
        }
    };

    const handleExportExcel = () => {
        const headers = ["اسم الفرع", "العنوان", "رقم الجوال", "الحالة", "المدير", "الأقسام", "رابط قوقل ماب", "الإحداثيات"];
        const rows = branches.map(b => [
            b.name,
            b.address,
            b.phone,
            b.status,
            b.managerName || "",
            b.categories?.join(" | ") || "",
            b.mapUrl || "",
            `${b.latitude}, ${b.longitude}`
        ]);
        
        const worksheet = utils.aoa_to_sheet([headers, ...rows]);
        worksheet['!dir'] = 'rtl'; // Right-to-left for Arabic
        
        // Auto-size columns slightly
        const colWidths = [
            { wch: 25 }, // Name
            { wch: 40 }, // Address
            { wch: 15 }, // Phone
            { wch: 10 }, // Status
            { wch: 20 }, // Manager
            { wch: 30 }, // Categories
            { wch: 45 }, // Map URL
            { wch: 25 }  // Coordinates
        ];
        worksheet['!cols'] = colWidths;

        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, "الفروع");
        
        writeFile(workbook, `branches_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success(lang === 'ar' ? 'تم تصدير الإكسل بنجاح' : 'Excel exported successfully');
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        const category = categories.find(c => c.id === id);
        if (!category) return;
        if (branches.some(b => b.categories?.includes(category.name))) {
            toast.error(lang === 'ar' ? 'لا يمكن حذف قسم مرتبط بفروع' : 'Cannot delete category linked to branches');
            return;
        }
        if (window.confirm(lang === 'ar' ? `هل أنت متأكد من حذف تصنيف "${name}"؟` : `Are you sure you want to delete category "${name}"?`)) {
            try {
                await deleteCategory(id);
                toast.success(lang === 'ar' ? 'تم حذف التصنيف بنجاح' : 'Category deleted successfully');
            } catch (error: any) {
                toast.error('فشل الحذف');
            }
        }
    };


    const handleBatchFetchImages = async () => {
        if (window.confirm(lang === 'ar' ? 'هل تريد جلب وتحديث صور الغلاف لجميع الفروع من قوقل ماب تلقائياً؟' : 'Do you want to automatically fetch and update cover images for all branches from Google Maps?')) {
            setIsBatchFetching(true);
            const toastId = toast.loading(lang === 'ar' ? 'جاري جلب وتحديث صور الفروع من قوقل ماب...' : 'Fetching and updating branch images from Google Maps...');
            let updatedCount = 0;
            let failedCount = 0;

            const processBranch = async (b: Branch) => {
                try {
                    const queryVal = b.name + ' ' + (b.address || '');
                    const apiUrl = `/api/get-google-photo?query=${encodeURIComponent(queryVal)}&lat=${b.latitude}&lng=${b.longitude}`;

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 12000);

                    const response = await fetch(apiUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const blob = await response.blob();
                        if (blob.type.startsWith('image/')) {
                            const filename = `google_map_photo_${b.id}.jpg`;
                            const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
                            
                            const finalImageUrl = await uploadImage(file, 'branches');
                            await updateBranch({ ...b, imageUrl: finalImageUrl });
                            updatedCount++;
                            return;
                        }
                    }
                    failedCount++;
                } catch (e) {
                    console.error(`Failed to fetch image for branch ${b.name}:`, e);
                    failedCount++;
                }
            };

            // Process all in parallel (fast and robust)
            await Promise.all(branches.map(b => processBranch(b)));

            toast.success(
                lang === 'ar' 
                    ? `اكتمل التحديث تلقائياً! تم تحديث ${updatedCount} فرع، وفشل ${failedCount} فرع.`
                    : `Batch update complete! Updated ${updatedCount} branches, failed ${failedCount}.`, 
                { id: toastId, duration: 6000 }
            );
            setIsBatchFetching(false);
        }
    };

    const getBranchCountByCategory = (catName: string) => branches.filter(b => b.categories?.includes(catName)).length;

    // --- Companies helpers ---
    const handleAddCompany = async () => {
        const name = newCompanyName.trim();
        const usernameVal = newCompanyUsername.trim();
        const passwordVal = newCompanyPassword.trim();
        
        if (!name) {
            toast.error('الرجاء إدخال اسم الشركة');
            return;
        }
        if (!usernameVal || !passwordVal) {
            toast.error('الرجاء إدخال اسم المستخدم وكلمة المرور للشركة');
            return;
        }

        setIsAddingCompany(true);
        try {
            await addCompany({
                name,
                phone: newCompanyPhone.trim(),
                managerName: newCompanyManager.trim(),
                username: usernameVal,
                password: passwordVal
            });
            setNewCompanyName('');
            setNewCompanyPhone('');
            setNewCompanyManager('');
            setNewCompanyUsername('');
            setNewCompanyPassword('');
            toast.success('تم إضافة الشركة ببيانات الدخول بنجاح ✅');
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء إضافة الشركة');
        } finally {
            setIsAddingCompany(false);
        }
    };

    const handleDeleteCompany = async (id: string, name: string) => {
        if (window.confirm(`هل أنت متأكد من حذف شركة "${name}"؟ جميع طلباتها ستظل محفوظة للإرشيف.`)) {
            try {
                await deleteCompany(id);
                toast.success('تم حذف الشركة بنجاح');
            } catch (error) {
                console.error(error);
                toast.error('فشل حذف الشركة');
            }
        }
    };

    const openManageHiddenBranchesModal = (company: CompanyAccount) => {
        setManagingHiddenBranchCompany(company);
        setTempHiddenBranchIds(company.hiddenBranchIds || []);
    };

    const handleSaveHiddenBranches = async () => {
        if (!managingHiddenBranchCompany) return;
        try {
            const updated: CompanyAccount = {
                ...managingHiddenBranchCompany,
                hiddenBranchIds: tempHiddenBranchIds
            };
            await updateCompany(updated);
            toast.success(`تم تحديث قائمة الفروع المخفية لشركة ${managingHiddenBranchCompany.name} بنجاح! 💾`);
            setManagingHiddenBranchCompany(null);
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء حفظ الفروع المخفية');
        }
    };

    // --- Service Requests Excel Export ---
    const handleExportRequestsExcel = () => {
        const headers = ["رقم الطلب", "الشركة", "رقم اللوحة", "الخدمة المطلوبة", "الحالة", "تاريخ الإنشاء", "تاريخ التنفيذ", "الفرع المنفذ"];
        const rows = requests.map(r => [
            r.id,
            r.companyName,
            r.plateNumber,
            r.serviceDescription,
            r.status === 'active' ? 'نشط' : 'منفذ ومستلم',
            new Date(r.createdAt).toLocaleString('ar-SA'),
            r.completedAt ? new Date(r.completedAt).toLocaleString('ar-SA') : "",
            r.branchName || ""
        ]);

        const worksheet = utils.aoa_to_sheet([headers, ...rows]);
        worksheet['!dir'] = 'rtl';

        const colWidths = [
            { wch: 15 }, // ID
            { wch: 25 }, // Company
            { wch: 15 }, // Plate
            { wch: 35 }, // Service
            { wch: 15 }, // Status
            { wch: 25 }, // Created At
            { wch: 25 }, // Completed At
            { wch: 25 }  // Executing Branch
        ];
        worksheet['!cols'] = colWidths;

        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, "الطلبات العام");

        writeFile(workbook, `requests_report_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('تم تصدير سجل الطلبات بنجاح 📊');
    };

    const handleAdminCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const compId = adminSelectedCompanyId;
        const pNum = adminPlateNumber.trim();
        const sDesc = adminServiceDescription.trim();

        if (!compId) {
            toast.error('الرجاء اختيار الشركة أولاً');
            return;
        }
        if (!pNum) {
            toast.error('الرجاء إدخال رقم اللوحة');
            return;
        }
        if (!sDesc) {
            toast.error('الرجاء إدخال الخدمة المطلوبة');
            return;
        }
        if (adminTargetBranchIds.length === 0) {
            toast.error('الرجاء تحديد فرع واحد على الأقل أو اختيار "الكل"');
            return;
        }

        const compObj = companies.find(c => c.id === compId);
        if (!compObj) {
            toast.error('الشركة المحددة غير موجودة');
            return;
        }

        setIsAdminSubmittingRequest(true);
        try {
            const visibleBranches = branches.filter(b => !compObj.hiddenBranchIds?.includes(b.id));
            const finalBranchIds = adminTargetBranchIds.includes('all')
                ? visibleBranches.map(b => b.id)
                : adminTargetBranchIds;

            const newReq = await addServiceRequest({
                companyId: compId,
                companyName: compObj.name,
                plateNumber: pNum,
                serviceDescription: sDesc,
                targetBranchIds: finalBranchIds,
                companyHiddenBranchIds: compObj.hiddenBranchIds || []
            });
            toast.success(`تم إنشاء الطلب بنجاح للشركة ${compObj.name}! رقم الطلب: ${newReq.id} 🎉`);
            setAdminSelectedCompanyId('');
            setAdminPlateNumber('');
            setAdminServiceDescription('');
            setAdminTargetBranchIds(['all']);
            setIsAdminCreatingRequest(false);
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء إنشاء الطلب بالنيابة عن الشركة');
        } finally {
            setIsAdminSubmittingRequest(false);
        }
    };

    const handleExportRatingsDoc = () => {
        const ratedReqs = requests.filter(r => r.rating);
        if (ratedReqs.length === 0) {
            toast.error("لا توجد تقييمات لتصديرها حالياً.");
            return;
        }
        
        let htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>تقرير التقييمات الشهري</title>
        <style>
            body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; }
            h1 { text-align: center; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: right; }
            th { background-color: #0f172a; color: white; }
        </style>
        </head>
        <body>
        <h1>مراكز خدمة سلمان زمام الخالدي</h1>
        <h2>تقرير تقييمات العملاء والسائقين الشهري - تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}</h2>
        <table>
            <thead>
                <tr>
                    <th>رقم الطلب</th>
                    <th>الشركة</th>
                    <th>رقم اللوحة</th>
                    <th>الفرع المنفذ</th>
                    <th>التقييم</th>
                    <th>تعليق السائق</th>
                    <th>تاريخ التقييم</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        ratedReqs.forEach(r => {
            htmlContent += `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.companyName}</td>
                    <td>${r.plateNumber}</td>
                    <td>${r.branchName || '-'}</td>
                    <td>${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</td>
                    <td>${r.ratingComment || '-'}</td>
                    <td>${r.ratedAt ? new Date(r.ratedAt).toLocaleDateString('ar-SA') : '-'}</td>
                </tr>
            `;
        });
        
        htmlContent += `
            </tbody>
        </table>
        </body>
        </html>
        `;
        
        const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `تقييمات_العملاء_${new Date().getMonth() + 1}_${new Date().getFullYear()}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setRatingsDownloaded(true);
        toast.success("✅ تم تصدير ملف الوورد بنجاح! تم تفعيل زر الحذف الآن.");
    };

    const handleClearRatingsDb = async () => {
        if (!ratingsDownloaded) {
            toast.error("⚠️ يرجى تنزيل ملف الوورد وحفظ نسخة احتياطية أولاً قبل تأكيد الحذف!");
            return;
        }
        const ratedReqs = requests.filter(r => r.rating);
        if (ratedReqs.length === 0) {
            toast.error("لا توجد تقييمات لحذفها.");
            return;
        }
        
        if (!window.confirm(`هل أنت متأكد من حذف وإفراغ جميع التقييمات الحالية (${ratedReqs.length} تقييم)؟ لن تتمكن من التراجع عن هذه الخطوة!`)) {
            return;
        }
        
        setIsClearingRatings(true);
        try {
            await clearServiceRequestRatings(ratedReqs.map(r => r.id));
            toast.success("✅ تم حذف وإفراغ جميع التقييمات في قاعدة البيانات بنجاح!");
            setRatingsDownloaded(false);
        } catch (error) {
            console.error(error);
            toast.error("حدث خطأ أثناء حذف التقييمات.");
        } finally {
            setIsClearingRatings(false);
        }
    };

    const getOldRequestsCount = () => {
        const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
        return requests.filter(r => r.createdAt < sixMonthsAgo).length;
    };

    const handleExportOldRequestsDoc = () => {
        const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
        const oldReqs = requests.filter(r => r.createdAt < sixMonthsAgo);
        
        if (oldReqs.length === 0) {
            toast.error("لا توجد طلبات قديمة (أكبر من 6 أشهر) لتصديرها.");
            return;
        }
        
        let htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>أرشيف الطلبات الدوري</title>
        <style>
            body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; }
            h1 { text-align: center; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-size: 12px; }
            th { background-color: #0f172a; color: white; }
        </style>
        </head>
        <body>
        <h1>مراكز خدمة سلمان زمام الخالدي</h1>
        <h2>أرشيف طلبات صيانة الشركات (كل 6 أشهر) - تاريخ الأرشفة: ${new Date().toLocaleDateString('ar-SA')}</h2>
        <table>
            <thead>
                <tr>
                    <th>رقم الطلب</th>
                    <th>الشركة</th>
                    <th>رقم اللوحة</th>
                    <th>الخدمة المطلوبة</th>
                    <th>الفرع المنفذ</th>
                    <th>الحالة</th>
                    <th>تاريخ الإنشاء</th>
                    <th>تاريخ التنفيذ</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        oldReqs.forEach(r => {
            htmlContent += `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.companyName}</td>
                    <td>${r.plateNumber}</td>
                    <td>${r.serviceDescription}</td>
                    <td>${r.branchName || '-'}</td>
                    <td>${r.status === 'completed' ? 'منفذ' : r.status === 'rejected' ? 'مرفوض' : r.status}</td>
                    <td>${new Date(r.createdAt).toLocaleDateString('ar-SA')}</td>
                    <td>${r.completedAt ? new Date(r.completedAt).toLocaleDateString('ar-SA') : '-'}</td>
                </tr>
            `;
        });
        
        htmlContent += `
            </tbody>
        </table>
        </body>
        </html>
        `;
        
        const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `أرشيف_طلبات_الشركات_${new Date().toLocaleDateString('ar-SA')}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setRequestsDownloaded(true);
        toast.success("✅ تم تصدير أرشيف الطلبات الدوري بنجاح! تم تفعيل زر الحذف الآن.");
    };

    const handleClearOldRequestsDb = async () => {
        if (!requestsDownloaded) {
            toast.error("⚠️ يرجى تنزيل ملف الوورد وحفظ نسخة احتياطية أولاً قبل تأكيد الحذف!");
            return;
        }
        const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
        const oldReqs = requests.filter(r => r.createdAt < sixMonthsAgo);
        
        if (oldReqs.length === 0) {
            toast.error("لا توجد طلبات قديمة لحذفها.");
            return;
        }
        
        if (!window.confirm(`هل أنت متأكد من حذف وإفراغ جميع الطلبات القديمة (${oldReqs.length} طلب) بشكل نهائي؟ لن تتمكن من استرجاعها!`)) {
            return;
        }
        
        setIsClearingRequests(true);
        try {
            await deleteServiceRequestsByIds(oldReqs.map(r => r.id));
            toast.success("✅ تم حذف جميع الطلبات التاريخية القديمة بنجاح من قاعدة البيانات!");
            setRequestsDownloaded(false);
        } catch (error) {
            console.error(error);
            toast.error("حدث خطأ أثناء تصفية الطلبات القديمة.");
        } finally {
            setIsClearingRequests(false);
        }
    };

    return (
        <div className="admin-container">
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button 
                    onClick={() => setActiveTab('branches')} 
                    className="tab-button"
                    style={{ 
                        padding: '0.75rem 1.5rem', 
                        borderRadius: '12px', 
                        border: 'none', 
                        background: activeTab === 'branches' ? 'var(--primary-color)' : 'var(--bg-color)', 
                        color: activeTab === 'branches' ? 'white' : 'var(--text-secondary)', 
                        cursor: 'pointer', 
                        fontWeight: 700,
                        flex: activeTab === 'branches' ? 1.2 : 1,
                        transition: 'all 0.3s ease'
                    }}
                >
                    الفروع
                </button>
                <button 
                    onClick={() => setActiveTab('categories')} 
                    className="tab-button"
                    style={{ 
                        padding: '0.75rem 1.5rem', 
                        borderRadius: '12px', 
                        border: 'none', 
                        background: activeTab === 'categories' ? 'var(--primary-color)' : 'var(--bg-color)', 
                        color: activeTab === 'categories' ? 'white' : 'var(--text-secondary)', 
                        cursor: 'pointer', 
                        fontWeight: 700,
                        flex: activeTab === 'categories' ? 1.2 : 1,
                        transition: 'all 0.3s ease'
                    }}
                >
                    الأقسام
                </button>
                <button 
                    onClick={() => setActiveTab('companies')} 
                    className="tab-button"
                    style={{ 
                        padding: '0.75rem 1.5rem', 
                        borderRadius: '12px', 
                        border: 'none', 
                        background: activeTab === 'companies' ? 'var(--primary-color)' : 'var(--bg-color)', 
                        color: activeTab === 'companies' ? 'white' : 'var(--text-secondary)', 
                        cursor: 'pointer', 
                        fontWeight: 700,
                        flex: activeTab === 'companies' ? 1.2 : 1,
                        transition: 'all 0.3s ease'
                    }}
                >
                    الشركات
                </button>
                <button 
                    onClick={() => setActiveTab('requests')} 
                    className="tab-button"
                    style={{ 
                        padding: '0.75rem 1.5rem', 
                        borderRadius: '12px', 
                        border: 'none', 
                        background: activeTab === 'requests' ? 'var(--primary-color)' : 'var(--bg-color)', 
                        color: activeTab === 'requests' ? 'white' : 'var(--text-secondary)', 
                        cursor: 'pointer', 
                        fontWeight: 700,
                        flex: activeTab === 'requests' ? 1.2 : 1,
                        transition: 'all 0.3s ease'
                    }}
                >
                    سجل الطلبات
                </button>
                <button 
                    onClick={() => setActiveTab('settings')} 
                    className="tab-button"
                    style={{ 
                        padding: '0.75rem 1.5rem', 
                        borderRadius: '12px', 
                        border: 'none', 
                        background: activeTab === 'settings' ? 'var(--primary-color)' : 'var(--bg-color)', 
                        color: activeTab === 'settings' ? 'white' : 'var(--text-secondary)', 
                        cursor: 'pointer', 
                        fontWeight: 700,
                        flex: activeTab === 'settings' ? 1.2 : 1,
                        transition: 'all 0.3s ease'
                    }}
                >
                    الإعدادات
                </button>
            </div>

            {activeTab === 'branches' && (
                <>
                    <div className="admin-header-row">
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>الفروع <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>({totalBranches})</span></h2>
                        <div className="admin-actions">
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--text-secondary)" />
                                <input 
                                    type="text" 
                                    placeholder="بحث في الفروع..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    style={{ 
                                        padding: '12px 40px 12px 12px', 
                                        borderRadius: '10px', 
                                        border: '1px solid var(--border-color)', 
                                        width: '100%',
                                        background: 'var(--surface-color)',
                                        fontSize: '14px'
                                    }} 
                                />
                            </div>
                            <button 
                                onClick={handleExportExcel} 
                                style={{ 
                                    background: 'var(--surface-color)', 
                                    color: 'var(--text-primary)', 
                                    padding: '0.85rem 1.25rem', 
                                    borderRadius: '10px', 
                                    border: '1px solid var(--border-color)', 
                                    fontWeight: 700, 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    fontSize: '14px'
                                }}
                            >
                                <FileDown size={18} />
                                <span className="mobile-hide">{lang === 'ar' ? 'تصدير إكسل' : 'Export Excel'}</span>
                            </button>
                            <button 
                                onClick={handleBatchFetchImages} 
                                disabled={isBatchFetching}
                                style={{ 
                                    background: 'var(--navy-surface)', 
                                    color: 'white', 
                                    padding: '0.85rem 1.25rem', 
                                    borderRadius: '10px', 
                                    border: '1px solid var(--border-color)', 
                                    fontWeight: 700, 
                                    cursor: isBatchFetching ? 'not-allowed' : 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    fontSize: '14px'
                                }}
                            >
                                {isBatchFetching ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}
                                <span>{lang === 'ar' ? 'تحديث الصور من قوقل' : 'Update Images from Google'}</span>
                            </button>
                            <button 
                                onClick={() => setIsFormOpen(true)} 
                                style={{ 
                                    background: 'var(--primary-color)', 
                                    color: 'white', 
                                    padding: '0.85rem 1.25rem', 
                                    borderRadius: '10px', 
                                    border: 'none', 
                                    fontWeight: 700, 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    fontSize: '14px'
                                }}
                            >
                                <Plus size={18} /> 
                                <span>إضافة فرع</span>
                            </button>
                        </div>
                    </div>

                    <div className="admin-stats-grid">
                        <div className="glass admin-stats-card hover-scale tap-effect">
                            <div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>إجمالي الفروع</p>
                                <strong style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}>{totalBranches}</strong>
                            </div>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                <Database size={46} color="var(--primary-color)" />
                            </div>
                        </div>
                        <div className="glass admin-stats-card hover-scale tap-effect">
                            <div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>مفتوح الآن</p>
                                <strong style={{ fontSize: '1.5rem', color: 'var(--success)' }}>{openBranchesCount}</strong>
                            </div>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                <Check size={46} color="var(--success)" />
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="glass" style={{ height: '80px', display: 'flex', alignItems: 'center', padding: '0 1.5rem' }}>
                                    <div className="skeleton skeleton-title" style={{ width: '30%', marginBottom: 0 }}></div>
                                    <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 0, marginInlineStart: 'auto' }}></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="responsive-table-container glass">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>اسم الفرع</th>
                                        <th className="mobile-hide">العنوان</th>
                                        <th>الحالة</th>
                                        <th>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBranches.length === 0 ? (
                                        <tr className="animate-fade-in">
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '3.5rem' }}>
                                                <div className="empty-state-container" style={{ padding: 0 }}>
                                                    <AlertCircle className="empty-state-icon" style={{ width: 40, height: 40 }} />
                                                    <div className="empty-state-title" style={{ fontSize: '1.1rem' }}>
                                                        {lang === 'ar' ? 'لا توجد فروع مطابقة' : 'No matching branches'}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredBranches.map(b => (
                                        <tr key={b.id} className="animate-fade-in">
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {b.imageUrl ? (
                                                            <img src={b.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <ImageIcon size={14} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.name}</div>
                                                        <div style={{ display: 'block' }} className="desktop-hide">
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.address}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="mobile-hide" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '250px' }}>{b.address}</td>
                                            <td>
                                                <span style={{ 
                                                    padding: '4px 10px', 
                                                    borderRadius: '8px', 
                                                    background: b.status === 'مفتوح' 
                                                        ? 'rgba(16, 185, 129, 0.1)' 
                                                        : b.status === 'تحت الصيانة' 
                                                            ? 'rgba(249, 115, 22, 0.1)' 
                                                            : 'rgba(239, 68, 68, 0.1)', 
                                                    color: b.status === 'مفتوح' 
                                                        ? 'var(--success)' 
                                                        : b.status === 'تحت الصيانة' 
                                                            ? '#f97316' 
                                                            : 'var(--error)', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 800 
                                                }}>
                                                    {b.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'left' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button 
                                                        onClick={() => { setEditingBranch(b); setIsFormOpen(true); }} 
                                                        style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                                                        title="تعديل"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(b.id, b.name)} 
                                                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                                                        title="حذف"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'categories' && (
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                        <input 
                            type="text" 
                            value={newCategoryName} 
                            onChange={(e) => setNewCategoryName(e.target.value)} 
                            placeholder="اسم القسم الجديد (مثلاً: كفرات)" 
                            style={{ flex: 1, minWidth: '200px', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }} 
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.85rem', borderRadius: '10px', border: '1px dashed var(--primary-color)', background: 'var(--surface-color)', color: 'var(--primary-color)', cursor: 'pointer', flex: 1, minWidth: '200px' }}>
                            <ImageIcon size={18} />
                            <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {newCategoryFile ? newCategoryFile.name : 'صورة القسم (اختياري)'}
                            </span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                style={{ display: 'none' }} 
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setNewCategoryFile(e.target.files[0]);
                                    }
                                }} 
                            />
                        </label>
                        <button 
                            onClick={handleAddCategory} 
                            disabled={isAddingCategory} 
                            style={{ background: 'var(--success)', color: 'white', padding: '0 2rem', height: '64px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', minWidth: '100px' }}
                        >
                            {isAddingCategory ? <Loader2 className="animate-spin" size={20} /> : 'إضافة'}
                        </button>
                    </div>
                    
                    {categories.length === 0 ? (
                        <div className="empty-state-container" style={{ padding: '3rem 0' }}>
                            <AlertCircle className="empty-state-icon" style={{ width: 40, height: 40 }} />
                            <div className="empty-state-title" style={{ fontSize: '1rem' }}>
                                {lang === 'ar' ? 'لا توجد تصنيفات حالياً' : 'No categories yet'}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
                            {categories.map(c => (
                                <div key={c.id} className="category-card animate-fade-in" style={{ 
                                    background: 'var(--surface-color)', 
                                    padding: '1.25rem', 
                                    borderRadius: '16px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '1rem', 
                                    position: 'relative',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                                }}>
                                    <div style={{ position: 'absolute', top: '1rem', left: lang === 'ar' ? '1rem' : 'auto', right: lang !== 'ar' ? '1rem' : 'auto', display: 'flex', gap: '8px', zIndex: 10 }}>
                                        <button onClick={() => { 
                                    setEditingCategoryId(c.id); 
                                    setCategoryEditName(c.name); 
                                    setCategoryEditImageUrl(c.imageUrl || ''); 
                                    setCategoryEditFile(null);
                                }} style={{ background: 'var(--bg-color)', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '6px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}><Edit2 size={14} /></button>
                                        <button onClick={() => handleDeleteCategory(c.id, c.name)} style={{ background: 'var(--bg-color)', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '6px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}><Trash2 size={14} /></button>
                                    </div>
                                    
                                    {editingCategoryId === c.id ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
                                            <input value={categoryEditName} onChange={e => setCategoryEditName(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--primary-color)', background: 'var(--bg-color)', outline: 'none' }} placeholder="اسم القسم" />
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '8px', border: '1px dashed var(--primary-color)', background: 'var(--surface-color)', color: 'var(--primary-color)', cursor: 'pointer' }}>
                                                <ImageIcon size={16} />
                                                <span style={{ fontSize: '14.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {categoryEditFile ? categoryEditFile.name : (categoryEditImageUrl ? 'تغيير الصورة' : 'إرفاق صورة')}
                                                </span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    style={{ display: 'none' }} 
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            setCategoryEditFile(e.target.files[0]);
                                                        }
                                                    }} 
                                                />
                                            </label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleUpdateCategory(c.id)} style={{ flex: 1, border: 'none', background: 'var(--success)', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Check size={18} /></button>
                                                <button onClick={() => setEditingCategoryId(null)} style={{ flex: 1, border: 'none', background: 'var(--error)', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><CloseIcon size={18} /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div onClick={() => setActiveTab('branches')} style={{ height: '140px', borderRadius: '12px', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}>
                                                {c.imageUrl ? (
                                                    <img src={c.imageUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <Layers size={48} color="var(--primary-color)" style={{ opacity: 0.5 }} />
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{c.name}</h3>
                                                <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
                                                    {getBranchCountByCategory(c.name)} فرع
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'companies' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Add Company Card */}
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 800 }}>➕ إضافة حساب شركة جديد</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                            <input 
                                type="text"
                                placeholder="اسم الشركة (مثال: أرامكو)"
                                value={newCompanyName}
                                onChange={(e) => setNewCompanyName(e.target.value)}
                                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                            />
                            <input 
                                type="text"
                                placeholder="رقم الجوال (اختياري)"
                                value={newCompanyPhone}
                                onChange={(e) => setNewCompanyPhone(e.target.value)}
                                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                            />
                            <input 
                                type="text"
                                placeholder="المسؤول/المدير (اختياري)"
                                value={newCompanyManager}
                                onChange={(e) => setNewCompanyManager(e.target.value)}
                                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                            />
                            <input 
                                type="text"
                                placeholder="اسم المستخدم للدخول (مطلوب)"
                                value={newCompanyUsername}
                                onChange={(e) => setNewCompanyUsername(e.target.value)}
                                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                            />
                            <input 
                                type="text"
                                placeholder="كلمة المرور (مطلوب)"
                                value={newCompanyPassword}
                                onChange={(e) => setNewCompanyPassword(e.target.value)}
                                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <button 
                            onClick={handleAddCompany}
                            disabled={isAddingCompany}
                            style={{ background: 'var(--success)', color: 'white', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'block', width: 'fit-content' }}
                        >
                            {isAddingCompany ? <Loader2 className="animate-spin" size={18} /> : 'إضافة الشركة ببيانات الدخول'}
                        </button>
                    </div>

                    {/* Companies List Table */}
                    <div className="responsive-table-container glass">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>اسم الشركة</th>
                                    <th>اسم المستخدم</th>
                                    <th>كلمة المرور</th>
                                    <th>رقم الجوال</th>
                                    <th>المسؤول</th>
                                    <th>تاريخ التسجيل</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                                            لا توجد شركات مسجلة حالياً.
                                        </td>
                                    </tr>
                                ) : (
                                    companies.map(c => (
                                        <tr key={c.id}>
                                            <td style={{ fontWeight: 700 }}>{c.name}</td>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--primary-color)', fontWeight: 600 }}>{c.username || '-'}</td>
                                            <td style={{ fontFamily: 'monospace' }}>{c.password || '-'}</td>
                                            <td>{c.phone || '-'}</td>
                                            <td>{c.managerName || '-'}</td>
                                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {new Date(c.createdAt).toLocaleDateString('ar-SA')}
                                            </td>
                                            <td>
                                                <button 
                                                    onClick={() => navigate(`/admin/company-invoices/${c.id}`)}
                                                    style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, marginInlineEnd: '8px' }}
                                                >
                                                    <FileText size={14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> الفواتير
                                                </button>
                                                <button 
                                                    onClick={() => openManageHiddenBranchesModal(c)}
                                                    style={{ background: 'rgba(245, 158, 11, 0.1)', border: 'none', color: 'var(--accent-orange)', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, marginInlineEnd: '8px' }}
                                                >
                                                    <Settings size={14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> إخفاء الفروع
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCompany(c.id, c.name)} 
                                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}
                                                >
                                                    <Trash2 size={14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> حذف
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'requests' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Filters & Export Header */}
                    <div className="admin-header-row" style={{ margin: 0 }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>سجل طلبات الصيانة العام</h2>
                        <div className="admin-actions">
                            <div style={{ position: 'relative', width: '240px' }}>
                                <Search style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--text-secondary)" />
                                <input 
                                    type="text" 
                                    placeholder="بحث برقم اللوحة أو رقم الطلب..." 
                                    value={requestSearch} 
                                    onChange={(e) => setRequestSearch(e.target.value)} 
                                    style={{ 
                                        padding: '10px 40px 10px 12px', 
                                        borderRadius: '10px', 
                                        border: '1px solid var(--border-color)', 
                                        width: '100%',
                                        background: 'var(--surface-color)',
                                        fontSize: '14.5px'
                                    }} 
                                />
                            </div>
                            <select 
                                value={requestStatusFilter}
                                onChange={(e) => setRequestStatusFilter(e.target.value as any)}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--surface-color)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14.5px',
                                    fontWeight: 700,
                                    outline: 'none',
                                    height: '40px'
                                }}
                            >
                                <option value="all">كل الحالات</option>
                                <option value="active">نشطة (قيد الانتظار)</option>
                                <option value="transferred">محولة (عامة)</option>
                                <option value="completed">مكتملة ومستلمة</option>
                                <option value="rejected">مرفوضة</option>
                            </select>
                            <button 
                                onClick={() => setIsAdminCreatingRequest(true)}
                                style={{ 
                                    background: 'var(--primary-color)', 
                                    color: 'white', 
                                    padding: '10px 18px', 
                                    borderRadius: '10px', 
                                    border: 'none', 
                                    fontWeight: 700, 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    fontSize: '14.5px',
                                    height: '40px',
                                    boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)'
                                }}
                            >
                                <span>➕ إنشاء طلب لشركة</span>
                            </button>
                            <button 
                                onClick={handleExportRequestsExcel} 
                                style={{ 
                                    background: 'var(--surface-color)', 
                                    color: 'var(--text-primary)', 
                                    padding: '10px 18px', 
                                    borderRadius: '10px', 
                                    border: '1px solid var(--border-color)', 
                                    fontWeight: 700, 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    fontSize: '14.5px',
                                    height: '40px'
                                }}
                            >
                                <FileDown size={16} />
                                <span>تصدير الطلبات</span>
                            </button>
                        </div>
                    </div>

                    {/* Requests Logs Table */}
                    <div className="responsive-table-container glass">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>رقم الطلب</th>
                                    <th>الشركة</th>
                                    <th>رقم اللوحة</th>
                                    <th>الخدمة المطلوبة</th>
                                    <th>الفروع الموجهة</th>
                                    <th>الحالة</th>
                                    <th>تاريخ الإنشاء</th>
                                    <th>تاريخ التنفيذ</th>
                                    <th>الفرع المنفذ</th>
                                    <th>التقييم</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const filtered = requests.filter(r => {
                                        const matchesQuery = r.plateNumber.toLowerCase().includes(requestSearch.toLowerCase()) || r.id.toLowerCase().includes(requestSearch.toLowerCase());
                                        const matchesStatus = requestStatusFilter === 'all' || r.status === requestStatusFilter;
                                        return matchesQuery && matchesStatus;
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                                                    لا توجد طلبات مطابقة للبحث.
                                                </td>
                                            </tr>
                                        );
                                    }

                                    const getBranchNamesStr = (ids: string[]) => {
                                        if (!ids || ids.includes('all')) return 'الكل';
                                        return ids.map(id => branches.find(b => b.id === id)?.name || id).join('، ');
                                    };

                                    return filtered.map(r => (
                                        <tr key={r.id}>
                                            <td style={{ fontWeight: 800, color: 'var(--primary-color)' }}>{r.id}</td>
                                            <td style={{ fontWeight: 700 }}>{r.companyName}</td>
                                            <td style={{ fontWeight: 700 }}>{r.plateNumber}</td>
                                            <td style={{ fontSize: '14.5px' }}>{r.serviceDescription}</td>
                                            <td style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: 600 }}>
                                                {getBranchNamesStr(r.targetBranchIds)}
                                            </td>
                                            <td>
                                                <span style={{ 
                                                    padding: '4px 10px', 
                                                    borderRadius: '8px', 
                                                    background: r.status === 'active' 
                                                        ? 'rgba(245, 158, 11, 0.15)' 
                                                        : r.status === 'transferred'
                                                            ? 'rgba(59, 130, 246, 0.15)'
                                                            : r.status === 'rejected'
                                                                ? 'rgba(239, 68, 68, 0.15)'
                                                                : 'rgba(16, 185, 129, 0.15)', 
                                                    color: r.status === 'active' 
                                                        ? 'var(--accent-orange)' 
                                                        : r.status === 'transferred'
                                                            ? 'var(--primary-color)'
                                                            : r.status === 'rejected'
                                                                ? 'var(--error)'
                                                                : 'var(--success)', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 800 
                                                }}>
                                                    {r.status === 'active' ? 'نشط' : r.status === 'transferred' ? 'محول' : r.status === 'rejected' ? 'مرفوض' : 'منفذ ومستلم'}
                                                </span>
                                                {r.status === 'rejected' && r.rejectionReason && (
                                                    <div style={{ fontSize: '10px', color: 'var(--error)', marginTop: '4px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.rejectionReason}>
                                                        السبب: {r.rejectionReason}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                {new Date(r.createdAt).toLocaleString('ar-SA')}
                                            </td>
                                            <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                {r.completedAt ? new Date(r.completedAt).toLocaleString('ar-SA') : '-'}
                                            </td>
                                            <td style={{ fontWeight: 700, fontSize: '14.5px' }}>{r.branchName || '-'}</td>
                                            <td>
                                                {r.rating ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                        <div style={{ display: 'flex', gap: '2px', color: '#eab308' }}>
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <span key={star} style={{ fontSize: '14px' }}>
                                                                    {star <= r.rating! ? '★' : '☆'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        {r.ratingComment && (
                                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.ratingComment}>
                                                                {r.ratingComment}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {/* Admin B2B Order Creation Modal */}
                    {isAdminCreatingRequest && (
                        <div style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10000,
                            padding: '16px',
                            direction: 'rtl'
                        }}>
                            <div className="glass animate-scale-up" style={{
                                background: 'var(--surface-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '24px',
                                width: '100%',
                                maxWidth: '500px',
                                padding: '24px',
                                position: 'relative',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                textAlign: 'right'
                            }}>
                                <button 
                                    onClick={() => setIsAdminCreatingRequest(false)}
                                    style={{
                                        position: 'absolute',
                                        top: '16px',
                                        right: '16px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <CloseIcon size={18} />
                                </button>

                                <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                                    ➕ إنشاء طلب صيانة بالنيابة عن شركة
                                </h3>
                                <p style={{ margin: '0 0 20px', fontSize: '14.5px', color: 'var(--text-secondary)' }}>
                                    يمكنك تعبئة هذا النموذج لرفع طلب مركبة لشركة مفوض عنها مباشرة.
                                </p>

                                <form onSubmit={handleAdminCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                    {/* Company Selector */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-secondary)' }}>🏢 الشركة صاحبة الطلب:</label>
                                        <select
                                            value={adminSelectedCompanyId}
                                            onChange={(e) => setAdminSelectedCompanyId(e.target.value)}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                border: '2px solid var(--border-color)',
                                                background: 'var(--bg-color)',
                                                color: 'var(--text-primary)',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                outline: 'none',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary-color)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border-color)';
                                            }}
                                        >
                                            <option value="">-- اختر الشركة --</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Inputs Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {/* Plate Number */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Car size={14} /> رقم لوحة السيارة:
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder="أ ب ج 1 2 3"
                                                value={adminPlateNumber}
                                                onChange={(e) => setAdminPlateNumber(e.target.value)}
                                                style={{
                                                    padding: '12px 14px',
                                                    borderRadius: '12px',
                                                    border: '2px solid var(--border-color)',
                                                    background: 'var(--bg-color)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '14.5px',
                                                    fontWeight: 700,
                                                    outline: 'none',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = 'var(--primary-color)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--border-color)';
                                                }}
                                            />
                                        </div>
                                        {/* Service Description */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Wrench size={14} /> الخدمة المطلوبة:
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder="مثال: غيار زيت"
                                                value={adminServiceDescription}
                                                onChange={(e) => setAdminServiceDescription(e.target.value)}
                                                style={{
                                                    padding: '12px 14px',
                                                    borderRadius: '12px',
                                                    border: '2px solid var(--border-color)',
                                                    background: 'var(--bg-color)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '14.5px',
                                                    fontWeight: 700,
                                                    outline: 'none',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = 'var(--primary-color)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--border-color)';
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Branch Selector Chip Grid */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <MapPin size={16} color="var(--primary-color)" /> الفروع الموجه إليها الطلب:
                                        </label>

                                        {/* Search Filter Input */}
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', maxWidth: '100%', marginBottom: '4px' }}>
                                            <Search style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} size={15} color="var(--text-secondary)" />
                                            <input
                                                type="text"
                                                placeholder="ابحث عن فرع..."
                                                value={adminBranchSearch}
                                                onChange={(e) => setAdminBranchSearch(e.target.value)}
                                                style={{
                                                    padding: '8px 36px 8px 36px',
                                                    borderRadius: '10px',
                                                    border: '1.5px solid var(--border-color)',
                                                    background: 'var(--bg-color)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '14.5px',
                                                    fontWeight: 600,
                                                    width: '100%',
                                                    outline: 'none',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = 'var(--primary-color)';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--border-color)';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                            />
                                            {adminBranchSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAdminBranchSearch('')}
                                                    style={{ 
                                                        position: 'absolute', 
                                                        left: '12px', 
                                                        background: 'none', 
                                                        border: 'none', 
                                                        cursor: 'pointer', 
                                                        padding: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <CloseIcon size={15} color="var(--text-secondary)" />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div style={{ 
                                             maxHeight: '260px', 
                                             overflowY: 'auto', 
                                             padding: '10px', 
                                             border: '1px solid var(--border-color)', 
                                             borderRadius: '16px', 
                                             background: 'rgba(0,0,0,0.02)',
                                             display: 'grid', 
                                             gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                                             gap: '10px', 
                                             marginTop: '4px',
                                             scrollbarWidth: 'thin'
                                         }}>
                                            {/* "All" Option Badge */}
                                            {(!adminBranchSearch || 'جميع الفروع (الكل)'.includes(adminBranchSearch)) && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAdminTargetBranchIds(['all'])}
                                                    style={{
                                                        padding: '10px 16px',
                                                        borderRadius: '12px',
                                                        fontSize: '12.5px',
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                        border: '2px solid ' + (adminTargetBranchIds.includes('all') ? 'var(--primary-color)' : 'var(--border-color)'),
                                                        background: adminTargetBranchIds.includes('all') ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.06) 100%)' : 'var(--bg-color)',
                                                        color: adminTargetBranchIds.includes('all') ? 'var(--primary-color)' : 'var(--text-primary)',
                                                        boxShadow: adminTargetBranchIds.includes('all') ? '0 6px 14px -4px rgba(59, 130, 246, 0.25)' : 'none',
                                                        transform: adminTargetBranchIds.includes('all') ? 'scale(1.02)' : 'none',
                                                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                        userSelect: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <Globe size={14} />
                                                    <span>جميع الفروع (الكل)</span>
                                                    {adminTargetBranchIds.includes('all') && <Check size={14} strokeWidth={3} />}
                                                </button>
                                            )}

                                            {/* Individual Branch Badges */}
                                            {(() => {
                                                const sorted = [...branches].sort((a, b) => getAdminBranchScore(b.id) - getAdminBranchScore(a.id));
                                                const filtered = sorted.filter(b => b.name.toLowerCase().includes(adminBranchSearch.toLowerCase()));
                                                return filtered.map(b => {
                                                    const isSelected = adminTargetBranchIds.includes(b.id);
                                                    const score = getAdminBranchScore(b.id);
                                                    const isTopUsed = score > 0;
                                                    return (
                                                        <button
                                                            key={b.id}
                                                            type="button"
                                                            onClick={() => {
                                                                if (adminTargetBranchIds.includes('all')) {
                                                                    setAdminTargetBranchIds([b.id]);
                                                                } else {
                                                                    if (isSelected) {
                                                                        const filteredIds = adminTargetBranchIds.filter(id => id !== b.id);
                                                                        setAdminTargetBranchIds(filteredIds.length === 0 ? ['all'] : filteredIds);
                                                                    } else {
                                                                        setAdminTargetBranchIds([...adminTargetBranchIds, b.id]);
                                                                    }
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '10px 16px',
                                                                borderRadius: '12px',
                                                                fontSize: '12.5px',
                                                                fontWeight: 800,
                                                                cursor: 'pointer',
                                                                border: '2px solid ' + (isSelected ? 'var(--primary-color)' : 'var(--border-color)'),
                                                                background: isSelected ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.06) 100%)' : 'var(--bg-color)',
                                                                color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)',
                                                                boxShadow: isSelected ? '0 6px 14px -4px rgba(59, 130, 246, 0.25)' : 'none',
                                                                transform: isSelected ? 'scale(1.02)' : 'none',
                                                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                                userSelect: 'none',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '4px'
                                                            }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}>
                                                            <MapPin size={14} color={isSelected ? 'var(--primary-color)' : 'var(--text-secondary)'} />
                                                            <span>{b.name}</span>
                                                            {isSelected && <Check size={14} strokeWidth={3} style={{ marginLeft: 'auto' }} />}
                                                        </div>
                                                        {isTopUsed && (
                                                            <span style={{ 
                                                                fontSize: '8.5px', 
                                                                background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.12)', 
                                                                color: 'var(--accent-orange)', 
                                                                padding: '2px 6px', 
                                                                borderRadius: '4px', 
                                                                display: 'inline-flex', 
                                                                alignItems: 'center', 
                                                                gap: '2px', 
                                                                fontWeight: 800,
                                                                marginTop: '1px'
                                                            }}>
                                                                <Flame size={8} fill="var(--accent-orange)" /> مفضل
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            });
                                         })()}
                                         </div>
                                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '6px', display: 'block' }}>
                                            * يمكنك توجيه الطلب لجميع الفروع بالضغط على "جميع الفروع (الكل)"، أو تحديد فروع معينة بلمسها مباشرة لتفعيلها أو إلغائها.
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                        <button
                                            type="submit"
                                            disabled={isAdminSubmittingRequest}
                                            style={{
                                                flex: 1,
                                                background: 'var(--primary-color)',
                                                color: 'white',
                                                border: 'none',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                fontWeight: 800,
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                                            }}
                                        >
                                            {isAdminSubmittingRequest ? 'جاري الحفظ والإنشاء...' : 'إرسال وإنشاء الطلب'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsAdminCreatingRequest(false)}
                                            style={{
                                                flex: 1,
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                fontWeight: 800,
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)' }}>
                            <Settings size={22} /> إعدادات صيانة وتصفية البيانات
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', margin: '0 0 24px' }}>
                            أدوات مخصصة لتنظيف قاعدة البيانات بشكل دوري والحفاظ عليها من التراكم، مع نظام تأمين صارم يفرض حفظ نسخة احتياطية أولاً قبل تصفية أي سجلات.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
                            {/* Card 1: Ratings cleanup (Monthly) */}
                            <div style={{ padding: '20px', background: 'var(--bg-color)', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-orange)' }}>
                                    ⭐ تصفية تقييمات العملاء الدورية (شهري)
                                </h3>
                                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                                    تقوم هذه العملية بحذف كافة النجوم والتعليقات الخاصة بالسائقين من السجل، لتقليل حجم البيانات وحماية الخصوصية. يتطلب النظام حفظها في ملف Word مسبقاً.
                                </p>
                                <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.15)', fontSize: '14.5px' }}>
                                    📊 عدد التقييمات المخزنة حالياً: <strong>{requests.filter(r => r.rating).length} تقييم</strong>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                                    <button
                                        onClick={handleExportRatingsDoc}
                                        style={{
                                            flex: 1,
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '12.5px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <FileDown size={15} /> 1. تصدير ملف Word
                                    </button>
                                    <button
                                        onClick={handleClearRatingsDb}
                                        disabled={!ratingsDownloaded || isClearingRatings}
                                        style={{
                                            flex: 1,
                                            background: ratingsDownloaded ? 'var(--error)' : 'rgba(239, 68, 68, 0.15)',
                                            color: ratingsDownloaded ? 'white' : 'var(--error)',
                                            border: '1px solid ' + (ratingsDownloaded ? 'transparent' : 'rgba(239, 68, 68, 0.25)'),
                                            padding: '10px',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '12.5px',
                                            cursor: ratingsDownloaded ? 'pointer' : 'not-allowed',
                                            opacity: isClearingRatings ? 0.7 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        {isClearingRatings ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />} 2. حذف نهائي
                                    </button>
                                </div>
                                {!ratingsDownloaded && (
                                    <span style={{ fontSize: '11px', color: 'var(--accent-orange)', fontWeight: 700 }}>
                                        * يجب تصدير التقييمات وحفظها بملف Word لتفعيل زر الحذف النهائي.
                                    </span>
                                )}
                            </div>

                            {/* Card 2: Service requests cleanup (6 Months) */}
                            <div style={{ padding: '20px', background: 'var(--bg-color)', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-orange)' }}>
                                    📅 تصفية وحذف الطلبات القديمة (كل 6 أشهر)
                                </h3>
                                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                                    حذف وتصفية كافة طلبات صيانة السيارات القديمة الصادرة من الشركات المتعاقدة والتي تجاوز عمرها 6 أشهر بالكامل. يتطلب تنزيل وحفظ نسخة إكسل/وورد أولاً.
                                </p>
                                <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.15)', fontSize: '14.5px' }}>
                                    📊 عدد الطلبات التاريخية (الأقدم من 6 أشهر): <strong>{getOldRequestsCount()} طلب</strong>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                                    <button
                                        onClick={handleExportOldRequestsDoc}
                                        style={{
                                            flex: 1,
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '12.5px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <FileDown size={15} /> 1. تصدير الأرشيف (.doc)
                                    </button>
                                    <button
                                        onClick={handleClearOldRequestsDb}
                                        disabled={!requestsDownloaded || isClearingRequests}
                                        style={{
                                            flex: 1,
                                            background: requestsDownloaded ? 'var(--error)' : 'rgba(239, 68, 68, 0.15)',
                                            color: requestsDownloaded ? 'white' : 'var(--error)',
                                            border: '1px solid ' + (requestsDownloaded ? 'transparent' : 'rgba(239, 68, 68, 0.25)'),
                                            padding: '10px',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '12.5px',
                                            cursor: requestsDownloaded ? 'pointer' : 'not-allowed',
                                            opacity: isClearingRequests ? 0.7 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        {isClearingRequests ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />} 2. حذف نهائي
                                    </button>
                                </div>
                                {!requestsDownloaded && (
                                    <span style={{ fontSize: '11px', color: 'var(--accent-orange)', fontWeight: 700 }}>
                                        * يجب تصدير الطلبات التاريخية وتنزيلها أولاً لتفعيل خيار الحذف الآمن.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Link sharing dashboard */}
                    <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)' }}>
                            🔗 روابط البوابات والأقسام الرسمية للمشاركة
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', margin: '0 0 20px' }}>
                            انسخ وشارك روابط تسجيل الدخول المباشرة لأي قسم مع المدراء، الشركات، الفروع، أو السائقين بنقرة واحدة:
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                            {/* B2B Companies */}
                            <div style={{ padding: '16px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    💼 بوابة الشركات والمؤسسات (B2B)
                                </h4>
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={`${window.location.origin}/login?type=company`} 
                                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'monospace', width: '100%', outline: 'none' }}
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/login?type=company`);
                                        toast.success("تم نسخ رابط بوابة الشركات! 💼");
                                    }}
                                    style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    نسخ الرابط
                                </button>
                            </div>

                            {/* Branches */}
                            <div style={{ padding: '16px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🛠️ بوابة مسؤولي الفروع والورش
                                </h4>
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={`${window.location.origin}/login?type=branch`} 
                                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'monospace', width: '100%', outline: 'none' }}
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/login?type=branch`);
                                        toast.success("تم نسخ رابط بوابة الفروع! 🛠️");
                                    }}
                                    style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    نسخ الرابط
                                </button>
                            </div>

                            {/* Drivers / Workers */}
                            <div style={{ padding: '16px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    📍 رابط السائقين والعمال (الخريطة)
                                </h4>
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={`${window.location.origin}/`} 
                                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'monospace', width: '100%', outline: 'none' }}
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/`);
                                        toast.success("تم نسخ رابط الخريطة العامة! 📍");
                                    }}
                                    style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    نسخ الرابط
                                </button>
                            </div>

                            {/* Admin */}
                            <div style={{ padding: '16px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    ⚙️ رابط لوحة الإدارة والتحكم (Admin)
                                </h4>
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={`${window.location.origin}/login?type=admin`} 
                                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'monospace', width: '100%', outline: 'none' }}
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/login?type=admin`);
                                        toast.success("تم نسخ رابط لوحة الإدارة! ⚙️");
                                    }}
                                    style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    نسخ الرابط
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isFormOpen && <BranchForm branch={editingBranch} onSave={handleSaveBranch} onClose={() => { setIsFormOpen(false); setEditingBranch(undefined); }} categories={categories} />}

            {/* Manage Hidden Branches Modal */}
            {managingHiddenBranchCompany && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    padding: '16px'
                }}>
                    <div className="glass animate-scale-up" style={{
                        background: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '480px',
                        padding: '24px',
                        position: 'relative',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        direction: 'rtl'
                    }}>
                        <button 
                            onClick={() => setManagingHiddenBranchCompany(null)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            <CloseIcon size={18} />
                        </button>

                        <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>🚫 إخفاء الفروع عن الشركة</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '14.5px', color: 'var(--text-secondary)' }}>
                            حدد الفروع التي ترغب في **إخفائها** عن شركة <strong style={{ color: 'var(--primary-color)' }}>{managingHiddenBranchCompany.name}</strong> وسائقيها. الفروع المحددة لن تظهر لهم مطلقاً.
                        </p>

                        <div style={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            padding: '10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            background: 'rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            marginBottom: '24px',
                            scrollbarWidth: 'thin',
                            textAlign: 'right'
                        }}>
                            {branches.map(b => {
                                const isHidden = tempHiddenBranchIds.includes(b.id);
                                return (
                                    <label 
                                        key={b.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            background: isHidden ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-color)',
                                            border: '1.5px solid ' + (isHidden ? 'var(--error)' : 'var(--border-color)'),
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <input 
                                            type="checkbox"
                                            checked={isHidden}
                                            onChange={() => {
                                                if (isHidden) {
                                                    setTempHiddenBranchIds(tempHiddenBranchIds.filter(id => id !== b.id));
                                                } else {
                                                    setTempHiddenBranchIds([...tempHiddenBranchIds, b.id]);
                                                }
                                            }}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: '14px', color: isHidden ? 'var(--error)' : 'var(--text-primary)' }}>{b.name}</span>
                                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>{b.address}</span>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleSaveHiddenBranches}
                                style={{
                                    flex: 1,
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                                }}
                            >
                                حفظ الإعدادات 💾
                            </button>
                            <button
                                onClick={() => setManagingHiddenBranchCompany(null)}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
