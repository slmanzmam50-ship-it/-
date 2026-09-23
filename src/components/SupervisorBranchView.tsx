import React, { useState, useEffect } from 'react';
import { Activity, Download, Share2 } from 'lucide-react';
import type { WorkerOperation, Worker } from '../types';
import { subscribeToWorkerOperations, subscribeToWorkers } from '../services/storage';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface Props {
    branchId: string;
}

const SupervisorBranchView: React.FC<Props> = ({ branchId }) => {
    const [operations, setOperations] = useState<WorkerOperation[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    
    const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
    const [customDate, setCustomDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'network' | 'credit'>('all');
    const [workerFilter, setWorkerFilter] = useState<string>('all');

    useEffect(() => {
        const unsub = subscribeToWorkers(allWorkers => {
            setWorkers(allWorkers.filter(w => w.branchId === branchId));
        });
        return () => unsub();
    }, [branchId]);

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

        const unsub = subscribeToWorkerOperations({ startTime, endTime, branchId }, setOperations);
        return () => unsub();
    }, [dateFilter, customDate, branchId]);

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const data = filteredOperations.map(op => ({
            'التاريخ': new Date(op.createdAt).toLocaleDateString('ar-SA'),
            'الوقت': new Date(op.createdAt).toLocaleTimeString('ar-SA'),
            'العامل': op.workerName,
            'الخدمة': op.serviceType,
            'الإيراد': op.price || 0,
            'الخرج': op.expenseAmount || 0,
            'السبب (للخرج)': op.expenseReason || '-',
            'طريقة الدفع': op.paymentMethod === 'cash' ? 'كاش' : (op.paymentMethod === 'credit' ? 'آجل' : 'شبكة'),
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'العمليات');
        XLSX.writeFile(wb, `عمليات_الفرع_${new Date().toLocaleDateString()}.xlsx`);
        toast.success('تم تصدير الإكسل بنجاح');
    };

    const filteredOperations = operations.filter(op => {
        if (workerFilter !== 'all' && op.workerId !== workerFilter) return false;
        if (paymentFilter !== 'all' && op.paymentMethod !== paymentFilter) return false;
        return true;
    });

    const totalIncome = filteredOperations.reduce((sum, op) => sum + (op.price || 0), 0);
    const totalExpenses = filteredOperations.reduce((sum, op) => sum + (op.expenseAmount || 0), 0);
    const totalNetwork = filteredOperations.reduce((sum, op) => sum + (op.paymentMethod === 'network' ? (op.price || 0) : 0), 0);
    const totalCredit = filteredOperations.reduce((sum, op) => sum + (op.paymentMethod === 'credit' ? (op.price || 0) : 0), 0);
    const expectedCash = totalIncome - totalNetwork - totalCredit - totalExpenses;

    const handleShareBalance = () => {
        let dateLabel = dateFilter === 'today' ? 'اليوم' : dateFilter === 'yesterday' ? 'الأمس' : dateFilter === 'custom' ? customDate : 'الفترة المحددة';
        let workerLabel = workerFilter === 'all' ? 'جميع العمال' : workers.find(w => w.id === workerFilter)?.name || '';
        
        const shareText = `📊 جرد الفرع (${dateLabel})\n👤 العامل: ${workerLabel}\n\n💰 إجمالي المبيعات: ${totalIncome} ريال\n💳 شبكة: ${totalNetwork} ريال\n📝 آجل: ${totalCredit} ريال\n📉 خرج: ${totalExpenses} ريال\n-----------------------\n✅ الكاش المفترض بالدرج: *${expectedCash} ريال*`;
        const encodedText = encodeURIComponent(shareText);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 800 }}>
                        <Activity size={20} className="text-primary" /> جرد ومتابعة الفرع
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <select value={workerFilter} onChange={e => setWorkerFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                            <option value="all">كل العمال بالفرع</option>
                            {workers.map(w => <option key={w.id} value={w.id}>{w.name} {!w.isActive && '(مؤرشف)'}</option>)}
                        </select>
                        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                            <option value="all">الكل</option>
                            <option value="cash">كاش فقط</option>
                            <option value="network">شبكة فقط</option>
                            <option value="credit">آجل فقط</option>
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
                <div style={{ background: 'rgba(59,130,246,0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.1)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-color)' }}>الموازنة اليومية للفرع</h4>
                        <button onClick={handleShareBalance} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                            <Share2 size={16} /> مشاركة الجرد
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        
                        <div style={{ background: 'rgba(59,130,246,0.1)', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{ color: 'var(--primary-color)', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>إجمالي الإيرادات (المبيعات)</div>
                            <div style={{ fontSize: '24px', fontWeight: 900 }}>{totalIncome} <span style={{ fontSize: '14px', fontWeight: 400 }}>ريال</span></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                                <span>الشبكة:</span>
                                <span style={{ color: 'var(--primary-color)' }}>{totalNetwork} ريال</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                                <span>الآجل:</span>
                                <span style={{ color: 'var(--accent-orange)' }}>{totalCredit} ريال</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                                <span>إجمالي الخرج:</span>
                                <span style={{ color: 'var(--error)' }}>{totalExpenses} ريال</span>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(16,185,129,0.1)', padding: '1rem', borderRadius: '12px', border: '2px solid rgba(16,185,129,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 800, marginBottom: '4px' }}>الكاش المفترض في الدرج</div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--success)' }}>{expectedCash} <span style={{ fontSize: '14px', fontWeight: 700 }}>ريال</span></div>
                        </div>

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
                                    <td style={{ padding: '12px' }}>{op.serviceType} {op.paymentMethod === 'network' ? '💳 (شبكة)' : (op.paymentMethod === 'credit' ? '📝 (آجل)' : '💵 (كاش)')}</td>
                                    <td style={{ padding: '12px', color: 'var(--success)', fontWeight: 700 }}>{(op.price || 0) > 0 ? op.price : '-'}</td>
                                    <td style={{ padding: '12px', color: 'var(--error)', fontWeight: 700 }}>{(op.expenseAmount || 0) > 0 ? op.expenseAmount : '-'}</td>
                                </tr>
                            ))}
                            {filteredOperations.length === 0 && <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>لا توجد عمليات لهذه الفترة</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SupervisorBranchView;
