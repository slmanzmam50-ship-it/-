import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { subscribeToCompanies, subscribeToServiceRequests, addServiceRequest } from '../services/storage';
import type { CompanyAccount, ServiceRequest } from '../types';
import { PlusCircle, ClipboardList, CheckCircle, Clock, QrCode, Download, X, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

const CompanyDashboard: React.FC = () => {
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [plateNumber, setPlateNumber] = useState('');
    const [serviceDescription, setServiceDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Login and session states
    const [loggedInCompany, setLoggedInCompany] = useState<CompanyAccount | null>(null);

    // QR Code modal state
    const [selectedQrRequest, setSelectedQrRequest] = useState<ServiceRequest | null>(null);
    const [modalQrUrl, setModalQrUrl] = useState<string>('');

    // Generate QR Code data URL when selection changes
    useEffect(() => {
        if (selectedQrRequest) {
            QRCode.toDataURL(selectedQrRequest.id, { margin: 2, scale: 10 })
                .then(url => setModalQrUrl(url))
                .catch(err => {
                    console.error('Error generating QR Code', err);
                    toast.error('حدث خطأ أثناء إنشاء رمز QR');
                });
        } else {
            setModalQrUrl('');
        }
    }, [selectedQrRequest]);

    const handleDownloadQr = () => {
        if (!modalQrUrl || !selectedQrRequest) return;
        const link = document.createElement('a');
        link.href = modalQrUrl;
        link.download = `طلب-${selectedQrRequest.plateNumber}-${selectedQrRequest.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('تم تحميل رمز QR بنجاح');
    };

    // Subscribe to companies and requests
    useEffect(() => {
        const unsubCompanies = subscribeToCompanies((data) => {
            const storedCompanyId = sessionStorage.getItem('logged_company_id');
            if (storedCompanyId) {
                const found = data.find(c => c.id === storedCompanyId);
                if (found) {
                    setLoggedInCompany(found);
                }
            }
        });
        const unsubRequests = subscribeToServiceRequests(setRequests);
        return () => { unsubCompanies(); unsubRequests(); };
    }, []);



    const handleLogout = () => {
        setLoggedInCompany(null);
        sessionStorage.removeItem('logged_company_id');
        toast.success('تم تسجيل الخروج بنجاح');
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const pNum = plateNumber.trim();
        const sDesc = serviceDescription.trim();

        if (!loggedInCompany) {
            toast.error('الرجاء تسجيل الدخول أولاً');
            return;
        }
        if (!pNum) {
            toast.error('الرجاء إدخال رقم اللوحة');
            return;
        }
        if (!sDesc) {
            toast.error('الرجاء إدخال الخدمة المطلوبة');
            return;
        }

        setIsSubmitting(true);
        try {
            const newReq = await addServiceRequest({
                companyId: loggedInCompany.id,
                companyName: loggedInCompany.name,
                plateNumber: pNum,
                serviceDescription: sDesc
            });
            toast.success(`تم إنشاء الطلب بنجاح! رقم الطلب: ${newReq.id} 🎉`);
            setPlateNumber('');
            setServiceDescription('');
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء إنشاء الطلب');
        } finally {
            setIsSubmitting(false);
        }
    };

    const companyRequests = loggedInCompany ? requests.filter(r => r.companyId === loggedInCompany.id) : [];
    const activeRequests = companyRequests.filter(r => r.status === 'active');
    const completedRequests = companyRequests.filter(r => r.status === 'completed');

    if (!loggedInCompany) {
        return <Navigate to="/login?type=company" replace />;
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '24px auto', padding: '0 16px', direction: 'rtl' }}>
            {/* Top Selector Card */}
            <div className="glass animate-fade-in" style={{ padding: '20px 24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏢 لوحة تحكم الشركات
                    </h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        مرحباً بك، أنت مسجل الدخول باسم: <strong style={{ color: 'var(--primary-color)' }}>{loggedInCompany.name}</strong>
                    </p>
                </div>
                <button 
                    onClick={handleLogout}
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        color: 'var(--error)',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    }}
                >
                    <LogOut size={16} /> تسجيل الخروج
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* Create Request Section */}
                <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)' }}>
                        <PlusCircle size={20} /> إنشاء طلب خدمة جديد لـ ({loggedInCompany.name})
                    </h3>
                    <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)' }}>رقم لوحة السيارة:</label>
                                <input 
                                    type="text" 
                                    placeholder="مثال: أ ب ج 1 2 3 4"
                                    value={plateNumber}
                                    onChange={(e) => setPlateNumber(e.target.value)}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-color)',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)' }}>الخدمة المطلوبة:</label>
                                <input 
                                    type="text" 
                                    placeholder="مثال: غيار زيت سوبر شل 10w30"
                                    value={serviceDescription}
                                    onChange={(e) => setServiceDescription(e.target.value)}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-color)',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            style={{
                                alignSelf: 'flex-start',
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '14px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isSubmitting ? 'جاري إنشاء الطلب...' : 'إرسال الطلب وإنشاء الرقم'}
                        </button>
                    </form>
                </div>

                {/* Lists Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Active Requests */}
                    <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-orange)' }}>
                            <ClipboardList size={20} /> الطلبات النشطة ({activeRequests.length})
                        </h3>
                        {activeRequests.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', margin: '30px 0' }}>
                                لا توجد طلبات نشطة حالياً.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {activeRequests.map(r => (
                                    <div key={r.id} style={{ padding: '16px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '15px' }}>رقم اللوحة: {r.plateNumber}</p>
                                            <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-secondary)' }}>{r.serviceDescription}</p>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> {new Date(r.createdAt).toLocaleString('ar-SA')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <button 
                                                onClick={() => setSelectedQrRequest(r)}
                                                title="عرض رمز الـ QR"
                                                style={{
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    color: 'var(--primary-color)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <QrCode size={18} />
                                            </button>
                                            <div style={{ textAlign: 'center' }}>
                                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '4px' }}>رقم الطلب</span>
                                                <span style={{ background: 'var(--accent-orange)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '14px' }}>
                                                    {r.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Completed Requests */}
                    <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
                            <CheckCircle size={20} /> الطلبات المنفذة والمستلمة ({completedRequests.length})
                        </h3>
                        {completedRequests.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', margin: '30px 0' }}>
                                لا توجد طلبات منفذة بعد.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {completedRequests.map(r => (
                                    <div key={r.id} style={{ padding: '16px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '15px' }}>رقم اللوحة: {r.plateNumber}</p>
                                            <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-secondary)' }}>{r.serviceDescription}</p>
                                            <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--success)', fontWeight: 700 }}>
                                                🟢 نُفّذ في فرع: {r.branchName || 'غير معروف'}
                                            </p>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> {r.completedAt ? new Date(r.completedAt).toLocaleString('ar-SA') : ''}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <button 
                                                onClick={() => setSelectedQrRequest(r)}
                                                title="عرض رمز الـ QR"
                                                style={{
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    color: 'var(--primary-color)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <QrCode size={18} />
                                            </button>
                                            <div>
                                                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', border: '1px solid var(--success)' }}>
                                                    {r.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* QR Code Viewer Modal */}
            {selectedQrRequest && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
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
                        maxWidth: '420px',
                        padding: '24px',
                        position: 'relative',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        textAlign: 'center'
                    }}>
                        <button 
                            onClick={() => setSelectedQrRequest(null)}
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
                                transition: 'all 0.2s'
                            }}
                        >
                            <X size={18} />
                        </button>

                        <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>رمز استجابة سريع للطلب (QR Code)</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>سيمسح الموظف هذا الرمز في الفرع لتنفيذ طلبك مباشرة</p>

                        <div style={{
                            background: 'white',
                            padding: '16px',
                            borderRadius: '16px',
                            display: 'inline-block',
                            margin: '0 auto 20px',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
                        }}>
                            {modalQrUrl ? (
                                <img src={modalQrUrl} alt="QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
                            ) : (
                                <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                    جاري التحميل...
                                </div>
                            )}
                        </div>

                        <div style={{
                            background: 'var(--bg-color)',
                            borderRadius: '16px',
                            padding: '16px',
                            marginBottom: '24px',
                            border: '1px solid var(--border-color)',
                            textAlign: 'right'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>رقم الطلب:</span>
                                <span style={{ fontWeight: 800, color: 'var(--accent-orange)' }}>{selectedQrRequest.id}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>رقم اللوحة:</span>
                                <span style={{ fontWeight: 800 }}>{selectedQrRequest.plateNumber}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>الخدمة المطلوبة:</span>
                                <span style={{ fontWeight: 600, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={selectedQrRequest.serviceDescription}>
                                    {selectedQrRequest.serviceDescription}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleDownloadQr}
                                style={{
                                    flex: 1,
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                                }}
                            >
                                <Download size={18} /> تحميل الرمز
                            </button>
                            <button
                                onClick={() => setSelectedQrRequest(null)}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyDashboard;
