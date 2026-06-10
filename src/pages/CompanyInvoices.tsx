import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToCompanies, subscribeToServiceRequests } from '../services/storage';
import type { CompanyAccount, ServiceRequest } from '../types';
import { Search, FileDown, ArrowRight, FileText, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
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

    // Styles
    const styles = {
        page: {
            padding: '24px',
            maxWidth: '1200px',
            margin: '0 auto',
            direction: 'rtl' as const,
            minHeight: 'calc(100vh - 80px)',
        },
        headerRow: {
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '24px',
        },
        backBtn: {
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            flexShrink: 0 as const,
            boxShadow: 'var(--shadow-sm)',
        },
        titleBlock: {
            flex: 1,
        },
        title: {
            margin: 0,
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
        },
        subtitle: {
            margin: '2px 0 0',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 500,
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '20px',
        },
        statCard: () => ({
            padding: '18px 16px',
            borderRadius: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
        }),
        statLabel: {
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            margin: '0 0 4px',
            fontWeight: 600,
        },
        statValue: (color: string) => ({
            fontSize: '1.5rem',
            fontWeight: 800,
            color,
            margin: 0,
        }),
        statIcon: (bg: string) => ({
            background: bg,
            padding: '10px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }),
        filterBar: {
            display: 'flex',
            gap: '10px',
            marginBottom: '16px',
            flexWrap: 'wrap' as const,
            alignItems: 'center',
        },
        searchWrapper: {
            position: 'relative' as const,
            flex: 1,
            minWidth: '220px',
        },
        searchIcon: {
            position: 'absolute' as const,
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
        },
        searchInput: {
            padding: '11px 40px 11px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            width: '100%',
            background: 'var(--surface-color)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'inherit',
            boxShadow: 'var(--shadow-sm)',
        },
        selectFilter: {
            padding: '11px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: 'var(--surface-color)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 700,
            outline: 'none',
            height: '42px',
            fontFamily: 'inherit',
            boxShadow: 'var(--shadow-sm)',
        },
        exportBtn: {
            background: 'var(--grad-primary)',
            color: 'white',
            padding: '11px 20px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            height: '42px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
            whiteSpace: 'nowrap' as const,
        },
        countInfo: {
            marginBottom: '10px',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '0 4px',
        },
        tableWrapper: {
            borderRadius: '14px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            background: 'var(--surface-color)',
        },
        badge: (isActive: boolean) => ({
            background: isActive ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            color: isActive ? '#f59e0b' : 'var(--success)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 800,
            whiteSpace: 'nowrap' as const,
            display: 'inline-block',
        }),
    };

    if (!company && !isLoading) {
        return (
            <div style={{ ...styles.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '20px', borderRadius: '50%' }}>
                    <AlertCircle size={48} color="var(--error)" />
                </div>
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.2rem' }}>الشركة غير موجودة</h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>لم يتم العثور على الشركة المطلوبة</p>
                <button
                    onClick={() => navigate('/admin')}
                    style={{
                        ...styles.exportBtn,
                        marginTop: '8px',
                    }}
                >
                    <ArrowRight size={16} />
                    العودة للوحة التحكم
                </button>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            {/* Header */}
            <div style={styles.headerRow}>
                <button onClick={() => navigate('/admin')} style={styles.backBtn} title="العودة">
                    <ArrowRight size={18} />
                </button>
                <div style={styles.titleBlock}>
                    <h2 style={styles.title}>
                        🧾 فواتير شركة <span style={{ color: 'var(--primary-color)' }}>{company?.name || '...'}</span>
                    </h2>
                    {(company?.managerName || company?.phone) && (
                        <p style={styles.subtitle}>
                            {company?.managerName && <span>المسؤول: {company.managerName}</span>}
                            {company?.managerName && company?.phone && ' • '}
                            {company?.phone && <span>الجوال: {company.phone}</span>}
                        </p>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard()}>
                    <div>
                        <p style={styles.statLabel}>إجمالي الطلبات</p>
                        <p style={styles.statValue('var(--primary-color)')}>{companyRequests.length}</p>
                    </div>
                    <div style={styles.statIcon('rgba(59, 130, 246, 0.1)')}>
                        <FileText size={20} color="var(--primary-color)" />
                    </div>
                </div>
                <div style={styles.statCard()}>
                    <div>
                        <p style={styles.statLabel}>قيد الانتظار</p>
                        <p style={styles.statValue('#f59e0b')}>{activeCount}</p>
                    </div>
                    <div style={styles.statIcon('rgba(245, 158, 11, 0.1)')}>
                        <Clock size={20} color="#f59e0b" />
                    </div>
                </div>
                <div style={styles.statCard()}>
                    <div>
                        <p style={styles.statLabel}>مكتملة</p>
                        <p style={styles.statValue('var(--success)')}>{completedCount}</p>
                    </div>
                    <div style={styles.statIcon('rgba(16, 185, 129, 0.1)')}>
                        <CheckCircle2 size={20} color="var(--success)" />
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div style={styles.filterBar}>
                <div style={styles.searchWrapper}>
                    <Search style={styles.searchIcon} size={15} color="var(--text-secondary)" />
                    <input
                        type="text"
                        placeholder="بحث برقم اللوحة أو رقم الطلب..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    style={styles.selectFilter}
                >
                    <option value="all">كل الحالات</option>
                    <option value="active">نشطة (قيد الانتظار)</option>
                    <option value="completed">مكتملة ومستلمة</option>
                </select>
                <button onClick={handleExportExcel} style={styles.exportBtn}>
                    <FileDown size={16} />
                    تصدير إكسل
                </button>
            </div>

            {/* Count */}
            <div style={styles.countInfo}>
                عرض {filtered.length} من {companyRequests.length} طلب
            </div>

            {/* Table */}
            <div style={styles.tableWrapper}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                                            <td colSpan={7} style={{ padding: '16px' }}>
                                                <div className="skeleton skeleton-text" style={{ width: '100%', height: '16px', marginBottom: 0 }}></div>
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                            <AlertCircle size={36} color="var(--text-secondary)" style={{ opacity: 0.3 }} />
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                                لا توجد فواتير مطابقة للبحث
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(r => (
                                    <tr key={r.id} className="animate-fade-in">
                                        <td style={{ fontWeight: 800, color: 'var(--primary-color)', fontSize: '0.85rem' }}>{r.id}</td>
                                        <td style={{ fontWeight: 700 }}>{r.plateNumber}</td>
                                        <td style={{ fontSize: '13px', maxWidth: '240px', whiteSpace: 'normal', lineHeight: 1.5 }}>{r.serviceDescription}</td>
                                        <td>
                                            <span style={styles.badge(r.status === 'active')}>
                                                {r.status === 'active' ? 'قيد الانتظار' : 'منفذ ومستلم'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {new Date(r.createdAt).toLocaleString('ar-SA')}
                                        </td>
                                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {r.completedAt ? new Date(r.completedAt).toLocaleString('ar-SA') : '-'}
                                        </td>
                                        <td style={{ fontWeight: 600, fontSize: '13px' }}>{r.branchName || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CompanyInvoices;
