import React, { useState, useEffect } from 'react';
import { subscribeToSafeTransactions, addSafeTransaction, deleteSafeTransaction } from '../services/storage';
import type { SafeTransaction, Branch } from '../types';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
    branchId?: string;
    role: 'admin' | 'supervisor';
    branches: Branch[];
}

const SafeView: React.FC<Props> = ({ branchId, role, branches }) => {
    const [transactions, setTransactions] = useState<SafeTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [filterBranch, setFilterBranch] = useState<string>(branchId || 'all');
    const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'all'>('today');

    // Add Form
    const [isAdding, setIsAdding] = useState(false);
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState(branchId || '');

    useEffect(() => {
        setIsLoading(true);
        const unsub = subscribeToSafeTransactions(role === 'supervisor' ? branchId : undefined, (data) => {
            setTransactions(data);
            setIsLoading(false);
        });
        return () => unsub();
    }, [branchId, role]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const bId = role === 'supervisor' ? branchId : selectedBranchId;
        if (!amount || !description || !bId) {
            toast.error('يرجى تعبئة جميع الحقول');
            return;
        }

        try {
            await addSafeTransaction({
                branchId: bId,
                type,
                amount: Number(amount),
                description,
                addedBy: role
            });
            toast.success('تمت الإضافة بنجاح');
            setIsAdding(false);
            setAmount('');
            setDescription('');
        } catch (e) {
            toast.error('حدث خطأ أثناء الإضافة');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من الحذف؟')) {
            await deleteSafeTransaction(id);
            toast.success('تم الحذف');
        }
    };

    // Filter transactions
    const filteredTxs = transactions.filter(tx => {
        if (role === 'admin' && filterBranch !== 'all' && tx.branchId !== filterBranch) return false;
        
        const txDate = new Date(tx.createdAt);
        const now = new Date();
        
        if (dateFilter === 'today') {
            return txDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'month') {
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        }
        return true;
    });

    const totalIncome = filteredTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filteredTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header & Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 800 }}>
                    <Wallet size={24} className="text-primary" /> صندوق الفرع (الخزينة)
                </h2>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {role === 'admin' && (
                        <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                            <option value="all">كل الفروع</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}
                    <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                        <option value="today">اليوم</option>
                        <option value="month">الشهر الحالي</option>
                        <option value="all">كل الأوقات</option>
                    </select>
                    <button onClick={() => setIsAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-color)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                        <Plus size={18} /> إضافة عملية للصندوق
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="glass" style={{ padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 700 }}>صافي الصندوق</span>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: netBalance >= 0 ? 'var(--success)' : 'var(--error)' }}>{netBalance} ريال</span>
                </div>
                <div className="glass" style={{ padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 700 }}>إجمالي الوارد (الدخل)</span>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={20} /> {totalIncome} ريال</span>
                </div>
                <div className="glass" style={{ padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 700 }}>إجمالي الصادر (الخرج/السحبيات)</span>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingDown size={20} /> {totalExpense} ريال</span>
                </div>
            </div>

            {/* Chart for Admin */}
            {role === 'admin' && (
                <div className="glass" style={{ padding: '20px', borderRadius: '16px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={18} /> ملخص حركات الصندوق</h3>
                    <div style={{ display: 'flex', height: '200px', alignItems: 'flex-end', gap: '12px', marginTop: '20px' }}>
                        {/* A simple CSS bar chart */}
                        <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px 8px 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
                            <div style={{ background: 'var(--success)', height: `${Math.min(100, (totalIncome / (totalIncome + totalExpense || 1)) * 100)}%`, borderRadius: '8px 8px 0 0', transition: '1s' }}></div>
                            <span style={{ position: 'absolute', bottom: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', fontWeight: 700 }}>الوارد</span>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px 8px 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
                            <div style={{ background: 'var(--error)', height: `${Math.min(100, (totalExpense / (totalIncome + totalExpense || 1)) * 100)}%`, borderRadius: '8px 8px 0 0', transition: '1s' }}></div>
                            <span style={{ position: 'absolute', bottom: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', fontWeight: 700 }}>الصادر</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {isAdding && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass animate-scale-up" style={{ padding: '24px', borderRadius: '20px', width: '90%', maxWidth: '400px', background: 'var(--surface-color)' }}>
                        <h3 style={{ margin: '0 0 16px', fontWeight: 800 }}>تسجيل حركة في الصندوق</h3>
                        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {role === 'admin' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>الفرع</label>
                                    <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                        <option value="">-- اختر الفرع --</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>نوع العملية</label>
                                <select value={type} onChange={e => setType(e.target.value as 'income'|'expense')} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', background: type === 'income' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: type === 'income' ? 'var(--success)' : 'var(--error)', fontWeight: 700 }}>
                                    <option value="income">وارد (دخل اليوم / إيداع)</option>
                                    <option value="expense">صادر (سداد / سلفية / مسحوبات)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>المبلغ</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} placeholder="0.00" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '14px' }}>البيان (الوصف)</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} placeholder="مثال: إيراد يوم الخميس / سداد ديون مناديب" />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>تسجيل</button>
                                <button type="button" onClick={() => setIsAdding(false)} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transactions Table */}
            <div className="glass" style={{ overflow: 'auto', borderRadius: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '12px', fontWeight: 800, fontSize: '14px' }}>التاريخ</th>
                            {role === 'admin' && <th style={{ padding: '12px', fontWeight: 800, fontSize: '14px' }}>الفرع</th>}
                            <th style={{ padding: '12px', fontWeight: 800, fontSize: '14px' }}>النوع</th>
                            <th style={{ padding: '12px', fontWeight: 800, fontSize: '14px' }}>البيان</th>
                            <th style={{ padding: '12px', fontWeight: 800, fontSize: '14px' }}>المبلغ</th>
                            <th style={{ padding: '12px', fontWeight: 800, fontSize: '14px' }}>إجراء</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>جاري التحميل...</td></tr>
                        ) : filteredTxs.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>لا توجد حركات مسجلة</td></tr>
                        ) : (
                            filteredTxs.map(tx => (
                                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px', fontSize: '13.5px' }}>{new Date(tx.createdAt).toLocaleDateString('ar-SA')} <br/> <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(tx.createdAt).toLocaleTimeString('ar-SA')}</span></td>
                                    {role === 'admin' && <td style={{ padding: '12px', fontSize: '13.5px', fontWeight: 700 }}>{branches.find(b => b.id === tx.branchId)?.name || 'غير معروف'}</td>}
                                    <td style={{ padding: '12px', fontSize: '13.5px' }}>
                                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: tx.type === 'income' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: tx.type === 'income' ? 'var(--success)' : 'var(--error)' }}>
                                            {tx.type === 'income' ? 'وارد' : 'صادر'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '13.5px', fontWeight: 700 }}>{tx.description}</td>
                                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 800, color: tx.type === 'income' ? 'var(--success)' : 'var(--error)' }}>
                                        {tx.type === 'income' ? '+' : '-'}{tx.amount}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {(role === 'admin' || tx.addedBy === 'supervisor') && (
                                            <button onClick={() => handleDelete(tx.id)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '6px' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SafeView;
