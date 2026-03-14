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
import { Plus, Edit2, Trash2, Loader2, Search, Check, X as CloseIcon } from 'lucide-react';
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
                await addBranch(branchData);
                toast.success('تم إضافة الفرع بنجاح ✅');
            }
            setIsFormOpen(false);
            setEditingBranch(undefined);
        } catch (error: any) {
            toast.error('فشل في حفظ البيانات');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
            try {
                await deleteBranch(id);
                toast.success('تم حذف الفرع بنجاح');
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

    const handleDeleteCategory = async (id: string) => {
        const category = categories.find(c => c.id === id);
        if (!category) return;
        if (branches.some(b => b.categories?.includes(category.name))) {
            toast.error('لا يمكن حذف قسم مرتبط بفروع');
            return;
        }
        if (window.confirm('حذف القسم؟')) {
            try {
                await deleteCategory(id);
                toast.success('تم الحذف');
            } catch (error: any) {
                toast.error('فشل الحذف');
            }
        }
    };

    const getBranchCountByCategory = (catName: string) => branches.filter(b => b.categories?.includes(catName)).length;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => setActiveTab('branches')} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: activeTab === 'branches' ? 'var(--primary-color)' : '#eee', color: activeTab === 'branches' ? 'white' : 'black', cursor: 'pointer', fontWeight: 700 }}>الفروع</button>
                <button onClick={() => setActiveTab('categories')} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: activeTab === 'categories' ? 'var(--primary-color)' : '#eee', color: activeTab === 'categories' ? 'white' : 'black', cursor: 'pointer', fontWeight: 700 }}>الأقسام</button>
            </div>

            {activeTab === 'branches' ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2>الفروع ({totalBranches})</h2>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Search style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} size={16} />
                                <input type="text" placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '8px 40px 8px 12px', borderRadius: '8px', border: '1px solid #ddd' }} />
                            </div>
                            <button onClick={() => setIsFormOpen(true)} style={{ background: 'var(--primary-color)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Plus size={20} /> إضافة فرع
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="glass" style={{ padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>إجمالي الفروع</span><strong>{totalBranches}</strong>
                        </div>
                        <div className="glass" style={{ padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>مفتوح الآن</span><strong>{openBranchesCount}</strong>
                        </div>
                    </div>
                    {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div> : (
                        <div className="glass" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr><th style={{ padding: '1rem' }}>الاسم</th><th style={{ padding: '1rem' }}>الحالة</th><th style={{ padding: '1rem' }}>إجراءات</th></tr>
                                </thead>
                                <tbody>
                                    {filteredBranches.map(b => (
                                        <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '1rem' }}>{b.name}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ padding: '4px 12px', borderRadius: '20px', background: b.status === 'مفتوح' ? '#dcfce7' : '#fee2e2', color: b.status === 'مفتوح' ? '#166534' : '#991b1b' }}>{b.status}</span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <button onClick={() => { setEditingBranch(b); setIsFormOpen(true); }} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}><Edit2 size={18} /></button>
                                                <button onClick={() => handleDelete(b.id)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="اسم القسم الجديد..." style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} />
                        <button onClick={handleAddCategory} disabled={isAddingCategory} style={{ background: '#10b981', color: 'white', padding: '0 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>إضافة</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead><tr><th style={{ padding: '1rem' }}>القسم</th><th style={{ padding: '1rem' }}>الفروع</th><th style={{ padding: '1rem' }}>إجراءات</th></tr></thead>
                        <tbody>
                            {categories.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '1rem' }}>
                                        {editingCategoryId === c.id ? (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <input value={categoryEditName} onChange={e => setCategoryEditName(e.target.value)} style={{ padding: '4px' }} />
                                                <button onClick={() => handleUpdateCategory(c.id)} style={{ border: 'none', background: 'none', color: 'green', cursor: 'pointer' }}><Check size={16} /></button>
                                                <button onClick={() => setEditingCategoryId(null)} style={{ border: 'none', background: 'none', color: 'red', cursor: 'pointer' }}><CloseIcon size={16} /></button>
                                            </div>
                                        ) : c.name}
                                    </td>
                                    <td style={{ padding: '1rem' }}>{getBranchCountByCategory(c.name)}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <button onClick={() => { setEditingCategoryId(c.id); setCategoryEditName(c.name); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteCategory(c.id)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {isFormOpen && <BranchForm branch={editingBranch} onSave={handleSaveBranch} onClose={() => { setIsFormOpen(false); setEditingBranch(undefined); }} categories={categories} />}
        </div>
    );
};

export default AdminDashboard;
