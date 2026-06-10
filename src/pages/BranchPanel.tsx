import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { subscribeToBranches, subscribeToServiceRequests, updateServiceRequestStatus } from '../services/storage';
import type { Branch, ServiceRequest } from '../types';
import { Search, CheckCircle, Clock, AlertTriangle, QrCode, X, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';

const BranchPanel: React.FC = () => {
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Login and session states
    const [loggedInBranch, setLoggedInBranch] = useState<Branch | null>(null);

    // QR Code scanner hook
    useEffect(() => {
        let html5QrCode: Html5Qrcode | null = null;
        if (isScannerOpen) {
            // Wait slightly for container to render in DOM
            const timer = setTimeout(() => {
                const element = document.getElementById("qr-reader");
                if (element) {
                    html5QrCode = new Html5Qrcode("qr-reader");
                    html5QrCode.start(
                        { facingMode: "environment" },
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 }
                        },
                        (decodedText) => {
                            setSearchQuery(decodedText.trim());
                            toast.success('تم مسح الرمز بنجاح!');
                            setIsScannerOpen(false);
                        },
                        () => {
                            // Suppress scanning loop errors
                        }
                    ).catch(err => {
                        console.error('Error starting scanner', err);
                        toast.error('لم نتمكن من تشغيل الكاميرا. الرجاء تفعيل صلاحية الكاميرا.');
                        setIsScannerOpen(false);
                    });
                }
            }, 100);

            return () => {
                clearTimeout(timer);
                if (html5QrCode && html5QrCode.isScanning) {
                    html5QrCode.stop().catch(err => console.error('Error stopping scanner', err));
                }
            };
        }
    }, [isScannerOpen]);

    // Subscribe to branches and requests
    useEffect(() => {
        const unsubBranches = subscribeToBranches((data) => {
            const storedBranchId = sessionStorage.getItem('logged_branch_id');
            if (storedBranchId) {
                const found = data.find(b => b.id === storedBranchId);
                if (found) {
                    setLoggedInBranch(found);
                }
            }
        });
        const unsubRequests = subscribeToServiceRequests(setRequests);
        return () => { unsubBranches(); unsubRequests(); };
    }, []);



    const handleLogout = () => {
        setLoggedInBranch(null);
        sessionStorage.removeItem('logged_branch_id');
        toast.success('تم تسجيل الخروج بنجاح');
    };

    // Search query matches
    const matchedRequest = searchQuery.trim() 
        ? requests.find(r => r.id.toLowerCase() === searchQuery.trim().toLowerCase()) 
        : null;

    const handleCompleteRequest = async () => {
        if (!matchedRequest) return;
        if (!loggedInBranch) {
            toast.error('الرجاء تسجيل الدخول أولاً');
            return;
        }

        setIsProcessing(true);
        try {
            await updateServiceRequestStatus(
                matchedRequest.id,
                'completed',
                loggedInBranch.id,
                loggedInBranch.name
            );
            toast.success(`تم استلام وتأكيد تنفيذ الطلب ${matchedRequest.id} بنجاح! 🚗🎉`);
            setSearchQuery('');
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء تحديث حالة الطلب');
        } finally {
            setIsProcessing(false);
        }
    };

    // Requests completed by this branch today
    const branchCompletedToday = loggedInBranch ? requests.filter(r => 
        r.status === 'completed' && 
        r.branchId === loggedInBranch.id &&
        r.completedAt && 
        new Date(r.completedAt).toDateString() === new Date().toDateString()
    ) : [];

    if (!loggedInBranch) {
        return <Navigate to="/login?type=branch" replace />;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '24px auto', padding: '0 16px', direction: 'rtl' }}>
            {/* Top Info Card */}
            <div className="glass animate-fade-in" style={{ padding: '20px 24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏪 بوابة موظفي الفروع
                    </h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        الفرع الحالي: <strong style={{ color: 'var(--primary-color)' }}>{loggedInBranch.name}</strong>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Search Order Card */}
                <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 800 }}>
                        🔍 البحث عن طلب خدمة واستلامه
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '600px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                            <Search style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
                            <input 
                                type="text"
                                placeholder="ادخل رقم الطلب هنا... (مثال: RQ-1234)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 40px 12px 14px',
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
                        <button
                            onClick={() => setIsScannerOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                padding: '12px 20px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                            }}
                        >
                            <QrCode size={18} /> مسح الرمز (QR) بالكاميرا
                        </button>
                    </div>

                    {/* Search Results Display */}
                    {searchQuery.trim() !== '' && (
                        <div className="animate-fade-in" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
                            {!matchedRequest ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}>
                                    <AlertTriangle size={18} />
                                    <span style={{ fontWeight: 700, fontSize: '14px' }}>لم يتم العثور على طلب بهذا الرقم! تأكد من صحة الرقم المكتوب.</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', background: matchedRequest.status === 'active' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: matchedRequest.status === 'active' ? 'var(--accent-orange)' : 'var(--success)' }}>
                                            {matchedRequest.status === 'active' ? 'طلب نشط وجاهز للتنفيذ' : 'طلب مكتمل ومستلم سابقاً'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>الشركة صاحبة الطلب:</p>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{matchedRequest.companyName}</p>
                                        </div>
                                        <div>
                                            <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>رقم لوحة السيارة:</p>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{matchedRequest.plateNumber}</p>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>الخدمة المطلوبة:</p>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: 'var(--primary-color)' }}>{matchedRequest.serviceDescription}</p>
                                        </div>
                                    </div>

                                    {matchedRequest.status === 'active' ? (
                                        <button 
                                            onClick={handleCompleteRequest}
                                            disabled={isProcessing}
                                            style={{
                                                alignSelf: 'flex-start',
                                                background: 'var(--success)',
                                                color: 'white',
                                                border: 'none',
                                                padding: '12px 24px',
                                                borderRadius: '10px',
                                                fontWeight: 800,
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                marginTop: '8px',
                                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <CheckCircle size={16} /> {isProcessing ? 'جاري استلام وتأكيد الطلب...' : 'تأكيد تنفيذ واستلام الطلب'}
                                        </button>
                                    ) : (
                                        <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontSize: '13px', fontWeight: 700 }}>
                                            🟢 تم تنفيذ هذا الطلب بنجاح في فرع: ({matchedRequest.branchName}) بتاريخ {matchedRequest.completedAt ? new Date(matchedRequest.completedAt).toLocaleString('ar-SA') : ''}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Today's Log Card */}
                <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)' }}>
                        <CheckCircle size={20} /> الطلبات المنفذة في هذا الفرع اليوم ({branchCompletedToday.length})
                    </h3>
                    {branchCompletedToday.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', margin: '30px 0' }}>
                            لم يتم تنفيذ أي طلبات في هذا الفرع اليوم بعد.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {branchCompletedToday.map(r => (
                                <div key={r.id} style={{ padding: '14px 16px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '14px' }}>رقم اللوحة: {r.plateNumber} (رقم الطلب: {r.id})</p>
                                        <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>الخدمة: {r.serviceDescription}</p>
                                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>الشركة: {r.companyName}</p>
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} /> {r.completedAt ? new Date(r.completedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Camera QR Scanner Modal */}
            {isScannerOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
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
                        maxWidth: '480px',
                        padding: '24px',
                        position: 'relative',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                        textAlign: 'center'
                    }}>
                        <button 
                            onClick={() => setIsScannerOpen(false)}
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
                                transition: 'all 0.2s',
                                zIndex: 10
                            }}
                        >
                            <X size={18} />
                        </button>

                        <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>مسح الرمز (QR Code)</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>قم بتوجيه كاميرا جهازك نحو رمز الاستجابة السريع للطلب</p>

                        <div 
                            id="qr-reader" 
                            style={{ 
                                width: '100%', 
                                overflow: 'hidden', 
                                borderRadius: '16px', 
                                border: '1px solid var(--border-color)',
                                background: 'black',
                                marginBottom: '20px'
                            }}
                        ></div>

                        <button
                            onClick={() => setIsScannerOpen(false)}
                            style={{
                                width: '100%',
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
                            إلغاء وإغلاق الكاميرا
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchPanel;
