import React, { useState, useEffect } from 'react';
import { Activity, Download, Share2 } from 'lucide-react';
import type { WorkerOperation, Worker } from '../types';
import { subscribeToWorkerOperations, subscribeToWorkers } from '../services/storage';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import SafeView from './SafeView';

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
    const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'with_invoice' | 'without_invoice'>('all');
    const [actualCash, setActualCash] = useState<string>('');
    const [actualNetwork, setActualNetwork] = useState<string>('');

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
    const totalCashSales = filteredOperations.reduce((sum, op) => sum + (op.paymentMethod === 'cash' && !op.isCashLoan ? (op.price || 0) : 0), 0);
    const expectedCash = totalIncome - totalNetwork - totalCredit - totalWorkerDebt - totalExpenses;

    const handleShareBalance = () => {
        let dateStr = '';
        if (dateFilter === 'today') {
            dateStr = new Date().toLocaleDateString('en-GB');
        } else if (dateFilter === 'yesterday') {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            dateStr = y.toLocaleDateString('en-GB');
        } else if (dateFilter === 'custom') {
            dateStr = customDate;
        }

        let dateLabel = dateFilter === 'today' ? `اليوم (${dateStr})` : dateFilter === 'yesterday' ? `الأمس (${dateStr})` : dateFilter === 'custom' ? customDate : 'الفترة المحددة';
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

        const actualNet = Number(actualNetwork) || 0;
        const netDiff = actualNet - totalNetwork;
        const netDiffText = actualNetwork === '' ? 'لم يتم إدخاله' : (netDiff === 0 ? 'مطابق ✅' : (netDiff < 0 ? `عجز (${Math.abs(netDiff)} ريال) ❌` : `زيادة (${netDiff} ريال) ⚠️`));

        const totalDiff = diff + netDiff;
        const totalDiffText = (actualCash === '' || actualNetwork === '') ? 'يرجى إدخال الجرد الفعلي' : 
            (totalDiff === 0 ? 'مطابق تماماً ✅ (لا يوجد فقدان أموال)' : 
            (totalDiff < 0 ? `عجز إجمالي (${Math.abs(totalDiff)} ريال) ❌` : `زيادة إجمالية (${totalDiff} ريال) ⚠️`));

        const shareText = `📊 جرد الفرع (${dateLabel})\n👤 العامل: ${workerLabel}\n\n💰 إجمالي المبيعات: ${totalIncome} ريال\n💵 مبيعات الكاش (قبل الخصم): ${totalCashSales} ريال\n💳 مبيعات الشبكة: ${totalNetwork} ريال\n📝 آجل (بفاتورة): ${totalCredit} ريال\n⚠️ ديون عمال: ${totalWorkerDebt} ريال\n📉 إجمالي الخصم/الخرج: ${totalExpenses} ريال${expensesDetails}\n-----------------------\n💳 مبيعات الشبكة المسجلة: *${totalNetwork} ريال*\n💳 الشبكة الفعلية: *${actualNetwork === '' ? '؟' : actualNet} ريال*\n⚖️ فارق الشبكة: *${netDiffText}*\n-----------------------\n✅ الكاش المفترض بالدرج: *${expectedCash} ريال*\n💵 الكاش الفعلي المتوفر: *${actualCash === '' ? '؟' : actual} ريال*\n⚖️ فارق الكاش: *${diffText}*\n-----------------------\n🎯 نتيجة المطابقة الذكية:\n*${totalDiffText}*`;
        const encodedText = encodeURIComponent(shareText);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
            <div className="glass" style={{ padding: '1rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 800 }}>
                        <Activity size={20} className="text-primary" /> جرد ومتابعة الفرع
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <select value={workerFilter} onChange={e => setWorkerFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                            <option value="all">كل العمال بالفرع</option>
                            {workers.map(w => <option key={w.id} value={w.id}>{w.name} {!w.isActive && '(مؤرشف)'}</option>)}
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
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-color)' }}>الموازنة اليومية للفرع</h4>
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
                                <span title="إجمالي المبيعات النقدية قبل خصم أي خارج أو بخشيش">الكاش (قبل خصم الخرج):</span>
                                <span style={{ color: 'var(--success)' }}>{totalCashSales} ريال</span>
                            </div>
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
                                    {(Number(actualCash) - expectedCash) === 0 ? '✅ الكاش مطابق' : (Number(actualCash) - expectedCash) < 0 ? `❌ عجز: ${Math.abs(Number(actualCash) - expectedCash)} ريال` : `⚠️ زيادة: ${Number(actualCash) - expectedCash} ريال`}
                                </div>
                            )}
                        </div>

                        <div className="balance-card" style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div className="balance-title" style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>أدخل الشبكة الفعلية للمطابقة</div>
                            <input 
                                type="number" 
                                placeholder="الشبكة الفعلية..."
                                value={actualNetwork}
                                onChange={e => setActualNetwork(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '16px', fontWeight: 800 }}
                            />
                            {actualNetwork !== '' && (
                                <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 800, color: (Number(actualNetwork) - totalNetwork) === 0 ? 'var(--success)' : (Number(actualNetwork) - totalNetwork) < 0 ? 'var(--error)' : 'var(--accent-orange)' }}>
                                    {(Number(actualNetwork) - totalNetwork) === 0 ? '✅ الشبكة مطابقة' : (Number(actualNetwork) - totalNetwork) < 0 ? `❌ عجز: ${Math.abs(Number(actualNetwork) - totalNetwork)} ريال` : `⚠️ زيادة: ${Number(actualNetwork) - totalNetwork} ريال`}
                                </div>
                            )}
                        </div>

                        {(actualCash !== '' && actualNetwork !== '') && (() => {
                            const diffValue = (Number(actualCash) - expectedCash) + (Number(actualNetwork) - totalNetwork);
                            return (
                                <div className="balance-card" style={{ background: diffValue === 0 ? 'rgba(16,185,129,0.1)' : (diffValue < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)'), padding: '1rem', borderRadius: '12px', border: '2px solid', borderColor: diffValue === 0 ? 'var(--success)' : (diffValue < 0 ? 'var(--error)' : 'var(--accent-orange)'), display: 'flex', flexDirection: 'column', justifyContent: 'center', gridColumn: '1 / -1' }}>
                                    <div style={{ color: diffValue === 0 ? 'var(--success)' : (diffValue < 0 ? 'var(--error)' : 'var(--accent-orange)'), fontSize: '13px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        🎯 النتيجة النهائية للمطابقة (التقييم الذكي)
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: diffValue === 0 ? 'var(--success)' : (diffValue < 0 ? 'var(--error)' : 'var(--accent-orange)') }}>
                                        {diffValue === 0 ? '✅ مطابق تماماً (العمال أخطأوا في تحديد طريقة الدفع فقط، ولا يوجد فقدان أموال)' : (diffValue < 0 ? `❌ يوجد عجز مالي حقيقي بـ (${Math.abs(diffValue)} ريال)` : `⚠️ توجد زيادة مالية حقيقية بـ (${diffValue} ريال)`)}
                                    </div>
                                </div>
                            );
                        })()}

                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '10px', fontWeight: 700 }}>التاريخ</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>العامل</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>الخدمة</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>الإيراد</th>
                                <th style={{ padding: '10px', fontWeight: 700 }}>الخرج</th>
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
                                    <td style={{ padding: '10px', color: (op.price || 0) < 0 ? 'var(--error)' : 'var(--success)', fontWeight: 700 }}>{(op.price || 0) !== 0 ? op.price : '-'}</td>
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
                                </tr>
                            ))}
                            {filteredOperations.length === 0 && <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>لا توجد عمليات لهذه الفترة</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Safe / Treasury section */}
            <div style={{ marginTop: '24px' }}>
                <SafeView branchId={branchId} role="supervisor" branches={[]} />
            </div>
        </div>
    );
};

export default SupervisorBranchView;
