import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Activity, Trash2, Edit2, Search, Filter, Download } from 'lucide-react';
import type { Worker, WorkerOperation, Branch } from '../types';
import { subscribeToWorkers, addWorker, deleteWorker, subscribeToWorkerOperations, updateWorkerOperation } from '../services/storage';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

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

    // Operations Filters
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
    const [workerFilter, setWorkerFilter] = useState<string>('all');
    
    // Edit Modal State
    const [editingOp, setEditingOp] = useState<WorkerOperation | null>(null);
    const [editPrice, setEditPrice] = useState('');
    const [editExpense, setEditExpense] = useState('');

    useEffect(() => {
        const unsubs = [
            subscribeToWorkers(setWorkers),
            subscribeToWorkerOperations(setOperations)
        ];
        return () => unsubs.forEach(f => f());
    }, []);

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
                name, username, password, branchId, isActive: true
            });
            toast.success('تمت إضافة العامل بنجاح');
            setName(''); setUsername(''); setPassword(''); setBranchId('');
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
            updatedOp.pendingEditRequest = {
                requestedAt: Date.now(),
                status: 'pending',
                price: editPrice ? Number(editPrice) : editingOp.price,
                expenseAmount: editExpense ? Number(editExpense) : editingOp.expenseAmount
            };
            
            await updateWorkerOperation(updatedOp);
            toast.success('تم إرسال طلب التعديل للعامل بنجاح');
            setEditingOp(null);
        } catch (error) {
            console.error(error);
            toast.error('فشل في إرسال التعديل');
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
        XLSX.writeFile(wb, \`عمليات_العمال_\${new Date().toLocaleDateString()}.xlsx\`);
        toast.success('تم تصدير الإكسل بنجاح');
    };

    // Filter Operations
    const now = Date.now();
    const filteredOperations = operations.filter(op => {
        if (workerFilter !== 'all' && op.workerId !== workerFilter) return false;
        
        const diffDays = (now - op.createdAt) / (1000 * 60 * 60 * 24);
        if (dateFilter === 'today' && diffDays > 1) return false;
        if (dateFilter === 'week' && diffDays > 7) return false;
        if (dateFilter === 'month' && diffDays > 30) return false;
        
        return true;
    });

    const totalIncome = filteredOperations.reduce((sum, op) => sum + op.price, 0);
    const totalExpenses = filteredOperations.reduce((sum, op) => sum + op.expenseAmount, 0);
    const totalNet = totalIncome - totalExpenses;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Workers Management */}
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 800 }}>
                    <Users size={20} className="text-primary" /> إدارة العمال
                </h3>
                <form onSubmit={handleAddWorker} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    <input type="text" placeholder="الاسم" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                    <input type="text" placeholder="اسم المستخدم" value={username} onChange={e => setUsername(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                    <input type="text" placeholder="الرقم السري" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                    <select value={branchId} onChange={e => setBranchId(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                        <option value="">-- اختر الفرع --</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <button type="submit" disabled={isAdding} style={{ padding: '12px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: isAdding ? 'not-allowed' : 'pointer' }}>
                        إضافة عامل
                    </button>
                </form>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '12px', fontWeight: 700 }}>اسم العامل</th>
                                <th style={{ padding: '12px', fontWeight: 700 }}>اسم المستخدم</th>
                                <th style={{ padding: '12px', fontWeight: 700 }}>الفرع</th>
                                <th style={{ padding: '12px', fontWeight: 700 }}>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workers.map(w => (
                                <tr key={w.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px' }}>{w.name}</td>
                                    <td style={{ padding: '12px' }}><code style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '4px' }}>{w.username}</code></td>
                                    <td style={{ padding: '12px' }}>{branches.find(b => b.id === w.branchId)?.name || 'غير محدد'}</td>
                                    <td style={{ padding: '12px' }}>
                                        <button onClick={() => handleDeleteWorker(w.id)} style={{ padding: '6px', background: 'transparent', color: 'var(--error)', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                            {workers.length === 0 && <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>لا يوجد عمال</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Operations Log */}
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 800 }}>
                        <Activity size={20} className="text-primary" /> سجل العمليات
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <select value={workerFilter} onChange={e => setWorkerFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                            <option value="all">كل العمال</option>
                            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                        <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                            <option value="today">اليوم</option>
                            <option value="week">آخر أسبوع</option>
                            <option value="month">آخر شهر</option>
                            <option value="all">الكل</option>
                        </select>
                        <button onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                            <Download size={18} /> إكسل
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(59,130,246,0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div style={{ color: 'var(--primary-color)', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>إجمالي الإيرادات</div>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>{totalIncome} <span style={{ fontSize: '14px', fontWeight: 400 }}>ريال</span></div>
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div style={{ color: 'var(--error)', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>إجمالي المصروفات (الخرج)</div>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>{totalExpenses} <span style={{ fontSize: '14px', fontWeight: 400 }}>ريال</span></div>
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>صافي الأرباح</div>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>{totalNet} <span style={{ fontSize: '14px', fontWeight: 400 }}>ريال</span></div>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '12px', fontWeight: 700 }}>التاريخ</th>
                                <th style={{ padding: '12px', fontWeight: 700 }}>العامل</th>
                                <th style={{ padding: '12px', fontWeight: 700 }}>الخدمة</th>
                                <th style={{ padding: '12px', fontWeight: 700 }}>الإيراد</th>
                                <th style={{ padding: '12px', fontWeight: 700 }}>الخرج</th>
                                <th style={{ padding: '12px', fontWeight: 700 }}>حالة التعديل</th>
                                <th style={{ padding: '12px', fontWeight: 700 }}>إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOperations.map(op => (
                                <tr key={op.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{new Date(op.createdAt).toLocaleDateString('ar-SA')}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(op.createdAt).toLocaleTimeString('ar-SA')}</div>
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: 700 }}>{op.workerName}</td>
                                    <td style={{ padding: '12px' }}>{op.serviceType} {op.paymentMethod === 'network' ? '💳' : '💵'}</td>
                                    <td style={{ padding: '12px', color: 'var(--success)', fontWeight: 700 }}>{op.price > 0 ? op.price : '-'}</td>
                                    <td style={{ padding: '12px', color: 'var(--error)', fontWeight: 700 }}>{op.expenseAmount > 0 ? op.expenseAmount : '-'}</td>
                                    <td style={{ padding: '12px' }}>
                                        {op.pendingEditRequest ? (
                                            op.pendingEditRequest.status === 'pending' ? <span style={{ color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>بانتظار العامل</span> :
                                            op.pendingEditRequest.status === 'approved' ? <span style={{ color: 'var(--success)', fontSize: '12px' }}>تم القبول</span> :
                                            <span style={{ color: 'var(--error)', fontSize: '12px' }}>مرفوض</span>
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <button onClick={() => { setEditingOp(op); setEditPrice(op.price.toString()); setEditExpense(op.expenseAmount.toString()); }} style={{ padding: '6px', background: 'transparent', color: 'var(--primary-color)', border: 'none', cursor: 'pointer' }}><Edit2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Proposal Modal */}
            {editingOp && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '24px', width: '90%', maxWidth: '400px' }}>
                        <h3 style={{ margin: '0 0 16px' }}>اقتراح تعديل على ({editingOp.workerName})</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>لا يتم تطبيق التعديل حتى يوافق العامل عليه.</p>
                        
                        <form onSubmit={handleProposeEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>تعديل السعر (الإيراد)</label>
                                <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>تعديل المصروف (الخرج)</label>
                                <input type="number" value={editExpense} onChange={e => setEditExpense(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} />
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>إرسال التعديل</button>
                                <button type="button" onClick={() => setEditingOp(null)} style={{ flex: 1, padding: '12px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkersView;
