import React, { useState, useEffect } from 'react';
import { getBranches, addBranch, updateBranch, deleteBranch, getActiveNavigatorsCount, getCategories, addCategory, deleteCategory, seedDatabaseIfNeeded } from '../services/storage';
import { testFirebaseConnection } from '../services/firebase';
import type { Branch, Category } from '../types';
import BranchForm from '../components/BranchForm';
import { Plus, Edit2, Trash2, ExternalLink, LayoutDashboard, CheckCircle2, AlertCircle, WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [navigatorsCount, setNavigatorsCount] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Category management state
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    // Firebase diagnostic state
    const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'ok' | 'error'>('checking');
    const [firebaseError, setFirebaseError] = useState<string | null>(null);

    useEffect(() => {
        initializeDashboard();
    }, []);

    const initializeDashboard = async () => {
        setIsLoading(true);
        setFirebaseStatus('checking');

        try {
            // Step 1: Test Firebase connection (with 5s timeout)
            const result = await Promise.race([
                testFirebaseConnection(),
                new Promise<{ canRead: boolean; canWrite: boolean; error: string }>(
                    resolve => setTimeout(() => resolve({ canRead: false, canWrite: false, error: 'TIMEOUT' }), 5000)
                )
            ]);

            if (result.canWrite && result.canRead) {
                setFirebaseStatus('ok');
                setFirebaseError(null);

                // Step 2: Seed database if empty (controlled, not auto)
                await seedDatabaseIfNeeded();

                // Step 3: Load data
                await loadData();
            } else {
                setFirebaseStatus('error');
                if (result.error === 'TIMEOUT') {
                    setFirebaseError('انتهت مهلة الاتصال بـ Firebase. تحقق من أن Firestore Database مُنشأة ومن إعدادات القواعد.');
                } else if (result.error === 'PERMISSION_DENIED') {
                    setFirebaseError('صلاحيات Firestore مغلقة. يجب فتح قواعد الحماية (Security Rules) من لوحة تحكم Firebase.');
                } else if (result.error === 'FIRESTORE_NOT_CREATED') {
                    setFirebaseError('لم يتم إنشاء قاعدة بيانات Firestore بعد. قم بإنشائها من لوحة تحكم Firebase أولاً.');
                } else {
                    setFirebaseError(`خطأ في الاتصال: ${result.error}`);
                }
                // Still try to load what we can
                try { await loadData(); } catch { /* ok */ }
            }
        } catch (err) {
            console.error("Dashboard init error:", err);
            setFirebaseStatus('error');
            setFirebaseError('حدث خطأ غير متوقع. حاول إعادة تحميل الصفحة.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadData = async () => {
        try {
            // Load branches and categories in parallel
            const [data, cats] = await Promise.all([
                getBranches(),
                getCategories()
            ]);
            setBranches(data);
            setCategories(cats);

            // Load navigator counts in background (don't block UI)
            if (data.length > 0) {
                loadNavigatorCounts(data);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        }
    };

    // Load navigator counts WITHOUT blocking the UI
    const loadNavigatorCounts = async (branchList: Branch[]) => {
        const counts: Record<string, number> = {};
        for (const b of branchList) {
            try {
                counts[b.id] = await getActiveNavigatorsCount(b.id);
            } catch {
                counts[b.id] = 0;
            }
        }
        setNavigatorsCount(counts);
    };

    const handleSaveBranch = async (branchData: Omit<Branch, 'id'> | Branch) => {
        try {
            if ('id' in branchData) {
                await updateBranch(branchData as Branch);
                toast.success('تم تعديل الفرع بنجاح ✅');
            } else {
                await addBranch(branchData);
                toast.success('تم إضافة الفرع بنجاح ✅');
            }
            await loadData();
            setIsFormOpen(false);
            setEditingBranch(undefined);
        } catch (error: any) {
            console.error("Save branch error:", error);
            const msg = error?.code?.includes('permission-denied')
                ? 'خطأ: صلاحيات Firebase مغلقة. افتح Security Rules.'
                : 'حدث خطأ أثناء حفظ الفرع. تحقق من اتصال الإنترنت.';
            toast.error(msg);
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
                await loadData();
            } catch (error: any) {
                toast.error(error?.code?.includes('permission-denied') ? 'خطأ: صلاحيات Firebase مغلقة.' : 'حدث خطأ أثناء الحذف');
            }
        }
    };

    const handleAddCategory = async () => {
        const name = newCategoryName.trim();
        if (!name) {
            toast.error('يرجى كتابة اسم التصنيف أولاً');
            return;
        }
        if (categories.some(c => c.name === name)) {
            toast.error('هذا التصنيف موجود بالفعل');
            return;
        }

        setIsAddingCategory(true);
        const tempId = `temp-${Date.now()}`;
        const prevCategories = [...categories];
        setCategories(prev => [...prev, { id: tempId, name }]);
        setNewCategoryName('');

        try {
            await addCategory(name);
            toast.success(`تم إضافة التصنيف "${name}" بنجاح ✅`);
            // Refresh categories only (fast operation)
            const freshCats = await getCategories();
            setCategories(freshCats);
        } catch (error: any) {
            console.error("Failed to add category:", error);
            setCategories(prevCategories);
            setNewCategoryName(name);
            toast.error(error?.code?.includes('permission-denied')
                ? 'خطأ: صلاحيات Firebase مغلقة. يجب فتح Security Rules.'
                : 'فشل في إضافة التصنيف. تحقق من الاتصال بالإنترنت.');
        } finally {
            setIsAddingCategory(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
            const prev = [...categories];
            setCategories(c => c.filter(x => x.id !== id));
            try {
                await deleteCategory(id);
                toast.success('تم حذف التصنيف بنجاح');
            } catch (error: any) {
                setCategories(prev);
                toast.error(error?.code?.includes('permission-denied') ? 'خطأ: صلاحيات Firebase مغلقة.' : 'حدث خطأ أثناء حذف التصنيف');
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

            {/* Firebase Diagnostic Banner */}
            {firebaseStatus === 'checking' && (
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
                    padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary-color)'
                }}>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontWeight: 600 }}>جاري فحص اتصال Firebase...</span>
                </div>
            )}

            {firebaseStatus === 'error' && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <WifiOff size={22} color="var(--error)" />
                        <span style={{ fontWeight: 700, color: 'var(--error)', fontSize: '1.05rem' }}>⚠️ مشكلة في الاتصال بقاعدة البيانات</span>
                    </div>
                    <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        {firebaseError}
                    </p>
                    <div style={{ background: 'rgba(0,0,0,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.8 }}>
                        <strong>خطوات الحل:</strong><br />
                        1. اذهب إلى <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>Firebase Console</a><br />
                        2. اختر مشروع <strong>slman-zmam</strong><br />
                        3. من القائمة اختر <strong>Firestore Database</strong><br />
                        4. إذا لم تكن موجودة → <strong>Create Database</strong> → اختر <strong>Start in test mode</strong><br />
                        5. إذا كانت موجودة → تبويب <strong>Rules</strong> → غيّر إلى:
                        <pre style={{ background: 'rgba(0,0,0,0.05)', padding: '0.5rem', borderRadius: '6px', marginTop: '0.5rem', direction: 'ltr', textAlign: 'left', fontSize: '0.85rem' }}>
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                        </pre>
                        6. اضغط <strong>Publish</strong>
                    </div>
                    <button
                        onClick={initializeDashboard}
                        style={{
                            background: 'var(--primary-color)', color: 'white', border: 'none',
                            padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <RefreshCw size={16} /> إعادة فحص الاتصال
                    </button>
                </div>
            )}

            {firebaseStatus === 'ok' && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)'
                }}>
                    <CheckCircle2 size={20} />
                    <span style={{ fontWeight: 600 }}>متصل بقاعدة البيانات بنجاح ✅</span>
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>لوحة إدارة الفروع</h1>
                <button
                    onClick={openNewForm}
                    disabled={firebaseStatus !== 'ok'}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: firebaseStatus !== 'ok' ? '#9ca3af' : 'var(--primary-color)', color: 'white',
                        padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)',
                        border: 'none', fontWeight: 700,
                        cursor: firebaseStatus !== 'ok' ? 'not-allowed' : 'pointer'
                    }}
                >
                    <Plus size={20} /> إضافة فرع جديد
                </button>
            </div>

            {/* Search & Filter */}
            <div className="glass" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px' }}>
                    <input type="text" placeholder="ابحث بالاسم أو رقم الهاتف..."
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                    />
                </div>
                <div style={{ flex: '0 0 auto', minWidth: '200px' }}>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                        <option value="all">جميع التصنيفات</option>
                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>إجمالي الفروع</h3>
                            <p style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--primary-color)' }}>{totalBranches}</p>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: 'var(--radius-md)', color: 'var(--primary-color)' }}>
                            <LayoutDashboard size={28} />
                        </div>
                    </div>
                </div>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>الفروع المفتوحة</h3>
                            <p style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--success)' }}>{openBranches}</p>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
                            <CheckCircle2 size={28} />
                        </div>
                    </div>
                </div>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>الفروع المغلقة</h3>
                            <p style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--error)' }}>{totalBranches - openBranches}</p>
                        </div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: 'var(--radius-md)', color: 'var(--error)' }}>
                            <AlertCircle size={28} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                    <p>جاري تحميل البيانات...</p>
                </div>
            )}

            {/* Branches Table */}
            {!isLoading && (
                <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(59, 130, 246, 0.05)' }}>
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
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 600 }}>{branch.name}</div>
                                                {branch.mapUrl && (
                                                    <a href={branch.mapUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', marginTop: '4px' }}>
                                                        <ExternalLink size={12} /> مشاهدة الموقع
                                                    </a>
                                                )}
                                            </td>
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
                                                {(navigatorsCount[branch.id] || 0) > 0 ? (
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
                                                <button onClick={() => handleEdit(branch)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', marginRight: '10px', cursor: 'pointer' }} title="تعديل">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(branch.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }} title="حذف">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                {branches.length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            {firebaseStatus === 'error' ? 'لا يمكن تحميل البيانات. تحقق من إعدادات Firebase أعلاه.' : 'لا توجد فروع مضافة حالياً. اضغط "إضافة فرع جديد" للبدء.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Branch Form Modal */}
            {isFormOpen && (
                <BranchForm
                    branch={editingBranch}
                    onSave={handleSaveBranch}
                    onClose={() => setIsFormOpen(false)}
                    categories={categories}
                />
            )}

            {/* Category Management */}
            <div className="glass" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                <h2 style={{ margin: '0 0 1rem 0' }}>إدارة التصنيفات</h2>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <input
                        type="text"
                        placeholder="اسم التصنيف الجديد..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                        disabled={firebaseStatus !== 'ok'}
                        style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                    />
                    <button
                        onClick={handleAddCategory}
                        disabled={isAddingCategory || firebaseStatus !== 'ok'}
                        style={{
                            background: (isAddingCategory || firebaseStatus !== 'ok') ? '#9ca3af' : 'var(--success)', color: 'white', padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            cursor: (isAddingCategory || firebaseStatus !== 'ok') ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {isAddingCategory ? (
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Plus size={18} />
                        )}
                        {isAddingCategory ? 'جاري الإضافة...' : 'إضافة'}
                    </button>
                </div>

                {firebaseStatus === 'error' && (
                    <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
                        ⚠️ لا يمكن إضافة تصنيفات حتى يتم إصلاح اتصال Firebase
                    </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                    {categories.map(cat => (
                        <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontWeight: 500 }}>{cat.name}</span>
                            <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }} title="حذف">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <p style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>لا توجد تصنيفات بعد</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
