import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToCompanies, subscribeToServiceRequests } from '../services/storage';
import type { CompanyAccount, ServiceRequest } from '../types';
import { Search, FileDown, ArrowRight, FileText, AlertCircle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { utils, writeFile } from 'xlsx';

const CompanyInvoices: React.FC = () => {
    const { companyId } = useParams<{ companyId: string }>();
    const navigate = useNavigate();

    const [company, setCompany] = useState<CompanyAccount | null>(null);
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubCompanies = subscribeToCompanies((companies) => {
            const found = companies.find(c => c.id === companyId);
            setCompany(found || null);
        });
        const unsubRequests = subscribeToServiceRequests((allRequests) => {
            setRequests(allRequests);
            setIsLoading(false);
        });
        return () => {
            unsubCompanies();
            unsubRequests();
        };
    }, [companyId]);

    const companyRequests = requests.filter(r => r.companyId === companyId);
    const filtered = companyRequests.filter(r => {
        const matchesQuery =
            r.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    const activeCount = companyRequests.filter(r => r.status === 'active').length;
    const completedCount = companyRequests.filter(r => r.status === 'completed').length;

    const handleExportExcel = () => {
        if (!company) return;
        const data = filtered.map(r => ({
            'رقم الطلب': r.id,
            'رقم اللوحة': r.plateNumber,
            'الخدمة المطلوبة': r.serviceDescription,
            'الحالة': r.status === 'active' ? 'نشط (قيد الانتظار)' : 'مكتمل ومستلم',
            'تاريخ الإنشاء': new Date(r.createdAt).toLocaleString('ar-SA'),
            'تاريخ التنفيذ': r.completedAt ? new Date(r.completedAt).toLocaleString('ar-SA') : '-',
            'الفرع المنفذ': r.branchName || '-'
        }));

        const ws = utils.json_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'الفواتير');
        writeFile(wb, `فواتير_شركة_${company.name}.xlsx`);
        toast.success('تم تصدير الفواتير بنجاح 📊');
    };

    if (!company && !isLoading) {
        return (
            <div className="admin-container" style={{ direction: 'rtl' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>
                    <AlertCircle size={64} color="var(--error)" style={{ opacity: 0.6 }} />
                    <h2 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>الشركة غير موجودة</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>لم يتم العثور على الشركة المطلوبة. ربما تم حذفها.</p>
                    <button
                        onClick={() => navigate('/admin')}
                        style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 28px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <ArrowRight size={18} />
                        العودة إلى لوحة التحكم
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-container" style={{ direction: 'rtl' }}>
            {/* Page Header with Back Button */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                marginBottom: '28px',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => navigate('/admin')}
                    style={{
                        background: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        flexShrink: 0
                    }}
                    title="العودة"
                >
                    <ArrowRight size={20} />
                </button>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <h2 style={{ 
                        margin: 0, 
                        fontSize: '1.5rem', 
                        fontWeight: 800, 
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        🧾 فواتير شركة: <span style={{ color: 'var(--primary-color)' }}>{company?.name || '...'}</span>
                    </h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {company?.managerName && `المسؤول: ${company.managerName}`}
                        {company?.phone && ` • الجوال: ${company.phone}`}
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '16px', 
                marginBottom: '24px' 
            }}>
                <div className="glass" style={{ 
                    padding: '20px', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                }}>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 4px' }}>إجمالي الطلبات</p>
                        <strong style={{ fontSize: '1.6rem', color: 'var(--primary-color)' }}>{companyRequests.length}</strong>
                    </div>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '12px' }}>
                        <FileText size={24} color="var(--primary-color)" />
                    </div>
                </div>
                <div className="glass" style={{ 
                    padding: '20px', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                }}>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 4px' }}>نشطة (قيد الانتظار)</p>
                        <strong style={{ fontSize: '1.6rem', color: 'var(--accent-orange, #f59e0b)' }}>{activeCount}</strong>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '12px' }}>
                        <Filter size={24} color="#f59e0b" />
                    </div>
                </div>
                <div className="glass" style={{ 
                    padding: '20px', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                }}>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 4px' }}>مكتملة ومستلمة</p>
                        <strong style={{ fontSize: '1.6rem', color: 'var(--success)' }}>{completedCount}</strong>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
                        <FileDown size={24} color="var(--success)" />
                    </div>
                </div>
            </div>

            {/* Search, Filter & Export Bar */}
            <div className="glass" style={{ 
                padding: '20px', 
                borderRadius: '16px', 
                marginBottom: '20px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                    <Search style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--text-secondary)" />
                    <input 
                        type="text" 
                        placeholder="بحث برقم اللوحة أو رقم الطلب..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        style={{ 
                            padding: '12px 42px 12px 14px', 
                            borderRadius: '10px', 
                            border: '1px solid var(--border-color)', 
                            width: '100%',
                            background: 'var(--bg-color)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            outline: 'none'
                        }} 
                    />
                </div>
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-color)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        fontWeight: 700,
                        outline: 'none',
                        height: '46px',
                        minWidth: '180px'
                    }}
                >
                    <option value="all">كل الحالات</option>
                    <option value="active">نشطة (قيد الانتظار)</option>
                    <option value="completed">مكتملة ومستلمة</option>
                </select>
                <button 
                    onClick={handleExportExcel} 
                    style={{ 
                        background: 'var(--grad-primary, var(--primary-color))', 
                        color: 'white', 
                        padding: '12px 22px', 
                        borderRadius: '10px', 
                        border: 'none', 
                        fontWeight: 700, 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '14px',
                        height: '46px',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                    }}
                >
                    <FileDown size={18} />
                    تصدير إكسل
                </button>
            </div>

            {/* Results Info */}
            <div style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                عرض {filtered.length} من {companyRequests.length} طلب
            </div>

            {/* Invoices Table */}
            <div className="responsive-table-container glass" style={{ borderRadius: '16px' }}>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>رقم الطلب</th>
                            <th>رقم اللوحة</th>
                            <th>الخدمة المطلوبة</th>
                            <th>الحالة</th>
                            <th>تاريخ الإنشاء</th>
                            <th>تاريخ التنفيذ</th>
                            <th>الفرع المنفذ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <tr key={i}>
                                        <td colSpan={7}>
                                            <div className="skeleton skeleton-text" style={{ width: '100%', height: '18px', marginBottom: 0 }}></div>
                                        </td>
                                    </tr>
                                ))}
                            </>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '4rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                        <AlertCircle size={40} color="var(--text-secondary)" style={{ opacity: 0.4 }} />
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1rem' }}>
                                            لا توجد فواتير مطابقة للبحث
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(r => (
                                <tr key={r.id} className="animate-fade-in">
                                    <td style={{ fontWeight: 800, color: 'var(--primary-color)', fontSize: '0.9rem' }}>{r.id}</td>
                                    <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.plateNumber}</td>
                                    <td style={{ fontSize: '13px', maxWidth: '260px' }}>{r.serviceDescription}</td>
                                    <td>
                                        <span style={{ 
                                            background: r.status === 'active' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                                            color: r.status === 'active' ? 'var(--accent-orange, #f59e0b)' : 'var(--success)', 
                                            padding: '5px 12px', 
                                            borderRadius: '8px', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 800,
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {r.status === 'active' ? 'نشط (قيد الانتظار)' : 'منفذ ومستلم'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {new Date(r.createdAt).toLocaleString('ar-SA')}
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {r.completedAt ? new Date(r.completedAt).toLocaleString('ar-SA') : '-'}
                                    </td>
                                    <td style={{ fontWeight: 700, fontSize: '13px' }}>{r.branchName || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CompanyInvoices;
