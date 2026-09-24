import React, { useState, useEffect } from 'react';
import { Users, Activity, Trash2, Edit2, Download, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Worker, WorkerOperation, Branch } from '../types';
import { subscribeToWorkers, addWorker, deleteWorker, subscribeToWorkerOperations, updateWorkerOperation, addWorkerOperation, deleteWorkerOperation } from '../services/storage';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
    branches: Branch[];
}

const WorkersView: React.FC<Props> = ({ branches }) => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [operations, setOperations] = useState<WorkerOperation[]>([]);
    
    // Add Worker State
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [branchId, setBranchId] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const [isWorkersOpen, setIsWorkersOpen] = useState(false);
    
    // Operations Filters
    const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
    const [customDate, setCustomDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'network'>('all');
    const [workerFilter, setWorkerFilter] = useState<string>('all');
    const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'with_invoice' | 'without_invoice'>('all');
    
    // Edit Modal State
    const [editingOp, setEditingOp] = useState<WorkerOperation | null>(null);
    const [editPrice, setEditPrice] = useState('');
    const [editExpense, setEditExpense] = useState('');
    const [editServiceType, setEditServiceType] = useState('');
    const [editPaymentMethod, setEditPaymentMethod] = useState<'cash'|'network'|'credit'>('cash');
    const [editHasInvoice, setEditHasInvoice] = useState(false);
    const [editExpenseReason, setEditExpenseReason] = useState('');
    const [editTipAmount, setEditTipAmount] = useState('');

    const [isAddingOp, setIsAddingOp] = useState(false);
    const [newOpData, setNewOpData] = useState({ workerId: '', opType: 'sale' as 'sale'|'return', price: '', serviceType: '', paymentMethod: 'cash' as 'cash'|'network'|'credit', hasInvoice: true, expenseAmount: '', expenseReason: '' });

    const [actualCash, setActualCash] = useState<string>('');

    const [role, setRole] = useState<'worker' | 'supervisor'>('worker');

    useEffect(() => {
        const unsub = subscribeToWorkers(setWorkers);
        return () => unsub();
    }, []);

    useEffect(() => {
        let startTime: number | undefined;
        let endTime: number | undefined;
        const now = new Date();
        
        if (dateFilter === 'today') {
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        } else if (dateFilter === 'yesterday') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            startTime = start.getTime();
            endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1;
        } else if (dateFilter === 'custom' && customDate) {
            const [y, m, d] = customDate.split('-');
            const start = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            startTime = start.getTime();
            endTime = new Date(parseInt(y), parseInt(m) - 1, parseInt(d) + 1).getTime() - 1;
        } else if (dateFilter === 'week') {
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
        } else if (dateFilter === 'month') {
            startTime = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime();
        }

        const unsub = subscribeToWorkerOperations({ startTime, endTime }, setOperations);
        return () => unsub();
    }, [dateFilter, customDate]);

    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !username || !password || !branchId) {
            toast.error('الرجاء تعبئة جميع الحقول');
            return;
        }
        
        // check if username exists
        if (workers.some(w => w.username === username)) {
            toast.error('اسم المستخدم موجود مسبقاً');
            return;
        }

        setIsAdding(true);
        try {
            await addWorker({
                name, username, password, branchId, role, isActive: true
            });
            toast.success('تمت إضافة العامل بنجاح');
            setName(''); setUsername(''); setPassword(''); setBranchId(''); setRole('worker');
        } catch (error) {
            console.error(error);
            toast.error('فشل في إضافة العامل');
        } finally {
            setIsAdding(false);
        }
    };

    const handleProposeEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOp) return;
        
        try {
            const updatedOp = { ...editingOp };
            if (editPrice !== '') updatedOp.price = Number(editPrice);
            if (editExpense !== '') updatedOp.expenseAmount = Number(editExpense);
            if (editTipAmount !== '') updatedOp.tipAmount = Number(editTipAmount);
            updatedOp.serviceType = editServiceType;
            updatedOp.paymentMethod = editPaymentMethod;
            updatedOp.hasInvoice = editHasInvoice;
            updatedOp.expenseReason = editExpenseReason;
            
            // Remove any pending edits if they exist since admin overrides
            if (updatedOp.pendingEditRequest) {
                delete updatedOp.pendingEditRequest;
            }
            
            await updateWorkerOperation(updatedOp);
            toast.success('تم تعديل العملية بنجاح');
            setEditingOp(null);
        } catch (error) {
            console.error(error);
            toast.error('فشل في تعديل العملية');
        }
    };

    const handleDeleteOp = async (op: WorkerOperation) => {
        if (window.confirm('هل أنت متأكد من حذف هذه العملية نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
            try {
                await deleteWorkerOperation(op.id);
                toast.success('تم حذف العملية بنجاح');
            } catch (err) {
                console.error(err);
                toast.error('حدث خطأ أثناء الحذف');
            }
        }
    };

    const handleDeleteWorker = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا العامل؟')) {
            await deleteWorker(id);
            toast.success('تم الحذف');
        }
    };

    const handleExportExcel = () => {
        if (filteredOperations.length === 0) {
            toast.error('لا توجد عمليات للتصدير');
            return;
        }

        const data = filteredOperations.map(op => ({
            'العامل': op.workerName,
            'التاريخ': new Date(op.createdAt).toLocaleDateString('ar-SA'),
            'الوقت': new Date(op.createdAt).toLocaleTimeString('ar-SA'),
            'نوع الخدمة': op.serviceType,
            'المبلغ (إيراد)': op.price,
            'طريقة الدفع': op.paymentMethod === 'cash' ? 'كاش' : 'شبكة',
            'مبلغ الخرج': op.expenseAmount,
            'سبب الخرج': op.expenseReason || 'لا يوجد'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!dir'] = 'rtl';
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "العمليات");
        XLSX.writeFile(wb, `عمليات_العمال_${new Date().toLocaleDateString()}.xlsx`);
        toast.success('تم تصدير الإكسل بنجاح');
    };

    // Filter Operations
    
    const filteredOperations = operations.filter(op => {
        if (workerFilter !== 'all' && op.workerId !== workerFilter) return false;
        if (paymentFilter !== 'all' && op.paymentMethod !== paymentFilter) return false;
        if (invoiceFilter === 'with_invoice' && !op.hasInvoice) return false;
        if (invoiceFilter === 'without_invoice' && op.hasInvoice) return false;
        return true;
    });

    const totalIncome = filteredOperations.reduce((sum, op) => sum + (op.isCashLoan ? 0 : (op.price || 0)), 0);
    const totalNormalExpenses = filteredOperations.reduce((sum, op) => sum + (!op.isCashLoan ? ((op.expenseAmount || 0) + (op.tipAmount || 0)) : 0), 0);
    const totalCashLoans = filteredOperations.reduce((sum, op) => sum + (op.isCashLoan ? (op.expenseAmount || 0) : 0), 0);
    const totalExpenses = totalNormalExpenses + totalCashLoans;
    const totalNetwork = filteredOperations.reduce((sum, op) => sum + (op.paymentMethod === 'network' && !op.isCashLoan ? (op.price || 0) : 0), 0);
    const totalCredit = filteredOperations.reduce((sum, op) => sum + (op.paymentMethod === 'credit' && op.hasInvoice && !op.isCashLoan ? (op.price || 0) : 0), 0);
    const totalWorkerDebt = filteredOperations.reduce((sum, op) => sum + (op.paymentMethod === 'credit' && !op.hasInvoice && !op.isCashLoan ? (op.price || 0) : 0), 0);
    const expectedCash = totalIncome - totalNetwork - totalCredit - totalWorkerDebt - totalExpenses;

    const workerStatsMap = new Map();
    filteredOperations.forEach(op => {
        if (op.isCashLoan) return;
        if (!workerStatsMap.has(op.workerId)) {
            workerStatsMap.set(op.workerId, { name: op.workerName, income: 0, operations: 0 });
        }
        const stat = workerStatsMap.get(op.workerId);
        stat.income += op.price || 0;
        stat.operations += 1;
    });
    const workerChartData = Array.from(workerStatsMap.values()).sort((a, b) => b.income - a.income);

    const handleShareWorker = (w: Worker) => {
        const shareText = `👋 مرحباً ${w.name}،\n\nإليك بيانات الدخول الخاصة بك لبوابة العمال:\n\n👤 اسم المستخدم: ${w.username}\n🔑 كلمة المرور: ${w.password}\n\nرابط الدخول:\n${window.location.origin}/worker-login`;
        const encodedText = encodeURIComponent(shareText);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    };

    const updateWorkerRole = async (w: Worker) => {
        const newRole = w.role === 'supervisor' ? 'worker' : 'supervisor';
        if (window.confirm('هل تريد تغيير صلاحية هذا العامل إلى: ' + (newRole === 'supervisor' ? 'مشرف فرع' : 'عامل عادي') + '؟')) {
            try {
                await setDoc(doc(db, 'workers', w.id), { role: newRole }, { merge: true });
                toast.success('تم تحديث الصلاحية بنجاح');
            } catch (e) {
                toast.error('حدث خطأ أثناء التحديث');
            }
        }
    };

    const handleAddOpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOpData.workerId || !newOpData.serviceType) {
            toast.error('يرجى تعبئة الحقول المطلوبة');
            return;
        }
        const worker = workers.find(w => w.id === newOpData.workerId);
        if (!worker) return;

        try {
            const isReturn = newOpData.opType === 'return';
            const finalPrice = Number(newOpData.price) || 0;
            const finalServiceType = isReturn ? `(مرتجع) ${newOpData.serviceType}` : newOpData.serviceType;
            
            await addWorkerOperation({
                workerId: worker.id,
                workerName: worker.name,
                branchId: worker.branchId,
                serviceType: finalServiceType,
                price: isReturn ? -finalPrice : finalPrice,
                paymentMethod: newOpData.paymentMethod,
                hasInvoice: newOpData.hasInvoice,
                expenseAmount: Number(newOpData.expenseAmount) || 0,
                expenseReason: newOpData.expenseReason,
                tipAmount: 0,
                addedByAdmin: true
            });
            toast.success('تم إضافة العملية بنجاح');
            setIsAddingOp(false);
            setNewOpData({ workerId: '', opType: 'sale', price: '', serviceType: '', paymentMethod: 'cash', hasInvoice: true, expenseAmount: '', expenseReason: '' });
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء الإضافة');
        }
    };

    const handleShareBalance = () => {
        let dateLabel = dateFilter === 'today' ? 'اليوم' : dateFilter === 'yesterday' ? 'الأمس' : dateFilter === 'custom' ? customDate : 'الفترة المحددة';
        let workerLabel = workerFilter === 'all' ? 'جميع العمال' : workers.find(w => w.id === workerFilter)?.name || '';
        
        let expensesDetails = '';
        const expensesList = filteredOperations.filter(op => (op.expenseAmount || 0) > 0 || (op.tipAmount || 0) > 0);
        if (expensesList.length > 0) {
            expensesDetails = '\n\n📋 تفاصيل الخرج والخصومات:\n' + expensesList.map(op => {
                let lines = [];
                if ((op.expenseAmount || 0) > 0) lines.push(`- ${op.expenseAmount} ريال (${op.expenseReason || 'بدون سبب'})`);
                if ((op.tipAmount || 0) > 0) lines.push(`- ${op.tipAmount} ريال (خصم/بخشيش - ${op.serviceType})`);
                return lines.join('\n');
            }).join('\n');
        }

        const actual = Number(actualCash) || 0;
        const diff = actual - expectedCash;
        const diffText = actualCash === '' ? 'لم يتم إدخاله' : (diff === 0 ? 'مطابق ✅' : (diff < 0 ? `عجز (${Math.abs(diff)} ريال) ❌` : `زيادة (${diff} ريال) ⚠️`));

        const shareText = `📊 جرد (${dateLabel})\n👤 العامل: ${workerLabel}\n\n💰 إجمالي المبيعات: ${totalIncome} ريال\n💳 شبكة: ${totalNetwork} ريال\n📝 آجل (بفاتورة): ${totalCredit} ريال\n⚠️ ديون عمال: ${totalWorkerDebt} ريال\n📉 إجمالي الخصم والخرج: ${totalExpenses} ريال${expensesDetails}\n-----------------------\n✅ الكاش المفترض بالدرج: *${expectedCash} ريال*\n💵 الكاش الفعلي المتوفر: *${actualCash === '' ? '؟' : actual} ريال*\n⚖️ الفارق: *${diffText}*`;
        const encodedText = encodeURIComponent(shareText);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Workers Management */}
            <div className="glass responsive-pad" style={{ padding: '1rem', borderRadius: '16px' }}>
                <div 
                    onClick={() => setIsWorkersOpen(!isWorkersOpen)} 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 800 }}>
                        <Users size={20} className="text-primary" /> إدارة العمال
                    </h3>
                    {isWorkersOpen ? <ChevronUp size={20} className="text-secondary" /> : <ChevronDown size={20} className="text-secondary" />}
                </div>

                {isWorkersOpen && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                        <form onSubmit={handleAddWorker} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    <input type="text" placeholder="الاسم (الظاهر للعملاء)" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                    <input type="text" placeholder="معرّف الدخول (إنجليزي/أرقام)" value={username} onChange={e => setUsername(e.target.value)} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                    <input type="text" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                    <select value={branchId} onChange={e => setBranchId(e.target.value)} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                        <option value="">-- اختر الفرع --</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <button type="submit" disabled={isAdding} style={{ padding: '10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: isAdding ? 'not-allowed' : 'pointer' }}>
                        إضافة عامل
                    </button>
                </form>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '10px', fontWeight: 700 }}>اسم العامل</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>اسم المستخدم</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>الفرع</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>الصلاحية</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workers.map(w => (
                                <tr key={w.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: w.isActive === false ? 0.6 : 1 }}>
                                    <td style={{ padding: '10px' }}>{w.name} {w.isActive === false && <span style={{ color: 'var(--error)', fontSize: '11px', marginRight: '6px', fontWeight: 700 }}>(مؤرشف)</span>}</td>
                                    <td style={{ padding: '10px' }}><code style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '4px' }}>{w.username}</code></td>
                                    <td style={{ padding: '10px' }}>{branches.find(b => b.id === w.branchId)?.name || 'غير محدد'}</td>
                                    <td style={{ padding: '10px' }}>{w.role === 'supervisor' ? <span style={{ background: 'var(--primary-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>مشرف فرع</span> : 'عامل'}<button onClick={() => updateWorkerRole(w)} style={{ marginRight: '8px', padding: '4px 8px', fontSize: '10px', borderRadius: '4px', background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer' }}>ترقية/تنزيل</button></td>
                                    <td style={{ padding: '10px' }}>
                                        {w.isActive !== false && <button onClick={() => handleShareWorker(w)} style={{ padding: '6px', background: 'transparent', color: 'var(--success)', border: 'none', cursor: 'pointer', marginRight: '8px' }} title="مشاركة عبر الواتساب"><Share2 size={18} /></button>}
                                        <button onClick={() => handleDeleteWorker(w.id)} style={{ padding: '6px', background: 'transparent', color: w.isActive === false ? 'var(--text-secondary)' : 'var(--error)', border: 'none', cursor: w.isActive === false ? 'not-allowed' : 'pointer' }} disabled={w.isActive === false} title={w.isActive === false ? 'مؤرشف مسبقاً' : 'أرشفة العامل'}><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                            {workers.length === 0 && <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>لا يوجد عمال</td></tr>}
                        </tbody>
                    </table>
                </div>
                </div>
                )}
            </div>

            {/* Operations Log */}
            <div className="glass responsive-pad" style={{ padding: '1rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 800 }}>
                        <Activity size={20} className="text-primary" /> سجل العمليات
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button onClick={() => setIsAddingOp(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 800 }}>
                            + إضافة عملية لعامل
                        </button>
                        <select value={workerFilter} onChange={e => setWorkerFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                            <option value="all">كل العمال</option>
                            {workers.map(w => <option key={w.id} value={w.id}>{w.name} {!w.isActive && '(�����)'}</option>)}
                        </select>
                        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                            <option value="all">الكل (طرق الدفع)</option>
                            <option value="cash">كاش فقط</option>
                            <option value="network">شبكة فقط</option>
                            <option value="credit">آجل فقط</option>
                        </select>
                        <select value={invoiceFilter} onChange={e => setInvoiceFilter(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                            <option value="all">الكل (الفواتير)</option>
                            <option value="with_invoice">بفاتورة فقط</option>
                            <option value="without_invoice">بدون فاتورة فقط</option>
                        </select>
                        <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                            <option value="today">اليوم</option>
                            <option value="yesterday">الأمس</option>
                            <option value="week">آخر أسبوع</option>
                            <option value="month">آخر شهر</option>
                            <option value="all">الكل</option>
                            <option value="custom">تاريخ محدد...</option>
                        </select>
                        {dateFilter === 'custom' && (
                            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                        )}
                        <button onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                            <Download size={18} /> إكسل
                        </button>
                    </div>
                </div>

                {/* الموازنة اليومية (Daily Balance) */}
                <div style={{ background: 'rgba(59,130,246,0.05)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.1)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-color)' }}>الموازنة اليومية (تفصيل الإيرادات)</h4>
                        <button onClick={handleShareBalance} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                            <Share2 size={16} /> مشاركة الجرد
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        
                        <div className="balance-card" style={{ background: 'rgba(59,130,246,0.1)', padding: '1rem', borderRadius: '12px' }}>
                            <div className="balance-title" style={{ color: 'var(--primary-color)', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>إجمالي الإيرادات (المبيعات)</div>
                            <div className="balance-value" style={{ fontSize: '20px', fontWeight: 900 }}>{totalIncome} <span style={{ fontSize: '14px', fontWeight: 400 }}>ريال</span></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                                <span>الشبكة:</span>
                                <span style={{ color: 'var(--primary-color)' }}>{totalNetwork} ريال</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                                <span title="مبيعات معتمدة بفاتورة">الآجل (فاتورة):</span>
                                <span style={{ color: 'var(--accent-orange)' }}>{totalCredit} ريال</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                                <span title="ديون سجلها العامل بدون فاتورة (تُطالب ككاش)">مبيعات آجل (بدون فاتورة):</span>
                                <span style={{ color: 'var(--error)' }}>{totalWorkerDebt} ريال</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                                <span title="السلف المسحوبة يدوياً من درج الكاش">سلف من الدرج:</span>
                                <span style={{ color: 'var(--error)' }}>{totalCashLoans} ريال</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                                <span>الخرج العادي:</span>
                                <span style={{ color: 'var(--error)' }}>{totalNormalExpenses} ريال</span>
                            </div>
                        </div>

                        <div className="balance-card" style={{ background: 'rgba(16,185,129,0.1)', padding: '1rem', borderRadius: '12px', border: '2px solid rgba(16,185,129,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div className="balance-title" style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 800, marginBottom: '4px' }}>الكاش المفترض بالدرج</div>
                            <div className="balance-value" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--success)' }}>{expectedCash} <span style={{ fontSize: '14px', fontWeight: 700 }}>ريال</span></div>
                        </div>

                        <div className="balance-card" style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div className="balance-title" style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>أدخل الكاش الفعلي للمطابقة</div>
                            <input 
                                type="number" 
                                placeholder="الكاش الفعلي..."
                                value={actualCash}
                                onChange={e => setActualCash(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '16px', fontWeight: 800 }}
                            />
                            {actualCash !== '' && (
                                <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 800, color: (Number(actualCash) - expectedCash) === 0 ? 'var(--success)' : (Number(actualCash) - expectedCash) < 0 ? 'var(--error)' : 'var(--accent-orange)' }}>
                                    {(Number(actualCash) - expectedCash) === 0 ? '✅ الصندوق مطابق' : (Number(actualCash) - expectedCash) < 0 ? `❌ عجز: ${Math.abs(Number(actualCash) - expectedCash)} ريال` : `⚠️ زيادة: ${Number(actualCash) - expectedCash} ريال`}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* رسم بياني لأداء العمال */}
                {workerChartData.length > 0 && (
                    <div style={{ background: 'white', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '24px', height: '300px' }}>
                        <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800 }}>مقارنة إيرادات العمال (حسب الفلتر)</h4>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={workerChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                <Bar dataKey="income" name="الإيرادات (ريال)" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '10px', fontWeight: 700 }}>التاريخ</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>العامل</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>الخدمة</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>الإيراد</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>الخرج</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOperations.map(op => (
                                <tr key={op.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '10px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{new Date(op.createdAt).toLocaleDateString('ar-SA')}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(op.createdAt).toLocaleTimeString('ar-SA')}</div>
                                    </td>
                                    <td style={{ padding: '10px', fontWeight: 700 }}>{op.workerName}</td>
                                    <td style={{ padding: '10px' }}>
                                        <div>{op.serviceType} {op.paymentMethod === 'network' ? '💳 (شبكة)' : (op.paymentMethod === 'credit' ? '📝 (آجل)' : '💵 (كاش)')} {op.hasInvoice && <span style={{ color: 'var(--text-secondary)' }} title="بفاتورة">🧾</span>}</div>
                                        {op.addedByAdmin && <div style={{ display: 'inline-block', marginTop: '4px', padding: '2px 6px', background: 'var(--primary-color)', color: 'white', fontSize: '10px', borderRadius: '4px', fontWeight: 700 }}>🛡️ إضافة الإدارة</div>}
                                    </td>
                                    <td style={{ padding: '10px', color: op.price < 0 ? 'var(--error)' : 'var(--success)', fontWeight: 700 }}>{op.price !== 0 ? op.price : '-'}</td>
                                    <td style={{ padding: '10px' }}>
                                        {(op.expenseAmount || 0) > 0 && (
                                            <>
                                                <div style={{ color: 'var(--error)', fontWeight: 700 }}>{op.expenseAmount}</div>
                                                {op.expenseReason && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({op.expenseReason})</div>}
                                            </>
                                        )}
                                        {(op.tipAmount || 0) > 0 && (
                                            <>
                                                <div style={{ color: 'var(--error)', fontWeight: 700 }}>{op.tipAmount}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>(خصم/بخشيش)</div>
                                            </>
                                        )}
                                        {!(op.expenseAmount || 0) && !(op.tipAmount || 0) && '-'}
                                    </td>
                                    <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                                        <button onClick={() => { setEditingOp(op); setEditPrice(op.price.toString()); setEditExpense(op.expenseAmount.toString()); setEditTipAmount(op.tipAmount?.toString() || ''); setEditServiceType(op.serviceType || ''); setEditPaymentMethod(op.paymentMethod || 'cash'); setEditHasInvoice(op.hasInvoice || false); setEditExpenseReason(op.expenseReason || ''); }} style={{ padding: '6px', background: 'transparent', color: 'var(--primary-color)', border: 'none', cursor: 'pointer' }}><Edit2 size={18} /></button>
                                        <button onClick={() => handleDeleteOp(op)} style={{ padding: '6px', background: 'transparent', color: 'var(--error)', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingOp && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '24px', width: '90%', maxWidth: '400px' }}>
                        <h3 style={{ margin: '0 0 16px' }}>تعديل عملية ({editingOp.workerName})</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>قم بتعديل الإيراد أو الخرج للعملية وسيطبق فوراً.</p>
                        
                        <form onSubmit={handleProposeEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>نوع الخدمة (النص)</label>
                                <input type="text" value={editServiceType} onChange={e => setEditServiceType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>تعديل السعر (الإيراد)</label>
                                <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>طريقة الدفع</label>
                                <select value={editPaymentMethod} onChange={e => setEditPaymentMethod(e.target.value as any)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                    <option value="cash">كاش</option>
                                    <option value="network">شبكة</option>
                                    <option value="credit">آجل</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" checked={editHasInvoice} onChange={e => setEditHasInvoice(e.target.checked)} id="hasInvoiceEdit" style={{ width: '18px', height: '18px' }} />
                                <label htmlFor="hasInvoiceEdit" style={{ fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>يوجد فاتورة</label>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>تعديل المصروف (الخرج)</label>
                                <input type="number" value={editExpense} onChange={e => setEditExpense(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                            </div>
                            {Number(editExpense) > 0 && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>سبب المصروف</label>
                                    <input type="text" value={editExpenseReason} onChange={e => setEditExpenseReason(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                                </div>
                            )}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>تعديل الخصم (البخشيش)</label>
                                <input type="number" value={editTipAmount} onChange={e => setEditTipAmount(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>حفظ التعديل</button>
                                <button type="button" onClick={() => setEditingOp(null)} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Operation Modal */}
            {isAddingOp && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '24px', width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>+ إضافة عملية لعامل (بواسطة الإدارة)</h3>
                        <form onSubmit={handleAddOpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>العامل</label>
                                <select value={newOpData.workerId} onChange={e => setNewOpData({...newOpData, workerId: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                    <option value="">-- اختر العامل --</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>نوع العملية</label>
                                <select value={newOpData.opType} onChange={e => setNewOpData({...newOpData, opType: e.target.value as any})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', background: newOpData.opType === 'return' ? 'rgba(239,68,68,0.1)' : 'white', color: newOpData.opType === 'return' ? 'var(--error)' : 'inherit', fontWeight: 700 }}>
                                    <option value="sale">بيع وإيراد</option>
                                    <option value="return">مرتجع مبيعات (سحب مبلغ للعميل)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>الخدمة (البيان)</label>
                                <input type="text" value={newOpData.serviceType} onChange={e => setNewOpData({...newOpData, serviceType: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} placeholder={newOpData.opType === 'return' ? "مثال: استرجاع مبلغ غسيل" : ""} />
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>طريقة الدفع</label>
                                    <select value={newOpData.paymentMethod} onChange={e => setNewOpData({...newOpData, paymentMethod: e.target.value as any})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                        <option value="cash">كاش</option>
                                        <option value="network">شبكة</option>
                                        <option value="credit">آجل</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>{newOpData.opType === 'return' ? 'قيمة المرتجع' : 'المبلغ (الإيراد)'}</label>
                                    <input type="number" value={newOpData.price} onChange={e => setNewOpData({...newOpData, price: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} placeholder="أدخل القيمة كموجب" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" checked={newOpData.hasInvoice} onChange={e => setNewOpData({...newOpData, hasInvoice: e.target.checked})} id="hasInvoiceAdd" style={{ width: '18px', height: '18px' }} />
                                <label htmlFor="hasInvoiceAdd" style={{ fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>يوجد فاتورة</label>
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>مصروف / خرج</label>
                                    <input type="number" value={newOpData.expenseAmount} onChange={e => setNewOpData({...newOpData, expenseAmount: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                                </div>
                                {Number(newOpData.expenseAmount) > 0 && (
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>سبب الخرج</label>
                                        <input type="text" value={newOpData.expenseReason} onChange={e => setNewOpData({...newOpData, expenseReason: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>تسجيل العملية</button>
                                <button type="button" onClick={() => setIsAddingOp(false)} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkersView;
