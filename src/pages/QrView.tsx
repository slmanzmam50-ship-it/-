import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { subscribeToServiceRequests } from '../services/storage';
import type { ServiceRequest } from '../types';
import { ShieldCheck } from 'lucide-react';

const QrView: React.FC = () => {
    const [searchParams] = useSearchParams();
    const requestId = searchParams.get('id') || '';
    const [qrUrl, setQrUrl] = useState('');
    const [request, setRequest] = useState<ServiceRequest | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (requestId) {
            // Generate QR code url
            QRCode.toDataURL(requestId, { width: 600, margin: 2 })
                .then(url => setQrUrl(url))
                .catch(err => console.error(err));

            // Fetch request details
            const unsub = subscribeToServiceRequests((reqs) => {
                const found = reqs.find(r => r.id === requestId);
                if (found) {
                    setRequest(found);
                }
                setLoading(false);
            });
            return () => unsub();
        } else {
            setLoading(false);
        }
    }, [requestId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                <h3>جاري تحميل الرمز...</h3>
            </div>
        );
    }

    if (!requestId) {
        return (
            <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-primary)', padding: '20px', textAlign: 'center' }}>
                <h3>عذراً، لم يتم العثور على طلب</h3>
                <p>تأكد من صحة الرابط المرسل</p>
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
            direction: 'rtl'
        }}>
            <div className="glass animate-scale-up" style={{
                background: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '400px',
                padding: '28px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                textAlign: 'center'
            }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                    رمز الاستجابة السريع للطلب (QR)
                </h3>
                <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    قدم هذا الرمز للموظف في الفرع لمسحه وتأكيد الخدمة فوراً
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
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>رقم الطلب:</span>
                        <span style={{ fontWeight: 800, color: 'var(--accent-orange)' }}>{requestId}</span>
                    </div>
                    {request && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>رقم اللوحة:</span>
                                <span style={{ fontWeight: 800 }}>{request.plateNumber}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>الشركة:</span>
                                <span style={{ fontWeight: 700 }}>{request.companyName}</span>
                            </div>
                        </>
                    )}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    <ShieldCheck size={14} color="var(--success)" />
                    <span>نظام سلمان زمام الخالدي المعتمد لطلب الخدمات</span>
                </div>
            </div>
        </div>
    );
};

export default QrView;
