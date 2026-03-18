import React, { useState, useEffect } from 'react';
import { 
    addBranch, 
    updateBranch, 
    deleteBranch, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    subscribeToBranches, 
    subscribeToCategories 
} from '../services/storage';
import type { Branch, Category } from '../types';
import BranchForm from '../components/BranchForm';
import { Plus, Edit2, Trash2, Loader2, Search, Check, X as CloseIcon, Database, AlertCircle, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | undefined>(undefined);
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [activeTab, setActiveTab] = useState<'branches' | 'categories'>('branches');
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [categoryEditName, setCategoryEditName] = useState('');
    const [lang, setLang] = useState<'ar' | 'en'>(() => (localStorage.getItem('lang') as 'ar' | 'en') || 'ar');

    useEffect(() => {
        const checkLang = setInterval(() => {
            const currentLang = (localStorage.getItem('lang') as 'ar' | 'en') || 'ar';
            if (currentLang !== lang) setLang(currentLang);
        }, 500);
        return () => clearInterval(checkLang);
    }, [lang]);

    const BATCH_DATA = [
      { city: "جيزان", address: "حي الزهور", name: "السيارة الجديدة دنلوب", manager: "علي الكندي", phone: "0555414922", url: "https://maps.app.goo.gl/hHxnKgeDKx9VYKpc9?g_st=aw", lat: 16.8892, lng: 42.5511 },
      { city: "جيزان", address: "حي الرحاب", name: "السيارة الجديدة جودير", manager: "علي الكندي", phone: "0555414922", url: "https://maps.app.goo.gl/UxE58bxPUEqdCCUG8", lat: 16.8892, lng: 42.5511 },
      { city: "نجران", address: "طريق الملك عبدالعزيز", name: "لنا المستقبل", manager: "طالب اسد", phone: "0556910753", url: "https://maps.app.goo.gl/bE9ZZVBzXYwCb1Zw7", lat: 17.4933, lng: 44.1322 },
      { city: "وادي الدواسر", address: "السليل - حي النخيل", name: "مركز الريان", manager: "نواف العصري", phone: "0552927686", url: "https://maps.app.goo.gl/mvxvYNJvkbTrrcN87?g_st=iw", lat: 20.4503, lng: 44.7570 },
      { city: "محايل عسير", address: "حي الشرف", name: "جوهره الفرسان", manager: "نصر صالح", phone: "0502620560", url: "https://maps.app.goo.gl/1xGyya7ufy3F4ged9?g_st=aw", lat: 18.5529, lng: 41.9161 },
      { city: "خميس مشيط", address: "المنطقة الصناعية", name: "بوابة البوم", manager: "سليم اليافعي", phone: "0556594688", url: "https://maps.app.goo.gl/j9XQmkF9Bkd8k4yb7", lat: 18.3000, lng: 42.7333 },
      { city: "خميس مشيط", address: "حي العزيزية", name: "مركز السرحان", manager: "سليم اليافعي", phone: "0556594688", url: "https://maps.app.goo.gl/dEokc3KMt3ougtB8", lat: 18.3000, lng: 42.7333 },
      { city: "خميس مشيط", address: "طريق المدينة العسكرية", name: "بتشر صوان احد", manager: "سليم اليافعي", phone: "0556594688", url: "https://maps.app.goo.gl/aH5FosPWMVjNMR3c9", lat: 18.3000, lng: 42.7333 },
      { city: "ابهاء", address: "حي المحالة", name: "مركز الافق", manager: "سليم اليافعي", phone: "0556594688", url: "https://maps.app.goo.gl/emKbLX9SwrBQtVxd9", lat: 18.2172, lng: 42.5053 },
      { city: "ابهاء", address: "حي المحالة", name: "السوائل الذهبية", manager: "نواف العصري", phone: "0552927686", url: "https://maps.app.goo.gl/yueCzWu6wpMDUqcp9", lat: 18.2172, lng: 42.5053 },
      { city: "الطائف", address: "حي الحوية", name: "بتشر المعاصف", manager: "حسن احمد", phone: "0537381773", url: "https://maps.app.goo.gl/QFGzKfodAF7xtW2p9", lat: 21.2833, lng: 40.4167 },
      { city: "مكة", address: "صناعية الدواسر الجديدة", name: "مركز القوة والاداء", manager: "محمد طالب", phone: "0506156452", url: "https://maps.app.goo.gl/eavqJefqc8jESBz78", lat: 21.3891, lng: 39.8579 },
      { city: "مكة", address: "حي النورية", name: "مركز الخليج", manager: "محمد العزاني", phone: "0532453060", url: "https://maps.app.goo.gl/GEV77iomWg9xm9dm29", lat: 21.3891, lng: 39.8579 },
      { city: "جده", address: "الفحص الدوري", name: "مركز القمة", manager: "علي محمد", phone: "0556635490", url: "https://maps.app.goo.gl/R62RSfngZtxSEAca7", lat: 21.2854, lng: 39.2376 },
      { city: "جده", address: "كيلو 3 فرع 1", name: "بوابة الحل", manager: "حسين الطويل", phone: "0509738825", url: "https://maps.app.goo.gl/LVANcQcgHHhN45zp8", lat: 21.2854, lng: 39.2376 },
      { city: "جده", address: "كيلو 3 فرع 2", name: "شركة رواد", manager: "جلال الحدي", phone: "0531930003", url: "https://maps.app.goo.gl/a7ZK8wSqkvkw2Vy6", lat: 21.2854, lng: 39.2376 },
      { city: "جده", address: "السعدية", name: "اطلس الافضل", manager: "اسامة محمد", phone: "0566537297", url: "https://maps.app.goo.gl/GUoZvSCK3LZm1SGo9", lat: 21.2854, lng: 39.2376 },
      { city: "المدينة", address: "الامير سلطان - حي بني بياضة", name: "جوردن تاير", manager: "معتوق وهيب", phone: "0509498196", url: "https://maps.app.goo.gl/33eAK6PrwGuwiIqf8", lat: 24.4686, lng: 39.6108 },
      { city: "المدينة", address: "حي العريض", name: "الاطار الذهبي", manager: "معتوق وهيب", phone: "0509498196", url: "https://maps.app.goo.gl/yXukd TwwCDcXbSAU6?g_st=aw", lat: 24.4686, lng: 39.6108 },
      { city: "ينبع", address: "حي الصواري", name: "بتشر التوفيق", manager: "توفيق ابو مشارب", phone: "0575031302", url: "https://maps.app.goo.gl/ohWXTPcl1O13keZb9", lat: 24.0891, lng: 38.0637 },
      { city: "القصيم", address: "بريدة", name: "نورة البارحي", manager: "عبداللطيف اليافعي", phone: "0559796582", url: "https://maps.app.goo.gl/NqQZUs3s8yg8QSNk8?g_st=aw", lat: 26.3260, lng: 43.9750 },
      { city: "القصيم", address: "عنيزة", name: "المربع الذهبي", manager: "نسيم حسين", phone: "0554293395", url: "https://maps.app.goo.gl/nRLLIF8k9HcBzhVIA", lat: 26.0853, lng: 43.9911 },
      { city: "الرياض", address: "الحمراء", name: "مركز كنوز الحمراء", manager: "عبدالله صالح الكيالي", phone: "0556863716", url: "https://maps.app.goo.gl/fWfY1U353CAjhVLA6", lat: 24.7136, lng: 46.6753 },
      { city: "الرياض", address: "الدار الشمالي", name: "الاطار العالمي", manager: "ناجي اليافعي", phone: "0533936324", url: "https://maps.app.goo.gl/BHx4Phnolwa71rRt5", lat: 24.7136, lng: 46.6753 },
      { city: "الرياض", address: "حوطة بني تميم", name: "مركز النهضة", manager: "ابو اشرف", phone: "0500113125", url: "https://maps.app.goo.gl/E6CfmqjqGMyavNTM6?g_st=aw", lat: 23.5186, lng: 46.8406 },
      { city: "الرياض", address: "حي طويق", name: "اويل ستوب", manager: "ابو اشرف", phone: "0500113125", url: "https://maps.app.goo.gl/yRr6sJ3VLx1DSoJy7", lat: 24.7136, lng: 46.6753 },
      { city: "الرياض", address: "وادي لبن", name: "اويل ستوب", manager: "ابو اشرف", phone: "0500113125", url: "https://goo.gl/maps/7ZZyJwgigRnH6NbPA?g_st=aw", lat: 24.7136, lng: 46.6753 },
      { city: "حفر الباطن", address: "طريق الملك خالد", name: "عجلت الطريق", manager: "احمد عبادي", phone: "0504330862", url: "https://maps.app.goo.gl/GdRUHEKqDCru5HvS9", lat: 28.4328, lng: 45.9708 },
      { city: "حفر الباطن", address: "حي السروج", name: "عجلت الطريق", manager: "احمد عبادي", phone: "0504330862", url: "https://maps.app.goo.gl/rVTB6ny5KYnW74NF7", lat: 28.4328, lng: 45.9708 },
      { city: "رفحاء", address: "الصناعية", name: "عجلت الطريق", manager: "احمد عبادي", phone: "0504330862", url: "https://maps.app.goo.gl/1GX818yVV8dhwJqt9", lat: 29.6236, lng: 43.5111 },
      { city: "تبوك", address: "شارع الثلاثين", name: "مركز قمة الثلاثين", manager: "حسن اليافعي", phone: "0539208051", url: "https://maps.app.goo.gl/vaxQZzuc86JhghjP7?g_st=aw", lat: 28.3835, lng: 36.5662 },
      { city: "عرعر", address: "طريق الملك فهد", name: "كيان الخليج", manager: "محمود الحيدري", phone: "0509983050", url: "https://maps.app.goo.gl/4gSTu88qxefPav5J9", lat: 30.9753, lng: 41.0381 },
      { city: "سكاكا", address: "الصناعية الثانية", name: "كيان الخليج", manager: "محمود الحيدري", phone: "0509983050", url: "https://maps.app.goo.gl/8SCVT1KB43UaAgGM6", lat: 29.9697, lng: 40.2064 },
      { city: "الخرج", address: "الصناعية الجديدة", name: "الاسطورة للاطارات", manager: "ابو صابر", phone: "0550014742", url: "https://maps.app.goo.gl/GlnKJobECth4usD6", lat: 24.1500, lng: 47.3000 },
      { city: "القنفذه", address: "طريق ابراهيم الخليل", name: "مركز الحازم", manager: "عبداللطيف اليافعي", phone: "0509332236", url: "https://maps.app.goo.gl/emmFeCs8zme6sarr9", lat: 19.1264, lng: 41.0789 },
      { city: "الليث", address: "محطة وقود - ريدان", name: "شركة خدمات القمة", manager: "منيف قاسم", phone: "0536687796", url: "https://maps.app.goo.gl/wSCsHSnkwd dC2w8Y9", lat: 20.1500, lng: 40.2667 },
      { city: "القريات", address: "طريق الملك فيصل - حي الهجره", name: "مركز النور غير", manager: "ابراهيم", phone: "0533696000", url: "https://maps.app.goo.gl/f4VpukrPxpJWUDXH6", lat: 31.3323, lng: 37.3421 },
      { city: "املج", address: "طريق الملك فيصل - بعد محطة الخليج", name: "مركز العاطفي", manager: "حسين المطيري", phone: "0506422403", url: "https://maps.app.goo.gl/fRzM2ftE948gjVnZ9", lat: 25.0298, lng: 37.2647 },
      { city: "رجال المع", address: "طريق الملك عبدالعزيز - حي الجرف", name: "السوائل الذهبية", manager: "نواف العصري", phone: "0552927686", url: "https://maps.app.goo.gl/vJhi4d9KZANXZH12A?g_st=iw", lat: 18.2619, lng: 42.1794 },
      { city: "بيشة", address: "حي النخيل", name: "هاب واو", manager: "عادل اليافعي", phone: "0540677357", url: "https://maps.app.goo.gl/a2VepYvPLCnqQbTLB7?g_st=iwb", lat: 19.9847, lng: 42.6042 },
      { city: "صبياء", address: "طريق الملك عبدالعزيز", name: "شركة الاسطورة الشامل", manager: "عمر", phone: "0534981157", url: "https://maps.app.goo.gl/dyXyAKxB599njHEWA", lat: 17.1481, lng: 42.6256 }
    ];

    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const unsubBranches = subscribeToBranches((data) => {
            setBranches(data);
            setIsLoading(false);
        });
        const unsubCats = subscribeToCategories(setCategories);
        return () => {
             unsubBranches();
             unsubCats();
        };
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
            await addCategory(name);
            setNewCategoryName('');
            toast.success('تم إضافة القسم بنجاح');
        } catch (error: any) {
            toast.error('حدث خطأ أثناء إضافة القسم');
        } finally {
            setIsAddingCategory(false);
        }
    };

    const handleUpdateCategory = async (id: string) => {
        try {
            await updateCategory({ id, name: categoryEditName });
            setEditingCategoryId(null);
            toast.success('تم تحديث القسم');
        } catch (error: any) {
            toast.error('فشل التحديث');
        }
    };

    const handleBatchImport = async () => {
        if (!window.confirm(`هل أنت متأكد من استيراد ${BATCH_DATA.length} فرعاً؟`)) return;
        setIsImporting(true);
        const catsToLink = ["غيار زيت", "كفرات", "بطاريات", "صيانة خفيفة"];
        
        try {
            // 1. Ensure categories exist
            for (const catName of catsToLink) {
                if (!categories.some(c => c.name === catName)) {
                    await addCategory(catName);
                }
            }
            
            // 2. Add branches
            for (const item of BATCH_DATA) {
                const branch: Omit<Branch, 'id'> = {
                    name: item.name,
                    address: `${item.city} - ${item.address}`,
                    latitude: item.lat,
                    longitude: item.lng,
                    phone: item.phone,
                    managerName: item.manager,
                    mapUrl: item.url,
                    categories: catsToLink,
                    status: 'مفتوح',
                    workingHours: { start: '08:00', end: '22:00' }
                };
                await addBranch(branch);
            }
            toast.success('تم استيراد كافة الفروع بنجاح! 🎉');
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء الاستيراد');
        } finally {
            setIsImporting(false);
        }
    };

    const handleExportCSV = () => {
        const headers = ["Name", "Address", "Phone", "Status", "Manager", "Categories"];
        const rows = branches.map(b => [
            b.name,
            b.address,
            b.phone,
            b.status,
            b.managerName || "",
            b.categories?.join(" | ") || ""
        ]);
        
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `branches_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(lang === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully');
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

    const getBranchCountByCategory = (catName: string) => branches.filter(b => b.categories?.includes(catName)).length;

    return (
        <div className="admin-container">
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
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
            </div>

            {activeTab === 'branches' ? (
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
                                onClick={handleBatchImport} 
                                disabled={isImporting} 
                                style={{ 
                                    background: 'var(--accent-orange)', 
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
                                {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />} 
                                <span className="mobile-hide">استيراد البيانات</span>
                                {!isImporting && <span style={{ display: 'block' }} className="desktop-hide">استيراد</span>}
                            </button>
                            <button 
                                onClick={handleExportCSV} 
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
                                <span className="mobile-hide">{lang === 'ar' ? 'تصدير' : 'Export'}</span>
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
                                <Database size={24} color="var(--primary-color)" />
                            </div>
                        </div>
                        <div className="glass admin-stats-card hover-scale tap-effect">
                            <div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>مفتوح الآن</p>
                                <strong style={{ fontSize: '1.5rem', color: 'var(--success)' }}>{openBranchesCount}</strong>
                            </div>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                <Check size={24} color="var(--success)" />
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
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.name}</div>
                                                <div style={{ display: 'block' }} className="desktop-hide">
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.address}</span>
                                                </div>
                                            </td>
                                            <td className="mobile-hide" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '250px' }}>{b.address}</td>
                                            <td>
                                                <span style={{ 
                                                    padding: '4px 10px', 
                                                    borderRadius: '8px', 
                                                    background: b.status === 'مفتوح' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                                    color: b.status === 'مفتوح' ? 'var(--success)' : 'var(--error)', 
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
            ) : (
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                        <input 
                            type="text" 
                            value={newCategoryName} 
                            onChange={(e) => setNewCategoryName(e.target.value)} 
                            placeholder="اسم القسم الجديد (مثلاً: كفرات)" 
                            style={{ flex: 1, minWidth: '200px', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }} 
                        />
                        <button 
                            onClick={handleAddCategory} 
                            disabled={isAddingCategory} 
                            style={{ background: 'var(--success)', color: 'white', padding: '0 2rem', height: '48px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', minWidth: '100px' }}
                        >
                            {isAddingCategory ? <Loader2 className="animate-spin" size={20} /> : 'إضافة'}
                        </button>
                    </div>
                    
                    <div className="responsive-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>اسم القسم</th>
                                    <th>عدد الفروع</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.length === 0 ? (
                                    <tr className="animate-fade-in">
                                        <td colSpan={3} style={{ textAlign: 'center', padding: '3rem' }}>
                                            <div className="empty-state-container" style={{ padding: 0 }}>
                                                <AlertCircle className="empty-state-icon" style={{ width: 40, height: 40 }} />
                                                <div className="empty-state-title" style={{ fontSize: '1rem' }}>
                                                    {lang === 'ar' ? 'لا توجد تصنيفات حالياً' : 'No categories yet'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : categories.map(c => (
                                    <tr key={c.id} className="animate-fade-in">
                                        <td>
                                            {editingCategoryId === c.id ? (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <input value={categoryEditName} onChange={e => setCategoryEditName(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--primary-color)', outline: 'none' }} />
                                                    <button onClick={() => handleUpdateCategory(c.id)} style={{ border: 'none', background: 'var(--success)', color: 'white', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><Check size={16} /></button>
                                                    <button onClick={() => setEditingCategoryId(null)} style={{ border: 'none', background: 'var(--error)', color: 'white', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><CloseIcon size={16} /></button>
                                                </div>
                                            ) : (
                                                <div style={{ fontWeight: 600 }}>{c.name}</div>
                                            )}
                                        </td>
                                        <td>
                                            <span style={{ background: 'var(--bg-color)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                                                {getBranchCountByCategory(c.name)} فرع
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => { setEditingCategoryId(c.id); setCategoryEditName(c.name); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '4px' }}><Edit2 size={18} /></button>
                                                <button onClick={() => handleDeleteCategory(c.id, c.name)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '4px' }}><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {categories.length === 0 && (
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                            لا توجد أقسام مضافة بعد
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {isFormOpen && <BranchForm branch={editingBranch} onSave={handleSaveBranch} onClose={() => { setIsFormOpen(false); setEditingBranch(undefined); }} categories={categories} />}
        </div>
    );
};

export default AdminDashboard;
