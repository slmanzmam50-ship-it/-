import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Wallet, CheckCircle, AlertCircle, TrendingUp, TrendingDown, CreditCard, Coins, FileText, FileX } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Worker, WorkerOperation } from '../types';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { subscribeToWorkerOperationsByWorker, addWorkerOperation, updateWorkerOperation } from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const WorkerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [worker, setWorker] = useState<Worker | null>(null);
    const [operations, setOperations] = useState<WorkerOperation[]>([]);
    
    // Form state
    const [serviceType, setServiceType] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'network'>('cash');
    const [hasInvoice, setHasInvoice] = useState<boolean>(true);
    const [tipAmount, setTipAmount] = useState<string>('');
    
    const [isExpense, setIsExpense] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState<string>('');
    const [expenseReason, setExpenseReason] = useState<string>('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const workerId = localStorage.getItem('logged_worker_id');
        const token = localStorage.getItem('worker_session_token');
        
        if (!workerId || !token) {
            navigate('/login');
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
        navigate('/login');
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

    const handleResolveEdit = async (operation: WorkerOperation, resolution: 'approved' | 'rejected') => {
        if (!operation.pendingEditRequest) return;
        
        try {
            const updatedOp = { ...operation };
            
            if (resolution === 'approved') {
                // Apply changes
                const edits = operation.pendingEditRequest;
                if (edits && edits.price !== undefined) updatedOp.price = edits.price;
                if (edits && edits.paymentMethod !== undefined) updatedOp.paymentMethod = edits.paymentMethod;
                if (edits && edits.hasInvoice !== undefined) updatedOp.hasInvoice = edits.hasInvoice;
                if (edits && edits.tipAmount !== undefined) updatedOp.tipAmount = edits.tipAmount;
                if (edits && edits.expenseAmount !== undefined) updatedOp.expenseAmount = edits.expenseAmount;
                if (edits && edits.expenseReason !== undefined) updatedOp.expenseReason = edits.expenseReason;
                
                if (updatedOp.pendingEditRequest) if (updatedOp.pendingEditRequest) updatedOp.pendingEditRequest.status = 'approved';
                toast.success('تم قبول التعديل وتحديث العملية ✅');
            } else {
                if (updatedOp.pendingEditRequest) if (updatedOp.pendingEditRequest) updatedOp.pendingEditRequest.status = 'rejected';
                toast.success('تم رفض التعديل ❌');
            }
            
            // Remove the pending request entirely after resolving, or keep it as history. Let's just remove it for clean UI
            delete updatedOp.pendingEditRequest;
            
            await updateWorkerOperation(updatedOp);
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء الرد على الطلب');
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

    const pendingRequests = operations.filter(op => op.pendingEditRequest && op.pendingEditRequest.status === 'pending');

    if (!worker) return <div style={{ padding: '2rem', textAlign: 'center' }}>جاري التحميل...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>مرحباً، {worker.name} 👋</h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>لوحة تسجيل العمليات اليومية</p>
                </div>
                <button 
                    onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}
                >
                    <LogOut size={18} /> تسجيل الخروج
                </button>
            </div>

            {pendingRequests.length > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--accent-orange)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
                    <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309' }}>
                        <AlertCircle size={20} /> طلبات تعديل معلقة من الإدارة ({pendingRequests.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {pendingRequests.map(op => (
                            <div key={op.id} style={{ background: 'white', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <div>
                                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>تعديل على عملية: {op.serviceType} (التاريخ: {new Date(op.createdAt).toLocaleDateString('ar-SA')})</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        الإدارة تطلب تعديل:
                                        {op.pendingEditRequest?.price !== undefined && ` السعر إلى ${op.pendingEditRequest.price} ريال`}
                                        {op.pendingEditRequest?.expenseAmount !== undefined && ` الخرج إلى ${op.pendingEditRequest.expenseAmount} ريال`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleResolveEdit(op, 'approved')} style={{ padding: '8px 16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>موافقة</button>
                                    <button onClick={() => handleResolveEdit(op, 'rejected')} style={{ padding: '8px 16px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>رفض</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                
                {/* Form Section */}
                <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
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
                                                <Coins size={24} />
                                                <span>كاش</span>
                                            </button>
                                            <button type="button" onClick={() => setPaymentMethod('network')} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `1px solid ${paymentMethod === 'network' ? 'var(--primary-color)' : 'var(--border-color)'}`, background: paymentMethod === 'network' ? 'rgba(59,130,246,0.1)' : 'transparent', color: paymentMethod === 'network' ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <CreditCard size={24} />
                                                <span>شبكة</span>
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
                            <div style={{ background: 'rgba(239,68,68,0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>
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
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '14px' }}>
                                <Wallet size={18} /> صافي الإيراد (هذا الشهر)
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)' }}>
                                {currentTotal} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>ريال</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '13px', color: diff >= 0 ? 'var(--success)' : 'var(--error)', fontWeight: 700 }}>
                                {diff >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {Math.abs(diff)} ريال {diff >= 0 ? 'زيادة عن الشهر الماضي' : 'نقص عن الشهر الماضي'}
                            </div>
                        </div>
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '14px' }}>
                                <CheckCircle size={18} /> عدد العمليات (هذا الشهر)
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)' }}>
                                {currentMonthOps.length} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>عملية</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', flex: 1, minHeight: '300px' }}>
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
            </div>
        </div>
    );
};

export default WorkerDashboard;
