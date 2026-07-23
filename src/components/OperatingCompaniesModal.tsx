import React, { useState, useEffect } from 'react';
import { X as CloseIcon, Plus, Building2, Trash2, X, FileText, FileSpreadsheet } from 'lucide-react';
import type { Branch, OperatingCompany } from '../types';
import { subscribeToOperatingCompanies, addOperatingCompany, updateOperatingCompany, deleteOperatingCompany } from '../services/storage';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

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

    const [activeTab, setActiveTab] = useState<'linked' | 'available'>('linked');
    const [branchSearch, setBranchSearch] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToOperatingCompanies(setCompanies);
        return () => unsubscribe();
    }, [isOpen]);

    useEffect(() => {
        if (selectedCompanyId) {
            setActiveTab('linked');
            setBranchesToAdd([]);
            setBranchSearch('');
        }
    }, [selectedCompanyId]);

    if (!isOpen) return null;

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    
    // Filter available branches for selection
    const availableBranches = branches.filter(b => !(selectedCompany?.branchIds || []).includes(b.id));
    const filteredAvailableBranches = availableBranches.filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()) || b.address.toLowerCase().includes(branchSearch.toLowerCase()));

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
            setActiveTab('linked');
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

    const handleExportExcel = () => {
        if (!selectedCompany || !selectedCompany.branchIds) {
            toast.error('لا توجد فروع لتصديرها');
            return;
        }
        
        const companyBranches = selectedCompany.branchIds.map(id => branches.find(b => b.id === id)).filter(Boolean) as Branch[];
        if (companyBranches.length === 0) {
            toast.error('لا توجد فروع لتصديرها');
            return;
        }

        const data = companyBranches.map((b, index) => ({
            'م': index + 1,
            'اسم الفرع': b.name,
            'العنوان': b.address
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!dir'] = 'rtl';
        ws['!cols'] = [{wch: 5}, {wch: 40}, {wch: 60}];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "الفروع");
        
        XLSX.writeFile(wb, `فروع_${selectedCompany.name}.xlsx`);
        toast.success('تم تصدير ملف إكسل بنجاح');
    };

    const handleExportWord = () => {
        if (!selectedCompany || !selectedCompany.branchIds) {
            toast.error('لا توجد فروع لتصديرها');
            return;
        }
        
        const companyBranches = selectedCompany.branchIds.map(id => branches.find(b => b.id === id)).filter(Boolean) as Branch[];
        if (companyBranches.length === 0) {
            toast.error('لا توجد فروع لتصديرها');
            return;
        }

        const htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset="utf-8">
                <title>فروع ${selectedCompany.name}</title>
                <style>
                    body { font-family: 'Arial', sans-serif; direction: rtl; }
                    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                    th, td { border: 1px solid #000; padding: 10px; text-align: right; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    h1 { color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1>قائمة الفروع التابعة لشركة: ${selectedCompany.name}</h1>
                <p>إجمالي عدد الفروع: <strong>${companyBranches.length}</strong></p>
                <table>
                    <tr>
                        <th>م</th>
                        <th>اسم الفرع</th>
                        <th>العنوان</th>
                    </tr>
                    ${companyBranches.map((b, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${b.name}</td>
                            <td>${b.address}</td>
                        </tr>
                    `).join('')}
                </table>
                <div class="footer">تم التصدير من نظام إدارة الفروع</div>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', htmlContent], {
            type: 'application/msword'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `فروع_${selectedCompany.name}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('تم تصدير ملف وورد بنجاح');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px' // small padding so it doesn't touch the absolute edges on huge monitors
        }}>
            <div className="glass animate-scale-up" style={{
                background: 'var(--surface-color)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '1800px', // extremely wide max width
                height: 'calc(100vh - 32px)', // Almost full height
                display: 'flex',
                flexDirection: 'row',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                direction: 'rtl'
            }}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        zIndex: 20,
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                    <CloseIcon size={20} />
                </button>

                {/* Sidebar */}
                <div style={{
                    width: '320px',
                    borderLeft: '1px solid var(--border-color)',
                    background: 'var(--bg-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '28px 24px',
                    paddingTop: '80px',
                    zIndex: 10
                }}>
                    <h3 style={{ margin: '0 0 24px', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '10px' }}>
                            <Building2 size={24} color="var(--primary-color)" />
                        </div>
                        إدارة الشركات
                    </h3>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                        <input 
                            type="text" 
                            placeholder="اسم الشركة الجديدة..." 
                            value={newCompanyName}
                            onChange={e => setNewCompanyName(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--surface-color)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
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
                                borderRadius: '12px',
                                padding: '0 16px',
                                cursor: newCompanyName.trim() ? 'pointer' : 'not-allowed',
                                opacity: newCompanyName.trim() ? 1 : 0.5,
                                transition: 'all 0.2s',
                                boxShadow: newCompanyName.trim() ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                            }}
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }} className="custom-scrollbar">
                        {companies.map(comp => (
                            <div 
                                key={comp.id}
                                onClick={() => setSelectedCompanyId(comp.id)}
                                style={{
                                    padding: '16px',
                                    borderRadius: '14px',
                                    background: selectedCompanyId === comp.id ? 'var(--primary-color)' : 'var(--surface-color)',
                                    color: selectedCompanyId === comp.id ? 'white' : 'var(--text-primary)',
                                    border: `1px solid ${selectedCompanyId === comp.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: selectedCompanyId === comp.id ? '0 8px 16px rgba(59, 130, 246, 0.2)' : '0 2px 4px rgba(0,0,0,0.02)'
                                }}
                                className="hover-scale"
                            >
                                <span style={{ fontWeight: 700, fontSize: '15px' }}>{comp.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ 
                                        fontSize: '12px', 
                                        fontWeight: 600,
                                        background: selectedCompanyId === comp.id ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                                        padding: '4px 8px',
                                        borderRadius: '20px'
                                    }}>
                                        {comp.branchIds?.length || 0}
                                    </span>
                                    <button 
                                        onClick={(e) => handleDeleteCompany(comp.id, e)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            padding: '4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: selectedCompanyId === comp.id ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)'
                                        }}
                                        title="حذف الشركة"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {companies.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                                <Building2 size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                <p style={{ fontSize: '14px', margin: 0 }}>لا توجد شركات حالياً. قم بإضافة شركة جديدة بالأعلى.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-color)', position: 'relative' }}>
                    {selectedCompany ? (
                        <>
                            {/* Modern Header */}
                            <div style={{ 
                                padding: '32px 40px 0', 
                                borderBottom: '1px solid var(--border-color)',
                                background: 'linear-gradient(to bottom, rgba(59,130,246,0.05), transparent)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                    <div>
                                        <h2 style={{ margin: '0 0 8px', fontSize: '2rem', fontWeight: 900, background: 'linear-gradient(45deg, var(--primary-color), #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                            {selectedCompany.name}
                                        </h2>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>
                                            إدارة جميع الفروع والعمليات المرتبطة بهذه الشركة
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button 
                                            onClick={handleExportExcel}
                                            style={{
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10b981',
                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                                            }}
                                            title="تصدير إلى Excel"
                                        >
                                            <FileSpreadsheet size={20} />
                                        </button>
                                        <button 
                                            onClick={handleExportWord}
                                            style={{
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                color: 'var(--primary-color)',
                                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                            }}
                                            title="تصدير إلى Word"
                                        >
                                            <FileText size={20} />
                                        </button>
                                        <button 
                                            onClick={() => onAddNewBranch(selectedCompany.id)}
                                            style={{
                                                background: 'var(--surface-color)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid var(--border-color)',
                                                padding: '12px 20px',
                                                borderRadius: '12px',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                                e.currentTarget.style.color = 'var(--primary-color)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                                e.currentTarget.style.color = 'var(--text-primary)';
                                            }}
                                        >
                                            <Plus size={18} />
                                            إنشاء فرع جديد
                                        </button>
                                    </div>
                                </div>

                                {/* Custom Tabs */}
                                <div style={{ display: 'flex', gap: '32px' }}>
                                    <div 
                                        onClick={() => setActiveTab('linked')}
                                        style={{ 
                                            paddingBottom: '16px', 
                                            cursor: 'pointer',
                                            fontWeight: activeTab === 'linked' ? 800 : 600,
                                            color: activeTab === 'linked' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                            borderBottom: `3px solid ${activeTab === 'linked' ? 'var(--primary-color)' : 'transparent'}`,
                                            transition: 'all 0.2s',
                                            fontSize: '16px'
                                        }}
                                    >
                                        الفروع المرتبطة ({(selectedCompany.branchIds || []).length})
                                    </div>
                                    <div 
                                        onClick={() => setActiveTab('available')}
                                        style={{ 
                                            paddingBottom: '16px', 
                                            cursor: 'pointer',
                                            fontWeight: activeTab === 'available' ? 800 : 600,
                                            color: activeTab === 'available' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                            borderBottom: `3px solid ${activeTab === 'available' ? 'var(--primary-color)' : 'transparent'}`,
                                            transition: 'all 0.2s',
                                            fontSize: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        ربط فروع إضافية
                                        {branchesToAdd.length > 0 && (
                                            <span style={{
                                                background: 'var(--primary-color)',
                                                color: 'white',
                                                fontSize: '12px',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontWeight: 800
                                            }}>{branchesToAdd.length}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }} className="custom-scrollbar">
                                {activeTab === 'linked' && (
                                    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                        {selectedCompany.branchIds?.map(bId => {
                                            const branch = branches.find(b => b.id === bId);
                                            if (!branch) return null;
                                            return (
                                                <div key={branch.id} style={{
                                                    padding: '20px',
                                                    borderRadius: '16px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-color)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    transition: 'all 0.2s',
                                                }} className="hover-scale">
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '6px' }}>{branch.name}</div>
                                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {branch.address}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveBranchFromCompany(branch.id)}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            color: 'var(--error)',
                                                            border: 'none',
                                                            padding: '10px',
                                                            borderRadius: '10px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="إزالة الفرع من الشركة"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {(!selectedCompany.branchIds || selectedCompany.branchIds.length === 0) && (
                                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                                    <Building2 size={32} style={{ opacity: 0.5 }} />
                                                </div>
                                                <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>لا توجد فروع مرتبطة</h4>
                                                <p style={{ margin: 0, fontSize: '14px' }}>انتقل إلى تبويب "ربط فروع إضافية" لإضافة الفروع التابعة لهذه الشركة.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'available' && (
                                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                                            <input 
                                                type="text" 
                                                placeholder="ابحث عن فرع (بالاسم أو العنوان)..." 
                                                value={branchSearch}
                                                onChange={e => setBranchSearch(e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '14px 20px',
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-color)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '15px',
                                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                                }}
                                            />
                                            <button 
                                                onClick={handleAddBranchesToCompany}
                                                disabled={branchesToAdd.length === 0}
                                                style={{
                                                    background: 'var(--success)',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0 24px',
                                                    borderRadius: '12px',
                                                    fontWeight: 800,
                                                    fontSize: '15px',
                                                    cursor: branchesToAdd.length > 0 ? 'pointer' : 'not-allowed',
                                                    opacity: branchesToAdd.length > 0 ? 1 : 0.5,
                                                    transition: 'all 0.2s',
                                                    boxShadow: branchesToAdd.length > 0 ? '0 8px 16px rgba(16, 185, 129, 0.3)' : 'none'
                                                }}
                                            >
                                                تأكيد الربط ({branchesToAdd.length})
                                            </button>
                                        </div>

                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                                            gap: '12px',
                                            paddingBottom: '20px'
                                        }}>
                                            {filteredAvailableBranches.map(b => {
                                                const isSelected = branchesToAdd.includes(b.id);
                                                return (
                                                    <div 
                                                        key={b.id} 
                                                        onClick={() => {
                                                            if (isSelected) setBranchesToAdd(branchesToAdd.filter(id => id !== b.id));
                                                            else setBranchesToAdd([...branchesToAdd, b.id]);
                                                        }}
                                                        style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '16px', 
                                                            padding: '16px', 
                                                            cursor: 'pointer', 
                                                            borderRadius: '12px', 
                                                            border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                                            background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-color)',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '6px',
                                                            border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--text-secondary)'}`,
                                                            background: isSelected ? 'var(--primary-color)' : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s',
                                                            flexShrink: 0
                                                        }}>
                                                            {isSelected && <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M1.5 5L5 8.5L12.5 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '15px', color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)', marginBottom: '4px' }}>{b.name}</div>
                                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{b.address}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {filteredAvailableBranches.length === 0 && (
                                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                                    لا توجد فروع متاحة بهذا الاسم
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-secondary)', background: 'linear-gradient(to bottom right, var(--surface-color), var(--bg-color))' }}>
                            <div style={{ 
                                width: '120px', 
                                height: '120px', 
                                borderRadius: '50%', 
                                background: 'rgba(59, 130, 246, 0.05)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                marginBottom: '24px',
                                boxShadow: 'inset 0 0 40px rgba(59, 130, 246, 0.05)'
                            }}>
                                <Building2 size={48} color="var(--primary-color)" style={{ opacity: 0.5 }} />
                            </div>
                            <h3 style={{ margin: '0 0 12px', fontSize: '1.5rem', color: 'var(--text-primary)' }}>إدارة الشركات التشغيلية</h3>
                            <p style={{ margin: 0, fontSize: '15px', maxWidth: '400px', textAlign: 'center', lineHeight: 1.6 }}>
                                اختر شركة تشغيلية من القائمة الجانبية لإدارة الفروع التابعة لها، أو قم بإنشاء شركة جديدة للبدء في تنظيم الفروع.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OperatingCompaniesModal;
