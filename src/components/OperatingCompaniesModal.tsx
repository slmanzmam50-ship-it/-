import React, { useState, useEffect } from 'react';
import { X as CloseIcon, Plus, Building2, Trash2, X } from 'lucide-react';
import type { Branch, OperatingCompany } from '../types';
import { subscribeToOperatingCompanies, addOperatingCompany, updateOperatingCompany, deleteOperatingCompany } from '../services/storage';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    branches: Branch[];
    onAddNewBranch: (companyId: string) => void;
}

const OperatingCompaniesModal: React.FC<Props> = ({ isOpen, onClose, branches, onAddNewBranch }) => {
    const [companies, setCompanies] = useState<OperatingCompany[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [branchesToAdd, setBranchesToAdd] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToOperatingCompanies(setCompanies);
        return () => unsubscribe();
    }, [isOpen]);

    if (!isOpen) return null;

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    const handleAddCompany = async () => {
        if (!newCompanyName.trim()) return;
        try {
            await addOperatingCompany({ name: newCompanyName.trim(), branchIds: [] });
            setNewCompanyName('');
            toast.success('تمت إضافة الشركة بنجاح');
        } catch (e) {
            console.error(e);
            toast.error('حدث خطأ أثناء إضافة الشركة');
        }
    };

    const handleDeleteCompany = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('هل أنت متأكد من حذف هذه الشركة التشغيلية؟ لن يتم حذف الفروع بل سيتم إزالة ارتباطها فقط.')) {
            try {
                await deleteOperatingCompany(id);
                if (selectedCompanyId === id) setSelectedCompanyId(null);
                toast.success('تم الحذف بنجاح');
            } catch (error) {
                toast.error('حدث خطأ أثناء الحذف');
            }
        }
    };

    const handleAddBranchesToCompany = async () => {
        if (!selectedCompany || branchesToAdd.length === 0) return;

        try {
            await updateOperatingCompany({
                ...selectedCompany,
                branchIds: [...(selectedCompany.branchIds || []), ...branchesToAdd]
            });
            setBranchesToAdd([]);
            toast.success('تم ربط الفروع بالشركة بنجاح');
        } catch (e) {
            toast.error('حدث خطأ أثناء الربط');
        }
    };

    const handleRemoveBranchFromCompany = async (branchId: string) => {
        if (!selectedCompany) return;
        if (window.confirm('هل أنت متأكد من إزالة هذا الفرع من الشركة؟ لن يتم حذفه من النظام الكلي.')) {
            try {
                await updateOperatingCompany({
                    ...selectedCompany,
                    branchIds: (selectedCompany.branchIds || []).filter(id => id !== branchId)
                });
                toast.success('تم إزالة الفرع من الشركة');
            } catch (e) {
                toast.error('حدث خطأ أثناء الإزالة');
            }
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
        }}>
            <div className="glass animate-scale-up" style={{
                background: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '800px',
                height: '80vh',
                display: 'flex',
                flexDirection: 'row',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                direction: 'rtl'
            }}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                >
                    <CloseIcon size={18} />
                </button>

                {/* Sidebar */}
                <div style={{
                    width: '300px',
                    borderLeft: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '24px 20px',
                    paddingTop: '64px'
                }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={20} color="var(--primary-color)" />
                        الشركات التشغيلية
                    </h3>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        <input 
                            type="text" 
                            placeholder="اسم الشركة الجديدة..." 
                            value={newCompanyName}
                            onChange={e => setNewCompanyName(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            onKeyDown={e => e.key === 'Enter' && handleAddCompany()}
                        />
                        <button 
                            onClick={handleAddCompany}
                            disabled={!newCompanyName.trim()}
                            style={{
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0 12px',
                                cursor: newCompanyName.trim() ? 'pointer' : 'not-allowed',
                                opacity: newCompanyName.trim() ? 1 : 0.5
                            }}
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {companies.map(comp => (
                            <div 
                                key={comp.id}
                                onClick={() => setSelectedCompanyId(comp.id)}
                                style={{
                                    padding: '12px',
                                    borderRadius: '10px',
                                    background: selectedCompanyId === comp.id ? 'var(--primary-color)' : 'var(--bg-color)',
                                    color: selectedCompanyId === comp.id ? 'white' : 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontWeight: 600, fontSize: '14px' }}>{comp.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', opacity: 0.8 }}>({comp.branchIds?.length || 0})</span>
                                    <Trash2 
                                        size={16} 
                                        color={selectedCompanyId === comp.id ? 'rgba(255,255,255,0.8)' : 'var(--error)'} 
                                        onClick={(e) => handleDeleteCompany(comp.id, e)}
                                    />
                                </div>
                            </div>
                        ))}
                        {companies.length === 0 && (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', marginTop: '20px' }}>
                                لا توجد شركات حالياً
                            </p>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, padding: '24px', paddingTop: '64px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    {selectedCompany ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 800 }}>{selectedCompany.name}</h2>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        إدارة الفروع التابعة لهذه الشركة
                                    </p>
                                </div>
                                <button 
                                    onClick={() => onAddNewBranch(selectedCompany.id)}
                                    style={{
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Plus size={16} />
                                    إنشاء فرع جديد
                                </button>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>ربط فروع موجودة</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        background: 'var(--surface-color)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}>
                                        {branches.filter(b => !(selectedCompany.branchIds || []).includes(b.id)).map(b => (
                                            <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', borderRadius: '6px', background: branchesToAdd.includes(b.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={branchesToAdd.includes(b.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setBranchesToAdd([...branchesToAdd, b.id]);
                                                        else setBranchesToAdd(branchesToAdd.filter(id => id !== b.id));
                                                    }}
                                                />
                                                <span style={{ fontSize: '14px' }}>{b.name} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>- {b.address}</span></span>
                                            </label>
                                        ))}
                                        {branches.filter(b => !(selectedCompany.branchIds || []).includes(b.id)).length === 0 && (
                                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', padding: '8px', textAlign: 'center' }}>لا توجد فروع متاحة للربط</span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={handleAddBranchesToCompany}
                                        disabled={branchesToAdd.length === 0}
                                        style={{
                                            background: 'var(--success)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '10px 16px',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            cursor: branchesToAdd.length > 0 ? 'pointer' : 'not-allowed',
                                            opacity: branchesToAdd.length > 0 ? 1 : 0.5,
                                            alignSelf: 'flex-start'
                                        }}
                                    >
                                        ربط الفروع المحددة ({branchesToAdd.length})
                                    </button>
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>الفروع المرتبطة حالياً ({selectedCompany.branchIds?.length || 0})</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                    {selectedCompany.branchIds?.map(bId => {
                                        const branch = branches.find(b => b.id === bId);
                                        if (!branch) return null;
                                        return (
                                            <div key={branch.id} style={{
                                                padding: '16px',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-color)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{branch.name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{branch.address}</div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveBranchFromCompany(branch.id)}
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        color: 'var(--error)',
                                                        border: 'none',
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="إزالة الفرع من الشركة"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {(!selectedCompany.branchIds || selectedCompany.branchIds.length === 0) && (
                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                            لا توجد فروع مرتبطة بهذه الشركة
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-secondary)' }}>
                            <Building2 size={64} style={{ opacity: 0.2, marginBottom: '16px' }} />
                            <p>اختر شركة تشغيلية من القائمة للبدء أو قم بإنشاء واحدة جديدة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OperatingCompaniesModal;
