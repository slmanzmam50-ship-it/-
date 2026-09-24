import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Wallet, CheckCircle, TrendingUp, TrendingDown, CreditCard, Coins, FileText, FileX, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Worker, WorkerOperation } from '../types';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { subscribeToWorkerOperationsByWorker, addWorkerOperation } from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import SupervisorBranchView from '../components/SupervisorBranchView';

const WorkerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [worker, setWorker] = useState<Worker | null>(null);
    const [operations, setOperations] = useState<WorkerOperation[]>([]);
    
    // Form state
    const [serviceType, setServiceType] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'network' | 'credit'>('cash');
    const [hasInvoice, setHasInvoice] = useState<boolean>(true);
    const [tipAmount, setTipAmount] = useState<string>('');
    
    const [isExpense, setIsExpense] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState<string>('');
    const [expenseReason, setExpenseReason] = useState<string>('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'register' | 'branch'>('register');

    // PWA Install Banner
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const [installPrompt, setInstallPrompt] = useState<any>(() => (window as any).__pwaInstallPrompt || null);
    const [showInstallBanner, setShowInstallBanner] = useState(!isStandalone);

    // Force LIGHT theme for workers (they work in sunlight)
    useEffect(() => {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        return () => {
            // Restore original theme on unmount (when leaving worker page)
            const savedTheme = localStorage.getItem('theme') || 'light';
            if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            }
        };
    }, []);

    useEffect(() => {
        if (isStandalone) { setShowInstallBanner(false); return; }

        const applyPrompt = (prompt: any) => {
            setInstallPrompt(prompt);
            // Auto-show the native install popup after 1.5s
            setTimeout(() => {
                prompt.prompt();
                prompt.userChoice.then((choice: any) => {
                    if (choice.outcome === 'accepted') {
                        setShowInstallBanner(false);
                        (window as any).__pwaInstallPrompt = null;
                    }
                    setInstallPrompt(null);
                });
            }, 1500);
        };

        // Already captured before React mounted
        if ((window as any).__pwaInstallPrompt) {
            applyPrompt((window as any).__pwaInstallPrompt);
        }

        // Listen if it fires after React mounts
        const handler = (e: CustomEvent) => applyPrompt(e.detail);
        window.addEventListener('pwaPromptReady', handler as EventListener);
        return () => window.removeEventListener('pwaPromptReady', handler as EventListener);
    }, [isStandalone]);

    const handleInstallApp = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowInstallBanner(false);
                (window as any).__pwaInstallPrompt = null;
            }
            setInstallPrompt(null);
        }
        setShowInstallBanner(false);
    };

    useEffect(() => {
        const workerId = localStorage.getItem('logged_worker_id');
        const token = localStorage.getItem('worker_session_token');
        
        if (!workerId || !token) {
            navigate('/login?type=worker');
            return;
        }

        // Verify and load worker
        const fetchWorker = async () => {
            try {
                const docRef = doc(db, 'workers', workerId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setWorker({ id: docSnap.id, ...docSnap.data() } as Worker);
                } else {
                    handleLogout();
                }
            } catch (error) {
                console.error("Error loading worker:", error);
            }
        };

        fetchWorker();
        
        // Subscribe to operations
        const unsubscribe = subscribeToWorkerOperationsByWorker(workerId, (ops) => {
            setOperations(ops);
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('logged_worker_id');
        localStorage.removeItem('worker_session_token');
        navigate('/login?type=worker');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!worker) return;

        // If it's an expense, we need amount and reason
        if (isExpense) {
            if (!expenseAmount || !expenseReason) {
                toast.error('الرجاء إدخال مبلغ الخرج وسببه');
                return;
            }
        } else {
            if (!price) {
                toast.error('الرجاء إدخال سعر الخدمة');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            await addWorkerOperation({
                workerId: worker.id,
                workerName: worker.name,
                branchId: worker.branchId,
                serviceType: isExpense ? 'أخرى' : serviceType,
                price: isExpense ? 0 : Number(price),
                paymentMethod,
                hasInvoice,
                tipAmount: tipAmount ? Number(tipAmount) : 0,
                expenseAmount: isExpense ? Number(expenseAmount) : 0,
                expenseReason: isExpense ? expenseReason : ''
            });

            toast.success('تم تسجيل العملية بنجاح! 🚀');
            
            // Reset form
            setPrice('');
            setTipAmount('');
            setExpenseAmount('');
            setExpenseReason('');
            setIsExpense(false);
            setHasInvoice(true);
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء التسجيل');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Analytics Calculation
    const currentMonthOps = operations.filter(op => {
        const d = new Date(op.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const previousMonthOps = operations.filter(op => {
        const d = new Date(op.createdAt);
        const now = new Date();
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const currentTotal = currentMonthOps.reduce((sum, op) => sum + op.price - op.expenseAmount, 0);
    const prevTotal = previousMonthOps.reduce((sum, op) => sum + op.price - op.expenseAmount, 0);
    const diff = currentTotal - prevTotal;

    // Chart Data (Group by Day for current month)
    const chartDataMap = new Map();
    currentMonthOps.forEach(op => {
        const day = new Date(op.createdAt).getDate();
        if (!chartDataMap.has(day)) chartDataMap.set(day, { day: `يوم ${day}`, income: 0, expenses: 0 });
        const d = chartDataMap.get(day);
        d.income += op.price;
        d.expenses += op.expenseAmount;
    });
    const chartData = Array.from(chartDataMap.values()).sort((a, b) => parseInt(a.day.split(' ')[1]) - parseInt(b.day.split(' ')[1]));

    const todayOperations = operations.filter(op => new Date(op.createdAt).toDateString() === new Date().toDateString());

    if (!worker) return <div style={{ padding: '1rem', textAlign: 'center' }}>جاري التحميل...</div>;

    return (
        <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>مرحباً، {worker.name} 👋</h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>لوحة تسجيل العمليات اليومية</p>
                </div>
                <button 
                    onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: 'rgba(239,68,68,0.08)', color: 'var(--error)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                >
                    <LogOut size={14} />
                </button>
            </div>

            {/* PWA Install Banner */}
            {showInstallBanner && (
                <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.12) 100%)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>📲</span>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--success)' }}>ثبّت التطبيق على جوالك</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {isIos
                                    ? 'اضغط على زر المشاركة ثم "الإضافة للشاشة الرئيسية" 🔼'
                                    : installPrompt
                                        ? 'اضغط تثبيت لفتح التطبيق بدون متصفح'
                                        : 'من قائمة المتصفح ⋮ اختر "إضافة إلى الشاشة الرئيسية"'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {!isIos && installPrompt && (
                            <button onClick={handleInstallApp} style={{ padding: '8px 16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '13px' }}>
                                تثبيت ✓
                            </button>
                        )}
                        <button onClick={() => setShowInstallBanner(false)} style={{ padding: '8px 12px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', fontSize: '12px' }}>
                            تخطي
                        </button>
                    </div>
                </div>
            )}

            {worker?.role === 'supervisor' && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--bg-color)', padding: '6px', borderRadius: '16px' }}>
                    <button onClick={() => setActiveTab('register')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: activeTab === 'register' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'register' ? 'white' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}>
                        تسجيل فواتيري
                    </button>
                    <button onClick={() => setActiveTab('branch')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: activeTab === 'branch' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'branch' ? 'white' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}>
                        إدارة وموازنة الفرع
                    </button>
                </div>
            )}

            {activeTab === 'branch' && worker?.role === 'supervisor' ? (
                <SupervisorBranchView branchId={worker.branchId} />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                
                {/* Form Section */}
                <div style={{ background: 'white', padding: '1rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <button 
                            onClick={() => setIsExpense(false)}
                            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: !isExpense ? 'var(--primary-color)' : 'var(--bg-color)', color: !isExpense ? 'white' : 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            تسجيل خدمة / إيراد
                        </button>
                        <button 
                            onClick={() => setIsExpense(true)}
                            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: isExpense ? 'var(--error)' : 'var(--bg-color)', color: isExpense ? 'white' : 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            تسجيل مصروف (خَرْج)
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        
                        {!isExpense ? (
                            <>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '14px' }}>نوع الخدمة</label>
                                    <input type="text" value={serviceType} onChange={e => setServiceType(e.target.value)} placeholder="اكتب نوع الخدمة هنا..." required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-color)', fontFamily: 'inherit' }} />
                                </div>
                                
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '14px' }}>السعر (ريال)</label>
                                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" min="0" required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-color)' }} />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '14px' }}>طريقة الدفع</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button type="button" onClick={() => setPaymentMethod('cash')} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `1px solid ${paymentMethod === 'cash' ? 'var(--success)' : 'var(--border-color)'}`, background: paymentMethod === 'cash' ? 'rgba(16,185,129,0.1)' : 'transparent', color: paymentMethod === 'cash' ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <Coins size={20} />
                                                <span style={{ fontSize: '12px' }}>كاش</span>
                                            </button>
                                            <button type="button" onClick={() => setPaymentMethod('network')} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `1px solid ${paymentMethod === 'network' ? 'var(--primary-color)' : 'var(--border-color)'}`, background: paymentMethod === 'network' ? 'rgba(59,130,246,0.1)' : 'transparent', color: paymentMethod === 'network' ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <CreditCard size={20} />
                                                <span style={{ fontSize: '12px' }}>شبكة</span>
                                            </button>
                                            <button type="button" onClick={() => setPaymentMethod('credit')} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `1px solid ${paymentMethod === 'credit' ? 'var(--accent-orange)' : 'var(--border-color)'}`, background: paymentMethod === 'credit' ? 'rgba(245,158,11,0.1)' : 'transparent', color: paymentMethod === 'credit' ? 'var(--accent-orange)' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <BookOpen size={20} />
                                                <span style={{ fontSize: '12px' }}>آجل</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '14px' }}>الفاتورة</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button type="button" onClick={() => setHasInvoice(true)} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `1px solid ${hasInvoice ? 'var(--success)' : 'var(--border-color)'}`, background: hasInvoice ? 'rgba(16,185,129,0.1)' : 'transparent', color: hasInvoice ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <FileText size={24} />
                                                <span>بفاتورة</span>
                                            </button>
                                            <button type="button" onClick={() => setHasInvoice(false)} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `1px solid ${!hasInvoice ? 'var(--error)' : 'var(--border-color)'}`, background: !hasInvoice ? 'rgba(239,68,68,0.1)' : 'transparent', color: !hasInvoice ? 'var(--error)' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <FileX size={24} />
                                                <span style={{ textDecoration: 'line-through' }}>بدون</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '14px' }}>بخشيش (اختياري - ريال)</label>
                                    <input type="number" value={tipAmount} onChange={e => setTipAmount(e.target.value)} placeholder="0" min="0" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-color)' }} />
                                </div>
                            </>
                        ) : (
                            <div style={{ background: 'rgba(239,68,68,0.05)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '14px', color: 'var(--error)' }}>المبلغ المصروف من الصندوق (ريال)</label>
                                    <input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0" min="1" required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', outline: 'none', background: 'white' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '14px', color: 'var(--error)' }}>سبب الصرف (ملاحظة للإدارة)</label>
                                    <textarea value={expenseReason} onChange={e => setExpenseReason(e.target.value)} placeholder="مثال: شراء صابون، غداء، صيانة..." required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', outline: 'none', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                                </div>
                            </div>
                        )}

                        <button type="submit" disabled={isSubmitting} style={{
                            marginTop: '1rem', padding: '16px', background: isExpense ? 'var(--error)' : 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '16px', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isSubmitting ? 0.7 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                        }}>
                            <Plus size={20} />
                            {isSubmitting ? 'جاري الحفظ...' : (isExpense ? 'تسجيل المصروف' : 'تسجيل العملية')}
                        </button>
                    </form>
                </div>

                {/* Stats Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '14px' }}>
                                <Wallet size={18} /> صافي الإيراد (هذا الشهر)
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)' }}>
                                {currentTotal} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>ريال</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '13px', color: diff >= 0 ? 'var(--success)' : 'var(--error)', fontWeight: 700 }}>
                                {diff >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {Math.abs(diff)} ريال {diff >= 0 ? 'زيادة عن الشهر الماضي' : 'نقص عن الشهر الماضي'}
                            </div>
                        </div>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '14px' }}>
                                <CheckCircle size={18} /> عدد العمليات (هذا الشهر)
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)' }}>
                                {currentMonthOps.length} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>عملية</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'white', padding: '1rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', flex: 1, minHeight: '300px' }}>
                        <h3 style={{ margin: '0 0 1.5rem', fontSize: '16px', fontWeight: 800 }}>الأداء اليومي (هذا الشهر)</h3>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <Bar dataKey="income" name="إيرادات" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expenses" name="مصروفات" fill="var(--error)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>لا توجد بيانات كافية لهذا الشهر</div>
                        )}
                    </div>
                </div>
                
                {/* Today's Operations Table */}
                <div style={{ background: 'white', padding: '1rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginTop: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '16px', fontWeight: 800 }}>عملياتي اليوم</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '8px', fontWeight: 700, fontSize: '13px' }}>الوقت</th>
                                    <th style={{ padding: '8px', fontWeight: 700, fontSize: '13px' }}>الخدمة</th>
                                    <th style={{ padding: '8px', fontWeight: 700, fontSize: '13px' }}>المبلغ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayOperations.map(op => (
                                    <tr key={op.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            {new Date(op.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '8px', fontSize: '13px' }}>
                                            {op.serviceType} {op.paymentMethod === 'network' ? '💳' : (op.paymentMethod === 'credit' ? '📝' : '💵')}
                                            {op.expenseAmount > 0 && op.expenseReason && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({op.expenseReason})</div>}
                                        </td>
                                        <td style={{ padding: '8px', fontSize: '13px', fontWeight: 700, color: op.expenseAmount > 0 ? 'var(--error)' : 'var(--success)' }}>
                                            {op.expenseAmount > 0 ? op.expenseAmount : op.price} ريال
                                        </td>
                                    </tr>
                                ))}
                                {todayOperations.length === 0 && (
                                    <tr>
                                        <td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>لا توجد عمليات مسجلة اليوم</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
            )}
        </div>
    );
};

export default WorkerDashboard;
