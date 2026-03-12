import React, { useState, useEffect } from 'react';
import { getBranches, addBranch, updateBranch, deleteBranch, getActiveNavigatorsCount, getCategories, addCategory, deleteCategory } from '../services/storage';
import type { Branch, Category } from '../types';
import BranchForm from '../components/BranchForm';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [navigatorsCount, setNavigatorsCount] = useState<Record<string, number>>({});
    
    // Category management state
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        loadBranches();
        // Set up polling to refresh active navigators every minute
        const interval = setInterval(loadBranches, 60000);
        return () => clearInterval(interval);
    }, []);

    const loadBranches = async () => {
        const [data, cats] = await Promise.all([
            getBranches(),
            getCategories()
        ]);
        setBranches(data);
        setCategories(cats);

        const counts: Record<string, number> = {};
        for (const b of data) {
            counts[b.id] = await getActiveNavigatorsCount(b.id);
        }
        setNavigatorsCount(counts);
    }

    const handleSaveBranch = async (branchData: Omit<Branch, 'id'> | Branch) => {
        try {
            if ('id' in branchData) {
                await updateBranch(branchData as Branch);
                toast.success('تم تعديل الفرع بنجاح');
            } else {
                await addBranch(branchData);
                toast.success('تم إضافة الفرع بنجاح');
            }
            await loadBranches();
            setIsFormOpen(false);
            setEditingBranch(undefined);
        } catch (error) {
            toast.error('حدث خطأ أثناء حفظ الفرع');
        }
    };

    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
            try {
                await deleteBranch(id);
                toast.success('تم حذف الفرع بنجاح');
                await loadBranches();
            } catch (error) {
                toast.error('حدث خطأ أثناء الحذف');
            }
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            await addCategory(newCategoryName.trim());
            toast.success('تم إضافة التصنيف بنجاح');
            setNewCategoryName('');
            await loadBranches();
        } catch (error) {
            toast.error('حدث خطأ أثناء إضافة التصنيف');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
            try {
                await deleteCategory(id);
                toast.success('تم حذف التصنيف بنجاح');
                await loadBranches();
            } catch (error) {
                toast.error('حدث خطأ أثناء حذف التصنيف');
            }
        }
    };

    const openNewForm = () => {
        setEditingBranch(undefined);
        setIsFormOpen(true);
    };

    const totalBranches = branches.length;
    const openBranches = branches.filter(b => b.status === 'مفتوح').length;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>لوحة إدارة الفروع</h1>
                <button
                    onClick={openNewForm}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'var(--primary-color)', color: 'white',
                        padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)',
                        border: 'none', fontWeight: 700
                    }}
                >
                    <Plus size={20} /> إضافة فرع جديد
                </button>
            </div>

            <div className="glass" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px' }}>
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو رقم الهاتف..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                    />
                </div>
                <div style={{ flex: '0 0 auto', minWidth: '200px' }}>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                    >
                        <option value="all">جميع التصنيفات</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)' }}>إجمالي الفروع</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{totalBranches}</p>
                </div>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)' }}>الفروع المفتوحة حالياً</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--success)' }}>{openBranches}</p>
                </div>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)' }}>الفروع المغلقة</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--error)' }}>{totalBranches - openBranches}</p>
                </div>
            </div>

            <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                                <th style={{ padding: '1rem' }}>الاسم</th>
                                <th style={{ padding: '1rem' }}>التصنيف</th>
                                <th style={{ padding: '1rem' }}>الحالة</th>
                                <th style={{ padding: '1rem' }}>في الطريق 🧭</th>
                                <th style={{ padding: '1rem' }}>أوقات العمل</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branches
                                .filter(branch => {
                                    const matchesSearch = branch.name.includes(searchQuery) || branch.phone.includes(searchQuery);
                                    const matchesCategory = categoryFilter === 'all' || branch.category === categoryFilter;
                                    return matchesSearch && matchesCategory;
                                })
                                .map(branch => (
                                    <tr key={branch.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{branch.name}</td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{branch.category}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600,
                                                background: branch.status === 'مفتوح' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: branch.status === 'مفتوح' ? 'var(--success)' : 'var(--error)'
                                            }}>
                                                {branch.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                            {navigatorsCount[branch.id] > 0 ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    {navigatorsCount[branch.id]} سيارة
                                                    <span style={{ width: '8px', height: '8px', background: 'var(--warning)', borderRadius: '50%', display: 'inline-block', animation: 'pulseRed 2s infinite' }}></span>
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>0</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{branch.workingHours.start} - {branch.workingHours.end}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <button onClick={() => handleEdit(branch)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', marginRight: '10px' }} title="تعديل">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(branch.id)} style={{ background: 'none', border: 'none', color: 'var(--error)' }} title="حذف">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            {branches.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        لا توجد فروع مضافة حالياً.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isFormOpen && (
                <BranchForm
                    branch={editingBranch}
                    onSave={handleSaveBranch}
                    onClose={() => setIsFormOpen(false)}
                    categories={categories}
                />
            )}

            <div className="glass" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                <h2 style={{ margin: '0 0 1rem 0' }}>إدارة التصنيفات</h2>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <input
                        type="text"
                        placeholder="اسم التصنيف الجديد..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                    />
                    <button
                        onClick={handleAddCategory}
                        style={{
                            background: 'var(--success)', color: 'white', padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <Plus size={18} /> إضافة
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                    {categories.map(cat => (
                        <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontWeight: 500 }}>{cat.name}</span>
                            <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: 'none', border: 'none', color: 'var(--error)' }} title="حذف">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
