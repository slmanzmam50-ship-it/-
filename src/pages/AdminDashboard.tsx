import React, { useState, useEffect, useCallback } from 'react';
import { getBranches, addBranch, updateBranch, deleteBranch, getActiveNavigatorsCount, getCategories, addCategory, deleteCategory, seedDatabaseIfNeeded } from '../services/storage';
import { testFirebaseConnection } from '../services/firebase';
import type { Branch, Category } from '../types';
import BranchForm from '../components/BranchForm';
import { Plus, Edit2, Trash2, LayoutDashboard, WifiOff, Loader2, Bug } from 'lucide-react';
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
    const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'ok' | 'error'>('checking');
    const [firebaseError, setFirebaseError] = useState<string | null>(null);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const addLog = useCallback((msg: string) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 10));
        console.log(`[Admin] ${msg}`);
    }, []);

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

            if (branchData.length > 0) {
                loadNavigatorCounts(branchData);
            }
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

    const handleDeleteCategory = async (id: string) => {
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

            {/* Main Content */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>لوحة إدارة الفروع</h1>
                <button
                    onClick={() => setIsFormOpen(true)}
                    style={{ background: 'var(--primary-color)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={20} /> إضافة فرع
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between' }}>
                    <div><h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>إجمالي الفروع</h4><p style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>{branches.length}</p></div>
                    <LayoutDashboard size={24} color="var(--primary-color)" />
                </div>
                {/* Simplified other stats for brevity */}
            </div>

            {/* Table or Loading */}
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
                            {branches.map(b => (
                                <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{b.name}</td>
                                    <td style={{ padding: '1rem' }}>{b.category}</td>
                                    <td style={{ padding: '1rem' }}>{b.status}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <button onClick={() => { setEditingBranch(b); setIsFormOpen(true); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(b.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', marginLeft: '8px' }}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Categories */}
            <div className="glass" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                <h3>إدارة التصنيفات</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="تصنيف جديد..." style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }} />
                    <button onClick={handleAddCategory} disabled={isAddingCategory} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                        {isAddingCategory ? "..." : "إضافة"}
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {categories.map(c => (
                        <div key={c.id} style={{ border: '1px solid #ddd', padding: '0.25rem 0.75rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {c.name} <button onClick={() => handleDeleteCategory(c.id)} style={{ border: 'none', background: 'none', color: '#999', cursor: 'pointer' }}>×</button>
                        </div>
                    ))}
                </div>
            </div>

            {isFormOpen && <BranchForm branch={editingBranch} onSave={handleSaveBranch} onClose={() => { setIsFormOpen(false); setEditingBranch(undefined); }} categories={categories} />}
        </div>
    );
};

export default AdminDashboard;
