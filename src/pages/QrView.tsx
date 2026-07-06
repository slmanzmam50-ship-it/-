import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { subscribeToServiceRequests, subscribeToBranches } from '../services/storage';
import type { ServiceRequest, Branch } from '../types';
import { ShieldCheck, Globe, MapPin } from 'lucide-react';

const translations = {
    ar: {
        title: 'رمز الاستجابة السريع للطلب (QR)',
        subtitle: 'قدم هذا الرمز للموظف في الفرع لمسحه وتأكيد الخدمة فوراً',
        loading: 'جاري تحميل الرمز والبيانات...',
        notFound: 'عذراً، لم يتم العثور على طلب',
        checkLink: 'تأكد من صحة الرابط المرسل',
        requestId: 'رقم الطلب:',
        plateNumber: 'رقم اللوحة:',
        company: 'الشركة:',
        serviceDescription: 'الخدمة المطلوبة:',
        targetBranches: 'الفروع الموجه إليها:',
        systemText: 'نظام سلمان زمام الخالدي المعتمد لطلب الخدمات',
        close: 'إغلاق',
        langBtn: 'English'
    },
    en: {
        title: 'Request QR Code',
        subtitle: 'Show this code to the branch employee to scan and confirm service immediately',
        loading: 'Loading barcode and details...',
        notFound: 'Sorry, request not found',
        checkLink: 'Please verify the shared link',
        requestId: 'Request ID:',
        plateNumber: 'Plate Number:',
        company: 'Company:',
        serviceDescription: 'Service Description:',
        targetBranches: 'Designated Branches:',
        systemText: 'Authorized Salman Zmam Al-Khaldi Service Request System',
        close: 'Close',
        langBtn: 'العربية'
    }
};

const QrView: React.FC = () => {
    const [searchParams] = useSearchParams();
    const requestId = searchParams.get('id') || '';
    const [qrUrl, setQrUrl] = useState('');
    const [request, setRequest] = useState<ServiceRequest | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [lang, setLang] = useState<'ar' | 'en'>('ar');

    useEffect(() => {
        // Subscribe to branches
        const unsubBranches = subscribeToBranches(setBranches);

        if (requestId) {
            // Generate QR code url
            QRCode.toDataURL(requestId, { width: 600, margin: 2 })
                .then(url => setQrUrl(url))
                .catch(err => console.error(err));

            // Fetch request details
            const unsubReqs = subscribeToServiceRequests((reqs) => {
                const found = reqs.find(r => r.id === requestId);
                if (found) {
                    setRequest(found);
                }
                setLoading(false);
            });
            
            return () => {
                unsubBranches();
                unsubReqs();
            };
        } else {
            setLoading(false);
            return () => unsubBranches();
        }
    }, [requestId]);

    const getBranchNamesStr = (branchIds: string[]) => {
        if (!branchIds) return '';
        return branchIds
            .map(id => branches.find(b => b.id === id)?.name || id)
            .join(' - ');
    };

    const t = translations[lang];

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                <h3>{t.loading}</h3>
            </div>
        );
    }

    if (!requestId) {
        return (
            <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-primary)', padding: '20px', textAlign: 'center' }}>
                <h3>{t.notFound}</h3>
                <p>{t.checkLink}</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--bg-color)',
            color: 'var(--text-primary)',
            padding: '24px',
            boxSizing: 'border-box',
            direction: lang === 'ar' ? 'rtl' : 'ltr'
        }}>
            {/* Language Selection Button */}
            <button
                onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--surface-color)',
                    border: '1.5px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '10px 24px',
                    borderRadius: '50px',
                    fontWeight: 800,
                    fontSize: '15px',
                    cursor: 'pointer',
                    marginBottom: '20px',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s',
                    borderWidth: '2px'
                }}
                className="hover-scale tap-effect"
            >
                <Globe size={18} color="var(--primary-color)" />
                {t.langBtn}
            </button>

            <div className="glass animate-scale-up" style={{
                background: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '420px',
                padding: '28px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                textAlign: 'center'
            }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                    {t.title}
                </h3>
                <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {t.subtitle}
                </p>

                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '20px',
                    display: 'inline-block',
                    margin: '0 auto 24px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    {qrUrl && <img src={qrUrl} alt="QR Code" style={{ width: '240px', height: '240px', display: 'block' }} />}
                </div>

                <div style={{
                    background: 'var(--bg-color)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '24px',
                    border: '1px solid var(--border-color)',
                    textAlign: lang === 'ar' ? 'right' : 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>{t.requestId}</span>
                        <span style={{ fontWeight: 800, color: 'var(--accent-orange)' }}>{requestId}</span>
                    </div>
                    {request && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>{t.plateNumber}</span>
                                <span style={{ fontWeight: 800 }}>{request.plateNumber}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>{t.company}</span>
                                <span style={{ fontWeight: 700 }}>{request.companyName}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>{t.serviceDescription}</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{request.serviceDescription}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>{t.targetBranches}</span>
                                <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{getBranchNamesStr(request.targetBranchIds)}</span>
                            </div>
                        </>
                    )}
                </div>

                <a
                    href={`/map?request=${requestId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '14px 18px',
                        borderRadius: '16px',
                        fontWeight: 850,
                        fontSize: '15px',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
                        marginBottom: '20px',
                        boxSizing: 'border-box'
                    }}
                    className="hover-scale tap-effect"
                >
                    <MapPin size={18} />
                    {lang === 'ar' ? '📍 الذهاب إلى الخريطة لتوجيه الفروع' : '📍 Go to Map & View Directions'}
                </a>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    <ShieldCheck size={14} color="var(--success)" />
                    <span>{t.systemText}</span>
                </div>
            </div>
        </div>
    );
};

export default QrView;
