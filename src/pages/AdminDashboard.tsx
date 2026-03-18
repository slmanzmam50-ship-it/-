import React, { useState, useEffect } from 'react';
import { 
    addBranch, 
    updateBranch, 
    deleteBranch, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    subscribeToBranches, 
    subscribeToCategories,
    uploadImage
} from '../services/storage';
import type { Branch, Category } from '../types';
import BranchForm from '../components/BranchForm';
import { Plus, Edit2, Trash2, Loader2, Search, Check, X as CloseIcon, AlertCircle, FileDown, Layers, Database, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { utils, writeFile } from 'xlsx';

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
    const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');
    const [newCategoryFile, setNewCategoryFile] = useState<File | null>(null);
    const [categoryEditImageUrl, setCategoryEditImageUrl] = useState('');
    const [categoryEditFile, setCategoryEditFile] = useState<File | null>(null);
    const [lang, setLang] = useState<'ar' | 'en'>(() => (localStorage.getItem('lang') as 'ar' | 'en') || 'ar');

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
                            style={{ background: 'var(--success)', color: 'white', padding: '0 2rem', height: '48px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', minWidth: '100px' }}
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
                                                <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            {isFormOpen && <BranchForm branch={editingBranch} onSave={handleSaveBranch} onClose={() => { setIsFormOpen(false); setEditingBranch(undefined); }} categories={categories} />}
        </div>
    );
};

export default AdminDashboard;
