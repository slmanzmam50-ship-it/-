import React, { useState, useEffect, useCallback } from 'react';
import { getBranches, addBranch, updateBranch, deleteBranch, getCategories, addCategory, updateCategory, deleteCategory, seedDatabaseIfNeeded } from '../services/storage';
import { testFirebaseConnection } from '../services/firebase';
import type { Branch, Category } from '../types';
import BranchForm from '../components/BranchForm';
import { Plus, Edit2, Trash2, LayoutDashboard, WifiOff, Loader2, Bug, Layers, Search, Check, X as CloseIcon, Eye, ArrowRight, Fuel, Wrench, Zap, CircleDashed, ShieldCheck, Car } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    // Category management state
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    // Firebase diagnostic state
    const [activeTab, setActiveTab] = useState<'branches' | 'categories'>('branches');
    const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'ok' | 'error'>('checking');
    const [firebaseError, setFirebaseError] = useState<string | null>(null);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [categoryEditName, setCategoryEditName] = useState('');
    const [viewingCategory, setViewingCategory] = useState<string | null>(null);

    const addLog = useCallback((msg: string) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 10));
        console.log(`[Admin] ${msg}`);
    }, []);

    const getCategoryIcon = (name: string) => {
        const n = name.trim();
        if (n.includes('زيت')) return <Fuel size={12} />;
        if (n.includes('ميكانيكا')) return <Wrench size={12} />;
        if (n.includes('كهرباء')) return <Zap size={12} />;
        if (n.includes('إطارات') || n.includes('اطارات')) return <CircleDashed size={12} />;
        if (n.includes('فحص')) return <ShieldCheck size={12} />;
        if (n.includes('صيانة') || n.includes('صيانه')) return <Car size={12} />;
        return <Layers size={12} />;
    };

    useEffect(() => {
        initializeDashboard();
    }, []);

    const initializeDashboard = async () => {
        addLog("Starting dashboard initialization...");
        setIsLoading(true);
        setFirebaseStatus('checking');

        try {
            // Test connection with a very short timeout
            const result = await Promise.race([
                testFirebaseConnection(),
                new Promise<{ canRead: boolean; canWrite: boolean; error: string }>(
                    resolve => setTimeout(() => resolve({ canRead: false, canWrite: false, error: 'TIMEOUT' }), 6000)
                )
            ]);

            if (result.canWrite && result.canRead) {
                addLog("Firebase Connection: OK (Read/Write)");
                setFirebaseStatus('ok');
                setFirebaseError(null);
                
                // Controlled seeding - don't await, let it happen in background
                seedDatabaseIfNeeded().then(() => addLog("Seeding check finished")).catch(e => addLog(`Seeding error: ${e.message}`));
            } else {
                addLog(`Firebase Connection: ERROR (${result.error || 'Write Restricted'})`);
                setFirebaseStatus('error');
                setFirebaseError(result.error === 'TIMEOUT' ? 'انتهت مهلة الاتصال بالخادم. تحقق من جودة الإنترنت أو إعدادات قاعدة البيانات.' : 
                                result.error === 'PERMISSION_DENIED' ? 'صلاحيات الكتابة مرفوضة (Firebase Rules).' : 
                                `فشل الاتصال: ${result.error || 'غير معروف'}`);
            }
            
            // Start loading data immediately regardless of status
            await loadData();
        } catch (err: any) {
            addLog(`Unexpected Init Error: ${err.message}`);
            setFirebaseStatus('error');
            setFirebaseError('تعذر التحقق من حالة الاتصال.');
            await loadData().catch(() => {});
        } finally {
            addLog("Initialization routine finished.");
            setIsLoading(false);
        }
    };

    const loadData = async () => {
        addLog("Loading branches and categories...");
        try {
            // Load in parallel with individual handling to prevent one failure from blocking another
            const branchesPromise = getBranches().catch(e => { addLog(`LoadBranches failed: ${e.message}`); return []; });
            const categoriesPromise = getCategories().catch(e => { addLog(`LoadCategories failed: ${e.message}`); return []; });

            const [branchData, catData] = await Promise.all([branchesPromise, categoriesPromise]);
            
            addLog(`Loaded ${branchData.length} branches and ${catData.length} categories.`);
            setBranches(branchData);
            setCategories(catData);
        } catch (error: any) {
            addLog(`General LoadData Error: ${error.message}`);
        }
    };


    const handleSaveBranch = async (branchData: Omit<Branch, 'id'> | Branch) => {
        addLog("Saving branch...");
        try {
            if ('id' in branchData) {
                await updateBranch(branchData as Branch);
                toast.success('تم تعديل الفرع بنجاح ✅');
            } else {
                await addBranch(branchData);
                toast.success('تم إضافة الفرع بنجاح ✅');
            }
            loadData();
            setIsFormOpen(false);
            setEditingBranch(undefined);
        } catch (error: any) {
            addLog(`Save Branch Error: ${error.message}`);
            toast.error(error?.code?.includes('permission-denied') ? 'خطأ في الصلاحيات' : 'فشل في حفظ البيانات');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
            try {
                await deleteBranch(id);
                toast.success('تم حذف الفرع بنجاح');
                loadData();
            } catch (error: any) {
                addLog(`Delete Error: ${error.message}`);
                toast.error('حدث خطأ أثناء الحذف');
            }
        }
    };

    const handleAddCategory = async () => {
        const name = newCategoryName.trim();
        if (!name) return;
        
        addLog(`Adding category: ${name}`);
        setIsAddingCategory(true);
        
        // Optimistic
        const tempId = `t-${Date.now()}`;
        setCategories(prev => [...prev, { id: tempId, name }]);
        setNewCategoryName('');

        try {
            await addCategory(name);
            addLog("Category added successfully.");
            toast.success('تم إضافة التصنيف ✅');
            await getCategories().then(setCategories).catch(() => {});
        } catch (error: any) {
            addLog(`Add Category Error: ${error.message}`);
            setCategories(prev => prev.filter(c => c.id !== tempId));
            setNewCategoryName(name);
            toast.error(error?.code?.includes('permission-denied') ? 'صلاحيات الكتابة مرفوضة' : 'فشل في الإضافة');
        } finally {
            setIsAddingCategory(false);
        }
    };

    const handleUpdateCategory = async (id: string) => {
        const name = categoryEditName.trim();
        if (!name) return;
        
        try {
            await updateCategory({ id, name });
            setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
            setEditingCategoryId(null);
            toast.success('تم تحديث التصنيف');
            loadData();
        } catch (error: any) {
            toast.error('فشل التحديث');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        const cat = categories.find(c => c.id === id);
        if (!cat) return;

        const branchInCat = branches.filter(b => b.categories?.includes(cat.name));
        if (branchInCat.length > 0) {
            toast.error(`لا يمكن حذف التصنيف لوجود ${branchInCat.length} فروع مرتبطة به.`);
            return;
        }

        if (window.confirm('حذف هذا التصنيف؟')) {
            try {
                await deleteCategory(id);
                setCategories(prev => prev.filter(c => c.id !== id));
                toast.success('تم الحذف');
            } catch (error: any) {
                addLog(`Delete Category Error: ${error.message}`);
                toast.error('فشل الحذف');
            }
        }
    };

    const getBranchCountByCategory = (catName: string) => {
        return branches.filter(b => b.categories?.includes(catName)).length;
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* Debug Console (Collapsible) */}
            <details style={{ marginBottom: '1rem', background: '#f8f9fa', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bug size={16} /> سجل العمليات (Debug Logs)
                </summary>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', maxHeight: '150px', overflowY: 'auto', marginTop: '0.5rem', background: '#222', color: '#0f0', padding: '0.75rem', borderRadius: '4px' }}>
                    {debugLogs.length === 0 ? "لا توجد سجلات بعد..." : debugLogs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            </details>

            {/* Status Banner */}
            {firebaseStatus === 'checking' && (
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary-color)' }}>
                    <Loader2 size={18} className="animate-spin" /> جاري فحص الاتصال...
                </div>
            )}

            {firebaseStatus === 'error' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: 'var(--error)', fontWeight: 700 }}>
                        <WifiOff size={20} /> تنبيه: مشكلة في الاتصال بـ Firebase
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{firebaseError}</p>
                    <button onClick={initializeDashboard} style={{ marginTop: '0.75rem', background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        إعادة المحاولة
                    </button>
                </div>
            )}

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <button 
                    onClick={() => setActiveTab('branches')}
                    style={{ 
                        background: 'none', border: 'none', borderBottom: activeTab === 'branches' ? '3px solid var(--primary-color)' : '3px solid transparent',
                        padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700, color: activeTab === 'branches' ? 'var(--primary-color)' : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s'
                    }}
                >
                    <LayoutDashboard size={18} /> إدارة الفروع
                </button>
                <button 
                    onClick={() => setActiveTab('categories')}
                    style={{ 
                        background: 'none', border: 'none', borderBottom: activeTab === 'categories' ? '3px solid var(--primary-color)' : '3px solid transparent',
                        padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700, color: activeTab === 'categories' ? 'var(--primary-color)' : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s'
                    }}
                >
                    <Layers size={18} /> إدارة التصنيفات
                </button>
            </div>

            {activeTab === 'branches' ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0 }}>الفروع النشطة</h2>
                        <button
                            onClick={() => setIsFormOpen(true)}
                            style={{ background: 'var(--primary-color)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Plus size={20} /> إضافة فرع
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between' }}>
                            <div><h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>إجمالي الفروع</h4><p style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>{branches.length}</p></div>
                            <LayoutDashboard size={24} color="var(--primary-color)" />
                        </div>
                        <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between' }}>
                            <div><h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>التصنيفات</h4><p style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>{categories.length}</p></div>
                            <Layers size={24} color="var(--success)" />
                        </div>
                    </div>

                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 1ch' }} />
                            <p>جاري تحميل البيانات...</p>
                        </div>
                    ) : (
                        <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead style={{ background: 'rgba(59,130,246,0.05)' }}>
                                    <tr><th style={{ padding: '1rem' }}>الاسم</th><th style={{ padding: '1rem' }}>التصنيف</th><th style={{ padding: '1rem' }}>الحالة</th><th style={{ padding: '1rem' }}>إجراءات</th></tr>
                                </thead>
                                <tbody>
                                    {branches.length === 0 ? (
                                        <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>لا توجد فروع مضافة بعد.</td></tr>
                                    ) : (
                                        branches.map(b => (
                                            <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '1rem', fontWeight: 600 }}>{b.name}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div className="category-container" style={{ margin: 0 }}>
                                                        {b.categories?.map((cat, i) => (
                                                            <span key={i} className="popup-category-tag" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                {getCategoryIcon(cat)}
                                                                {cat}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', background: b.status === 'مفتوح' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: b.status === 'مفتوح' ? 'var(--success)' : 'var(--error)', fontSize: '0.85rem', fontWeight: 600 }}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button onClick={() => { setEditingBranch(b); setIsFormOpen(true); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s' }}><Edit2 size={18} /></button>
                                                        <button onClick={() => handleDelete(b.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s' }}><Trash2 size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : viewingCategory ? (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button 
                                onClick={() => setViewingCategory(null)}
                                style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ArrowRight size={20} />
                            </button>
                            <h2 style={{ margin: 0 }}>فروع {viewingCategory}</h2>
                        </div>
                    </div>

                    <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead style={{ background: 'rgba(59,130,246,0.05)' }}>
                                <tr>
                                    <th style={{ padding: '1rem' }}>الاسم</th>
                                    <th style={{ padding: '1rem' }}>التصنيفات الأخرى</th>
                                    <th style={{ padding: '1rem' }}>الحالة</th>
                                    <th style={{ padding: '1rem' }}>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branches.filter(b => b.categories?.includes(viewingCategory)).length === 0 ? (
                                    <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>لا توجد فروع في هذا التصنيف.</td></tr>
                                ) : (
                                    branches.filter(b => b.categories?.includes(viewingCategory)).map(b => (
                                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 600 }}>{b.name}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div className="category-container" style={{ margin: 0 }}>
                                                    {b.categories?.filter(c => c !== viewingCategory).map((cat, i) => (
                                                        <span key={i} className="popup-category-tag" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {getCategoryIcon(cat)}
                                                            {cat}
                                                        </span>
                                                    ))}
                                                    {b.categories?.length === 1 && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>-</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', background: b.status === 'مفتوح' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: b.status === 'مفتوح' ? 'var(--success)' : 'var(--error)', fontSize: '0.85rem', fontWeight: 600 }}>
                                                    {b.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => { setEditingBranch(b); setIsFormOpen(true); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s' }}><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDelete(b.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s' }}><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0 }}>إدارة التصنيفات</h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Search size={16} style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)' }} />
                                <input 
                                    value={newCategoryName} 
                                    onChange={e => setNewCategoryName(e.target.value)} 
                                    placeholder="إضافة تصنيف جديد..." 
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                    style={{ padding: '0.6rem 2.2rem 0.6rem 0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--surface-color)', width: '250px' }} 
                                />
                            </div>
                            <button 
                                onClick={handleAddCategory} 
                                disabled={isAddingCategory || !newCategoryName.trim()} 
                                style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '0 1.2rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, opacity: (!newCategoryName.trim() || isAddingCategory) ? 0.6 : 1 }}
                            >
                                {isAddingCategory ? "..." : "إضافة"}
                            </button>
                        </div>
                    </div>

                    <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead style={{ background: 'rgba(16,185,129,0.05)' }}>
                                <tr>
                                    <th style={{ padding: '1rem' }}>اسم التصنيف</th>
                                    <th style={{ padding: '1rem' }}>الفروع المرتبطة</th>
                                    <th style={{ padding: '1rem' }}>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.length === 0 ? (
                                    <tr><td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>لا توجد تصنيفات بعد.</td></tr>
                                ) : (
                                    categories.map(c => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem' }}>
                                                {editingCategoryId === c.id ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <input 
                                                            autoFocus
                                                            value={categoryEditName} 
                                                            onChange={e => setCategoryEditName(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(c.id)}
                                                            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--primary-color)', background: 'var(--bg-color)' }}
                                                        />
                                                        <button onClick={() => handleUpdateCategory(c.id)} style={{ color: 'var(--success)', border: 'none', background: 'none', cursor: 'pointer' }}><Check size={18} /></button>
                                                        <button onClick={() => setEditingCategoryId(null)} style={{ color: 'var(--error)', border: 'none', background: 'none', cursor: 'pointer' }}><CloseIcon size={18} /></button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 700 }}>
                                                    {getBranchCountByCategory(c.name)} فرع
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button 
                                                        onClick={() => { setEditingCategoryId(c.id); setCategoryEditName(c.name); }} 
                                                        style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '0.4rem' }}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setViewingCategory(c.name)} 
                                                        style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: '0.4rem' }}
                                                        title="عرض الفروع"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteCategory(c.id)} 
                                                        style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.4rem' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
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
