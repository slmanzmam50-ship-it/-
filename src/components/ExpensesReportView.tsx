import React, { useState, useEffect } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import type { WorkerOperation, Branch } from '../types';
import { subscribeToWorkerOperations, subscribeToBranches } from '../services/storage';
import * as XLSX from 'xlsx';

const ExpensesReportView: React.FC = () => {
    const [operations, setOperations] = useState<WorkerOperation[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    
    // Filters
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('today');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [branchFilter, setBranchFilter] = useState('all');

    useEffect(() => {
        const unsubBranches = subscribeToBranches(setBranches);
        return () => {
            unsubBranches();
        };
    }, []);

    useEffect(() => {
        let startTime: number | undefined;
        let endTime: number | undefined;
        const now = new Date();
        
        if (dateFilter === 'today') {
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            endTime = startTime + 86400000 - 1;
        } else if (dateFilter === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            startTime = new Date(now.getFullYear(), now.getMonth(), diff).getTime();
            endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + 86400000 - 1;
        } else if (dateFilter === 'month') {
            startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            endTime = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime() + 86400000 - 1;
        } else if (dateFilter === 'year') {
            startTime = new Date(now.getFullYear(), 0, 1).getTime();
            endTime = new Date(now.getFullYear(), 11, 31).getTime() + 86400000 - 1;
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
            startTime = new Date(customStartDate).getTime();
            endTime = new Date(customEndDate).getTime() + 86400000 - 1;
        }

        if (dateFilter === 'custom' && (!customStartDate || !customEndDate)) {
            setOperations([]);
            return;
        }

        const unsub = subscribeToWorkerOperations({ startTime, endTime }, setOperations);
        return () => unsub();
    }, [dateFilter, customStartDate, customEndDate]);

    // Filter only expenses
    const expenses = operations.filter(op => op.expenseAmount > 0 && (branchFilter === 'all' || op.branchId === branchFilter));
    const totalExpenses = expenses.reduce((sum, op) => sum + op.expenseAmount, 0);

    const handleExportExcel = () => {
        if (expenses.length === 0) return;
        const data = expenses.map(op => ({
            'التاريخ': new Date(op.createdAt).toLocaleDateString('ar-SA'),
            'الوقت': new Date(op.createdAt).toLocaleTimeString('ar-SA'),
            'الموظف': op.workerName,
            'الفرع': branches.find(b => b.id === op.branchId)?.name || 'غير معروف',
            'مبلغ الخرج': op.expenseAmount,
            'السبب / التفاصيل': op.expenseReason || 'بدون تفاصيل'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!dir'] = 'rtl';
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "المصروفات");
        XLSX.writeFile(wb, `كشف_المصروفات_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header & Filters */}
            <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={24} className="text-error" /> كشف المصروفات والخرج
                    </h2>
                    
                    <button onClick={handleExportExcel} disabled={expenses.length === 0} style={{ padding: '10px 16px', background: expenses.length > 0 ? 'var(--success)' : 'var(--bg-color)', color: expenses.length > 0 ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, cursor: expenses.length > 0 ? 'pointer' : 'not-allowed' }}>
                        <Download size={18} /> تصدير إكسل
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>الفترة الزمنية</label>
                        <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', outline: 'none' }}>
                            <option value="today">اليوم</option>
                            <option value="week">هذا الأسبوع</option>
                            <option value="month">هذا الشهر</option>
                            <option value="year">هذه السنة</option>
                            <option value="custom">تحديد فترة مخصصة</option>
                        </select>
                    </div>

                    {dateFilter === 'custom' && (
                        <>
                            <div style={{ flex: '1 1 150px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>من تاريخ</label>
                                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', outline: 'none' }} />
                            </div>
                            <div style={{ flex: '1 1 150px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>إلى تاريخ</label>
                                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', outline: 'none' }} />
                            </div>
                        </>
                    )}

                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>الفرع</label>
                        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', outline: 'none' }}>
                            <option value="all">جميع الفروع</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="glass" style={{ padding: '24px', borderRadius: '16px', background: 'white', border: '1px solid rgba(239, 68, 68, 0.2)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'var(--error)' }} />
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '8px' }}>إجمالي المصروفات</div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--error)' }}>{totalExpenses} <span style={{ fontSize: '16px' }}>ريال</span></div>
                </div>
                <div className="glass" style={{ padding: '24px', borderRadius: '16px', background: 'white', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '8px' }}>عدد العمليات (الخرج)</div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)' }}>{expenses.length}</div>
                </div>
            </div>

            {/* Table */}
            <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'white', border: '1px solid var(--border-color)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-color)', borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>التاريخ والوقت</th>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>الفرع</th>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>الموظف</th>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>المبلغ</th>
                                <th style={{ padding: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>السبب / التفاصيل</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.length > 0 ? expenses.map(op => (
                                <tr key={op.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: 700 }}>{new Date(op.createdAt).toLocaleDateString('ar-SA')}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(op.createdAt).toLocaleTimeString('ar-SA')}</div>
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: 600 }}>{branches.find(b => b.id === op.branchId)?.name || 'غير معروف'}</td>
                                    <td style={{ padding: '16px', fontWeight: 600 }}>{op.workerName}</td>
                                    <td style={{ padding: '16px', fontWeight: 800, color: 'var(--error)' }}>{op.expenseAmount} ريال</td>
                                    <td style={{ padding: '16px' }}>{op.expenseReason || <span style={{ color: 'var(--text-secondary)' }}>لا يوجد تفاصيل</span>}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>لا توجد مصروفات في هذه الفترة</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExpensesReportView;
