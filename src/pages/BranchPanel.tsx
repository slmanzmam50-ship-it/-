import React, { useState, useEffect } from 'react';
import { subscribeToBranches, subscribeToServiceRequests, updateServiceRequestStatus } from '../services/storage';
import type { Branch, ServiceRequest } from '../types';
import { Search, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const BranchPanel: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Subscribe to branches and requests
    useEffect(() => {
        const unsubBranches = subscribeToBranches((data) => {
            setBranches(data);
            if (data.length > 0 && !selectedBranchId) {
                setSelectedBranchId(data[0].id);
            }
        });
        const unsubRequests = subscribeToServiceRequests(setRequests);
        return () => { unsubBranches(); unsubRequests(); };
    }, [selectedBranchId]);

    const activeBranch = branches.find(b => b.id === selectedBranchId);

    // Search query matches
    const matchedRequest = searchQuery.trim() 
        ? requests.find(r => r.id.toLowerCase() === searchQuery.trim().toLowerCase()) 
        : null;

    const handleCompleteRequest = async () => {
        if (!matchedRequest) return;
        if (!selectedBranchId) {
            toast.error('الرجاء تحديد الفرع الحالي أولاً');
            return;
        }

        setIsProcessing(true);
        try {
            await updateServiceRequestStatus(
                matchedRequest.id,
                'completed',
                selectedBranchId,
                activeBranch ? activeBranch.name : 'فرع غير معروف'
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
    const branchCompletedToday = requests.filter(r => 
        r.status === 'completed' && 
        r.branchId === selectedBranchId &&
        r.completedAt && 
        new Date(r.completedAt).toDateString() === new Date().toDateString()
    );

    return (
        <div style={{ maxWidth: '800px', margin: '24px auto', padding: '0 16px', direction: 'rtl' }}>
            {/* Branch Selector Card */}
            <div className="glass animate-fade-in" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 16px', fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🏪 بوابة موظفي الفروع
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '400px' }}>
                    <label style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-secondary)' }}>حدد الفرع الحالي:</label>
                    {branches.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--error)' }}>
                            ⚠️ لا توجد فروع مسجلة. يرجى إضافة فرع من لوحة تحكم الإدارة أولاً.
                        </p>
                    ) : (
                        <select 
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
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
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {activeBranch && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Search Order Card */}
                    <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 800 }}>
                            🔍 البحث عن طلب خدمة واستلامه
                        </h3>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '500px', marginBottom: '24px' }}>
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
            )}
        </div>
    );
};

export default BranchPanel;
