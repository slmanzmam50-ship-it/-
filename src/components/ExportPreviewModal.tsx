import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, Download, CheckSquare, Square, Eye } from 'lucide-react';

export interface ColumnDef {
    id: string;
    label: string;
}

interface ExportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    columns: ColumnDef[];
    data: Record<string, any>[];
    onExport: (orderedVisibleColumns: ColumnDef[]) => void;
}

const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({ isOpen, onClose, title, columns, data, onExport }) => {
    const [orderedColumns, setOrderedColumns] = useState<ColumnDef[]>([]);
    const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setOrderedColumns(columns);
            setVisibleColumnIds(new Set(columns.map(c => c.id)));
        }
    }, [isOpen, columns]);

    if (!isOpen) return null;

    const toggleColumn = (id: string) => {
        const newVisible = new Set(visibleColumnIds);
        if (newVisible.has(id)) {
            newVisible.delete(id);
        } else {
            newVisible.add(id);
        }
        setVisibleColumnIds(newVisible);
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const newCols = [...orderedColumns];
            [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
            setOrderedColumns(newCols);
        } else if (direction === 'down' && index < orderedColumns.length - 1) {
            const newCols = [...orderedColumns];
            [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
            setOrderedColumns(newCols);
        }
    };

    const handleExport = () => {
        const finalColumns = orderedColumns.filter(c => visibleColumnIds.has(c.id));
        onExport(finalColumns);
        onClose();
    };

    const previewData = data.slice(0, 5);
    const visibleCols = orderedColumns.filter(c => visibleColumnIds.has(c.id));

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            direction: 'rtl'
        }}>
            <div className="animate-fade-in" style={{
                background: 'var(--surface-color)',
                width: '900px',
                maxWidth: '95vw',
                height: '600px',
                maxHeight: '90vh',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-color)'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                            إعدادات تصدير {title}
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                            قم بترتيب الأعمدة واختيار ما تود تصديره
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    
                    {/* Columns Manager (Right Side) */}
                    <div style={{ width: '300px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--surface-color)' }}>
                        <div style={{ padding: '16px', fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
                            الأعمدة ({visibleColumnIds.size}/{columns.length})
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }} className="custom-scrollbar">
                            {orderedColumns.map((col, idx) => {
                                const isVisible = visibleColumnIds.has(col.id);
                                return (
                                    <div key={col.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px',
                                        background: 'var(--bg-color)',
                                        borderRadius: '12px',
                                        marginBottom: '8px',
                                        border: '1px solid var(--border-color)',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div 
                                            onClick={() => toggleColumn(col.id)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                                        >
                                            <div style={{ color: isVisible ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                                                {isVisible ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 600, color: isVisible ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                {col.label}
                                            </span>
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <button 
                                                onClick={() => moveColumn(idx, 'up')}
                                                disabled={idx === 0}
                                                style={{ background: 'transparent', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? 'rgba(0,0,0,0.1)' : 'var(--text-secondary)', padding: '2px', display: 'flex' }}
                                                title="نقل لأعلى"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                            <button 
                                                onClick={() => moveColumn(idx, 'down')}
                                                disabled={idx === orderedColumns.length - 1}
                                                style={{ background: 'transparent', border: 'none', cursor: idx === orderedColumns.length - 1 ? 'not-allowed' : 'pointer', color: idx === orderedColumns.length - 1 ? 'rgba(0,0,0,0.1)' : 'var(--text-secondary)', padding: '2px', display: 'flex' }}
                                                title="نقل لأسفل"
                                            >
                                                <ArrowDown size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preview Table (Left Side) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
                        <div style={{ padding: '16px', fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Eye size={18} color="var(--primary-color)" /> معاينة مبدئية للإكسل
                        </div>
                        <div style={{ flex: 1, padding: '16px', overflow: 'auto' }} className="custom-scrollbar">
                            <div style={{
                                background: 'var(--surface-color)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                overflow: 'hidden'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            {visibleCols.map(col => (
                                                <th key={col.id} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.length > 0 ? previewData.map((row, rIdx) => (
                                            <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                {visibleCols.map(col => (
                                                    <td key={col.id} style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {row[col.id] || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={visibleCols.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                    لا توجد بيانات للمعاينة
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                يعرض هذا الجدول أول 5 صفوف فقط بغرض المعاينة. سيتم تصدير إجمالي ({data.length}) صفاً.
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px'
                }}>
                    <button 
                        onClick={onClose}
                        style={{ padding: '12px 24px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }}
                    >
                        إلغاء
                    </button>
                    <button 
                        onClick={handleExport}
                        disabled={visibleColumnIds.size === 0}
                        style={{ padding: '12px 32px', borderRadius: '12px', background: '#10b981', border: 'none', color: 'white', fontWeight: 800, cursor: visibleColumnIds.size === 0 ? 'not-allowed' : 'pointer', opacity: visibleColumnIds.size === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                    >
                        <Download size={18} /> بدء التصدير
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportPreviewModal;
