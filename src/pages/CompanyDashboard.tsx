import React, { useState, useEffect } from 'react';
import { subscribeToCompanies, subscribeToServiceRequests, addServiceRequest } from '../services/storage';
import type { CompanyAccount, ServiceRequest } from '../types';
import { PlusCircle, ClipboardList, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const CompanyDashboard: React.FC = () => {
    const [companies, setCompanies] = useState<CompanyAccount[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [plateNumber, setPlateNumber] = useState('');
    const [serviceDescription, setServiceDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Subscribe to companies and requests
    useEffect(() => {
        const unsubCompanies = subscribeToCompanies((data) => {
            setCompanies(data);
            if (data.length > 0 && !selectedCompanyId) {
                setSelectedCompanyId(data[0].id);
            }
        });
        const unsubRequests = subscribeToServiceRequests(setRequests);
        return () => { unsubCompanies(); unsubRequests(); };
    }, [selectedCompanyId]);

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const pNum = plateNumber.trim();
        const sDesc = serviceDescription.trim();

        if (!selectedCompanyId) {
            toast.error('الرجاء اختيار الشركة أولاً');
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
        const companyObj = companies.find(c => c.id === selectedCompanyId);
        try {
            const newReq = await addServiceRequest({
                companyId: selectedCompanyId,
                companyName: companyObj ? companyObj.name : 'شركة غير معروفة',
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

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    const companyRequests = requests.filter(r => r.companyId === selectedCompanyId);
    const activeRequests = companyRequests.filter(r => r.status === 'active');
    const completedRequests = companyRequests.filter(r => r.status === 'completed');

    return (
        <div style={{ maxWidth: '1000px', margin: '24px auto', padding: '0 16px', direction: 'rtl' }}>
            {/* Top Selector Card */}
            <div className="glass animate-fade-in" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 16px', fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🏢 لوحة تحكم الشركات
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '400px' }}>
                    <label style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-secondary)' }}>اختر الشركة لتمثيلها:</label>
                    {companies.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--error)' }}>
                            ⚠️ لا توجد شركات مسجلة بعد. يرجى إضافة شركة من لوحة تحكم الإدارة أولاً.
                        </p>
                    ) : (
                        <select 
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                fontWeight: 600,
                                outline: 'none'
                            }}
                        >
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {selectedCompany && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                    {/* Create Request Section */}
                    <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)' }}>
                            <PlusCircle size={20} /> إنشاء طلب خدمة جديد لـ ({selectedCompany.name})
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
                                    transition: 'all 0.2s ease'
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
                                            <div>
                                                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '15px' }}>رقم اللوحة: {r.plateNumber}</p>
                                                <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-secondary)' }}>{r.serviceDescription}</p>
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={12} /> {new Date(r.createdAt).toLocaleString('ar-SA')}
                                                </span>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '4px' }}>رقم الطلب</span>
                                                <span style={{ background: 'var(--accent-orange)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '14px' }}>
                                                    {r.id}
                                                </span>
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
                                            <div>
                                                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '15px' }}>رقم اللوحة: {r.plateNumber}</p>
                                                <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-secondary)' }}>{r.serviceDescription}</p>
                                                <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--success)', fontWeight: 700 }}>
                                                    🟢 نُفّذ في فرع: {r.branchName || 'غير معروف'}
                                                </p>
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={12} /> {r.completedAt ? new Date(r.completedAt).toLocaleString('ar-SA') : ''}
                                                </span>
                                            </div>
                                            <div>
                                                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', border: '1px solid var(--success)' }}>
                                                    {r.id}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyDashboard;
