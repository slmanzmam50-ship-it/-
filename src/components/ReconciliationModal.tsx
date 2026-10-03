import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { Save, X } from 'lucide-react';
import { saveReconciliation } from '../services/storage';
import type { WorkerOperation } from '../types';

interface Props {
    branchId: string;
    workerId: string;
    workerName: string;
    dateLabel: string;
    operations: WorkerOperation[];
    actualCash: string;
    actualNetwork: string;
    expectedCash: number;
    totalNetwork: number;
    onClose: () => void;
}

const ReconciliationModal: React.FC<Props> = ({ branchId, workerId, workerName, dateLabel, operations, actualCash, actualNetwork, expectedCash, totalNetwork, onClose }) => {
    const tableRef = useRef<HTMLDivElement>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Calculations
    const totalIncome = operations.reduce((sum, op) => sum + (op.isCashLoan ? 0 : (op.price || 0)), 0);
    
    // Split total income into invoice vs no invoice
    const totalWithInvoice = operations.reduce((sum, op) => sum + (op.hasInvoice && !op.isCashLoan ? (op.price || 0) : 0), 0);
    const totalWithoutInvoice = operations.reduce((sum, op) => sum + (!op.hasInvoice && !op.isCashLoan ? (op.price || 0) : 0), 0);
    

    const cashSales = operations.reduce((sum, op) => sum + (op.paymentMethod === 'cash' && !op.isCashLoan ? (op.price || 0) : 0), 0);
    const creditSales = operations.reduce((sum, op) => sum + (op.paymentMethod === 'credit' && op.hasInvoice && !op.isCashLoan ? (op.price || 0) : 0), 0);
    const workerDebt = operations.reduce((sum, op) => sum + (op.paymentMethod === 'credit' && !op.hasInvoice && !op.isCashLoan ? (op.price || 0) : 0), 0);
    const totalCredit = creditSales + workerDebt;

    const expensesList = operations.filter(op => (op.expenseAmount || 0) > 0 || (op.tipAmount || 0) > 0).map(op => {
        let lines = [];
        if ((op.expenseAmount || 0) > 0) lines.push({ reason: op.expenseReason || 'بدون سبب', amount: op.expenseAmount || 0, hasInvoice: op.hasInvoice });
        if ((op.tipAmount || 0) > 0) lines.push({ reason: 'خصم/بخشيش (' + op.serviceType + ')', amount: op.tipAmount || 0, hasInvoice: false });
        return lines;
    }).flat();

    const totalExpenses = expensesList.reduce((sum, exp) => sum + exp.amount, 0);

    const actualC = actualCash === '' ? expectedCash : Number(actualCash);
    const cashDiff = actualC - expectedCash;
    const cashStatus = cashDiff === 0 ? 'matched' : (cashDiff > 0 ? 'excess' : 'shortage');

    const actualN = actualNetwork === '' ? totalNetwork : Number(actualNetwork);
    const networkDiff = actualN - totalNetwork;
    const networkStatus = networkDiff === 0 ? 'matched' : (networkDiff > 0 ? 'excess' : 'shortage');

    const totalDiff = cashDiff + networkDiff;
    const totalStatus = totalDiff === 0 ? 'matched' : (totalDiff > 0 ? 'excess' : 'shortage');

    const handleSaveAndShare = async () => {
        if (!tableRef.current) return;
        setIsSaving(true);
        try {
            await saveReconciliation({
                branchId,
                workerId,
                date: dateLabel,
                salesWithInvoice: totalWithInvoice,
                salesWithoutInvoice: totalWithoutInvoice,
                totalSales: totalIncome,
                totalNetwork: totalNetwork,
                totalCashSales: cashSales,
                totalCredit: totalCredit,
                expensesList,
                totalExpenses,
                expectedCash,
                actualCash: actualC,
                cashDiff,
                cashStatus,
                actualNetwork: actualN,
                networkDiff,
                networkStatus,
                totalDiff,
                status: totalStatus
            });
            toast.success('تم الحفظ في النظام بنجاح');

            const canvas = await html2canvas(tableRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            
            if (blob) {
                const file = new File([blob], 'reconciliation_' + dateLabel + '.png', { type: 'image/png' });
                
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'مطابقة الجرد',
                            text: 'مطابقة الجرد - ' + dateLabel
                        });
                        toast.success('تمت المشاركة بنجاح');
                    } catch (err: any) {
                        if (err.name !== 'AbortError') {
                            downloadImage(canvas, dateLabel);
                        }
                    }
                } else {
                    downloadImage(canvas, dateLabel);
                }
            }
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء الحفظ أو التوليد');
        } finally {
            setIsSaving(false);
        }
    };

    const downloadImage = (canvas: HTMLCanvasElement, dateLabel: string) => {
        const link = document.createElement('a');
        link.download = 'مطابقة_' + dateLabel + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('تم تنزيل الصورة بنجاح');
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'var(--bg-color)', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ padding: '20px', background: 'white', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>معاينة المطابقة للصورة</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="var(--text-secondary)" /></button>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', justifyContent: 'center' }}>
                    <div ref={tableRef} style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '400px', border: '1px solid #e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900, color: '#1e293b' }}>مطابقة الجرد</h2>
                            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>التاريخ: {dateLabel}</div>
                            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>العامل: {workerName}</div>
                        </div>

                        {/* إجمالي المبيعات (الدخل) */}
                        <div style={{ marginBottom: '8px', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '4px' }}>
                            إجمالي الإيرادات (المبيعات)
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '24px' }}>
                            <tbody>
                                <tr style={{ background: '#f8fafc' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>مبيعات (بفاتورة)</td>
                                    <td style={{ padding: '8px 12px', fontWeight: 800, color: '#334155', textAlign: 'left' }}>{totalWithInvoice} ريال</td>
                                </tr>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>خدمات (بدون فاتورة)</td>
                                    <td style={{ padding: '8px 12px', fontWeight: 800, color: '#334155', textAlign: 'left' }}>{totalWithoutInvoice} ريال</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '12px', fontWeight: 900, color: '#0f172a' }}>إجمالي الدخل</td>
                                    <td style={{ padding: '12px', fontWeight: 900, color: '#2563eb', textAlign: 'left' }}>{totalIncome} ريال</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* تفصيل أين ذهبت المبالغ */}
                        <div style={{ marginBottom: '8px', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '4px' }}>
                            تفصيل المبالغ (طرق الدفع والخرج)
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '24px' }}>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>الشبكة</td>
                                    <td style={{ padding: '8px 12px', fontWeight: 800, color: '#0f172a', textAlign: 'left' }}>{totalNetwork} ريال</td>
                                </tr>
                                {totalCredit > 0 && (
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>الآجل والديون</td>
                                        <td style={{ padding: '8px 12px', fontWeight: 800, color: '#0f172a', textAlign: 'left' }}>{totalCredit} ريال</td>
                                    </tr>
                                )}
                                {totalExpenses > 0 && (
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#ef4444' }}>إجمالي الخرج</td>
                                        <td style={{ padding: '8px 12px', fontWeight: 800, color: '#ef4444', textAlign: 'left' }}>{totalExpenses} ريال</td>
                                    </tr>
                                )}
                                
                                {expensesList.length > 0 && (
                                    <>
                                        {expensesList.map((exp, i) => (
                                            <tr key={i} style={{ borderBottom: '1px dashed #e2e8f0', background: '#fef2f2' }}>
                                                <td style={{ padding: '4px 24px 4px 12px', color: '#ef4444', fontSize: '12px' }}>- {exp.reason} {exp.hasInvoice ? '(فاتورة)' : ''}</td>
                                                <td style={{ padding: '4px 12px', color: '#ef4444', textAlign: 'left', fontWeight: 700, fontSize: '12px' }}>{exp.amount} ريال</td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px', fontWeight: 900, color: '#10b981' }}>الكاش المفترض توفره</td>
                                    <td style={{ padding: '12px', fontWeight: 900, color: '#10b981', textAlign: 'left' }}>{expectedCash} ريال</td>
                                </tr>
                                <tr style={{ background: '#f8fafc' }}>
                                    <td style={{ padding: '12px', fontWeight: 900, color: '#0f172a' }}>الإجمالي</td>
                                    <td style={{ padding: '12px', fontWeight: 900, color: '#2563eb', textAlign: 'left' }}>{totalNetwork + totalCredit + totalExpenses + expectedCash} ريال</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* المطابقة الفعلية */}
                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '15px' }}>
                                <span style={{ fontWeight: 800, color: '#334155' }}>الشبكة (مطابقة):</span>
                                <span style={{ fontWeight: 900, color: networkDiff === 0 ? '#10b981' : '#ef4444' }}>
                                    {networkDiff === 0 ? 'مطابق ✅' : (networkDiff > 0 ? 'زيادة (' + networkDiff + ')' : 'عجز (' + Math.abs(networkDiff) + ')')}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                                <span style={{ fontWeight: 800, color: '#334155' }}>الكاش (مطابقة):</span>
                                <span style={{ fontWeight: 900, color: cashDiff === 0 ? '#10b981' : '#ef4444' }}>
                                    {cashDiff === 0 ? 'مطابق ✅' : (cashDiff > 0 ? 'زيادة (' + cashDiff + ')' : 'عجز (' + Math.abs(cashDiff) + ')')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '20px', background: 'white', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
                    <button onClick={handleSaveAndShare} disabled={isSaving} style={{ flex: 1, padding: '14px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        {isSaving ? 'جاري المعالجة...' : <><Save size={20} /> حفظ ومشاركة كصورة</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReconciliationModal;
