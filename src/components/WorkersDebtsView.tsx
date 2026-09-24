import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle } from 'lucide-react';
import type { WorkerOperation, Worker } from '../types';
import { subscribeToWorkerOperations, subscribeToWorkers, updateWorkerOperation, addWorkerOperation } from '../services/storage';
import toast from 'react-hot-toast';

const WorkersDebtsView: React.FC = () => {
    const [operations, setOperations] = useState<WorkerOperation[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [workerFilter, setWorkerFilter] = useState('all');
    
    const [paymentModalOp, setPaymentModalOp] = useState<WorkerOperation | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [isAddingDebt, setIsAddingDebt] = useState(false);
    const [newDebtData, setNewDebtData] = useState({ workerId: '', price: '', serviceType: '', sourceType: 'general' as 'general' | 'drawer' });

    useEffect(() => {
        const unsubWorkers = subscribeToWorkers(setWorkers);
        // Load all operations to find debts
        const unsubOps = subscribeToWorkerOperations({}, setOperations);
        return () => {
            unsubWorkers();
            unsubOps();
        };
    }, []);

    // Filter only personal debts (Credit WITHOUT invoice)
    const debtOperations = operations.filter(op => op.paymentMethod === 'credit' && !op.hasInvoice);
    
    // Further filter by worker
    const filteredDebts = debtOperations.filter(op => workerFilter === 'all' || op.workerId === workerFilter);

    const totalDebts = filteredDebts.reduce((sum, op) => sum + op.price, 0);
    const totalPaid = filteredDebts.reduce((sum, op) => sum + (op.paidAmount || 0), 0);
    const totalRemaining = totalDebts - totalPaid;

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentModalOp) return;
        
        const amount = Number(paymentAmount);
        if (amount <= 0) {
            toast.error('الرجاء إدخال مبلغ صحيح');
            return;
        }

        const remaining = paymentModalOp.price - (paymentModalOp.paidAmount || 0);
        if (amount > remaining) {
            toast.error(`المبلغ المدخل أكبر من المتبقي (${remaining} ريال)`);
            return;
        }

        try {
            const updatedOp = { ...paymentModalOp, paidAmount: (paymentModalOp.paidAmount || 0) + amount };
            await updateWorkerOperation(updatedOp);
            toast.success('تم تسجيل الدفعة بنجاح');
            setPaymentModalOp(null);
            setPaymentAmount('');
        } catch (error) {
            console.error(error);
            toast.error('فشل في تسجيل الدفعة');
        }
    };

    const handleAddDebt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDebtData.workerId || !newDebtData.price || !newDebtData.serviceType) {
            toast.error('الرجاء تعبئة جميع الحقول');
            return;
        }
        
        const worker = workers.find(w => w.id === newDebtData.workerId);
        if (!worker) return;

        const isFromDrawer = newDebtData.sourceType === 'drawer';
        const priceNum = Number(newDebtData.price);

        try {
            await addWorkerOperation({
                workerId: worker.id,
                workerName: worker.name,
                branchId: worker.branchId,
                serviceType: newDebtData.serviceType,
                price: priceNum,
                paymentMethod: 'credit',
                hasInvoice: false,
                tipAmount: 0,
                expenseAmount: isFromDrawer ? priceNum : 0,
                expenseReason: isFromDrawer ? 'سلفة دين لعامل' : undefined,
                isCashLoan: isFromDrawer
            });
            toast.success('تم تسجيل الدين بنجاح');
            setIsAddingDebt(false);
            setNewDebtData({ workerId: '', price: '', serviceType: '', sourceType: 'general' });
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء التسجيل');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={24} className="text-primary" /> ديون العمال (بدون فاتورة)
                    </h2>
                    
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button onClick={() => setIsAddingDebt(true)} style={{ padding: '12px 20px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '14px' }}>
                            + تسجيل دين جديد
                        </button>
                        <div style={{ width: '250px' }}>
                            <select value={workerFilter} onChange={e => setWorkerFilter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', outline: 'none' }}>
                                <option value="all">جميع العمال</option>
                                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '4px' }}>إجمالي الديون</div>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>{totalDebts} <span style={{ fontSize: '14px' }}>ريال</span></div>
                    </div>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>المسدد</div>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>{totalPaid} <span style={{ fontSize: '14px' }}>ريال</span></div>
                    </div>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--error)', marginBottom: '4px' }}>المتبقي</div>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>{totalRemaining} <span style={{ fontSize: '14px' }}>ريال</span></div>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-color)', borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>التاريخ</th>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>العامل</th>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>الخدمة / الوصف</th>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>قيمة الدين</th>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>المسدد</th>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>المتبقي</th>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDebts.length > 0 ? filteredDebts.map(op => {
                                const remaining = op.price - (op.paidAmount || 0);
                                const isFullyPaid = remaining <= 0;
                                return (
                                    <tr key={op.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: isFullyPaid ? 0.6 : 1 }}>
                                        <td style={{ padding: '16px', fontWeight: 700 }}>{new Date(op.createdAt).toLocaleDateString('ar-SA')}</td>
                                        <td style={{ padding: '16px', fontWeight: 700 }}>{op.workerName}</td>
                                        <td style={{ padding: '16px' }}>{op.serviceType}</td>
                                        <td style={{ padding: '16px', fontWeight: 800 }}>{op.price}</td>
                                        <td style={{ padding: '16px', fontWeight: 800, color: 'var(--success)' }}>{op.paidAmount || 0}</td>
                                        <td style={{ padding: '16px', fontWeight: 800, color: 'var(--error)' }}>{remaining}</td>
                                        <td style={{ padding: '16px' }}>
                                            {!isFullyPaid ? (
                                                <button onClick={() => { setPaymentModalOp(op); setPaymentAmount(remaining.toString()); }} style={{ padding: '6px 12px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
                                                    تسديد
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <CheckCircle size={16} /> مكتمل
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>لا توجد ديون مسجلة</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            {paymentModalOp && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '24px', width: '90%', maxWidth: '400px' }}>
                        <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>تسديد جزء من الدين</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            الدين على العامل: <strong>{paymentModalOp.workerName}</strong><br/>
                            المبلغ المتبقي: <strong style={{ color: 'var(--error)' }}>{paymentModalOp.price - (paymentModalOp.paidAmount || 0)} ريال</strong>
                        </p>
                        
                        <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>المبلغ المراد تسديده الآن</label>
                                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} autoFocus />
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>تأكيد الدفعة</button>
                                <button type="button" onClick={() => setPaymentModalOp(null)} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Debt Modal */}
            {isAddingDebt && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '24px', width: '90%', maxWidth: '400px' }}>
                        <h3 style={{ margin: '0 0 16px' }}>تسجيل دين جديد على عامل</h3>
                        <form onSubmit={handleAddDebt} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>العامل</label>
                                <select value={newDebtData.workerId} onChange={e => setNewDebtData({...newDebtData, workerId: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                    <option value="">اختر العامل...</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>قيمة الدين (ريال)</label>
                                <input type="number" value={newDebtData.price} onChange={e => setNewDebtData({...newDebtData, price: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} placeholder="مثال: 150" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>البيان / الوصف</label>
                                <input type="text" value={newDebtData.serviceType} onChange={e => setNewDebtData({...newDebtData, serviceType: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} placeholder="مثال: دين قديم / عجز سابق" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>مصدر المبلغ</label>
                                <select value={newDebtData.sourceType} onChange={e => setNewDebtData({...newDebtData, sourceType: e.target.value as 'general' | 'drawer'})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                    <option value="general">من الصندوق العام (خارجي - لا يخصم من إيراد اليوم)</option>
                                    <option value="drawer">من صندوق اليوم (يُسجل كـ خرج ويخصم من الموازنة اليومية)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>حفظ الدين</button>
                                <button type="button" onClick={() => setIsAddingDebt(false)} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkersDebtsView;
