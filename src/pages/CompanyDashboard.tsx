import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { subscribeToCompanies, subscribeToServiceRequests, addServiceRequest, subscribeToBranches, updateServiceRequestBranch } from '../services/storage';
import type { CompanyAccount, ServiceRequest, Branch } from '../types';
import { PlusCircle, ClipboardList, CheckCircle, QrCode, Download, X, Loader2, RefreshCw, AlertTriangle, ArrowLeftRight, Car, Wrench, MapPin, Check, Globe, Search, Flame, Link2, ArrowRight, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

const normalizeArabicSimple = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u0652]/g, '') // remove diacritics
        .replace(/(^|\s)ال/g, '$1') // remove 'ال' definition prefix
        .replace(/\s+/g, ' ') // normalize spaces
        .trim();
};

const CompanyDashboard: React.FC = () => {
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [plateNumber, setPlateNumber] = useState('');
    const [serviceDescription, setServiceDescription] = useState('');
    const [targetBranchIds, setTargetBranchIds] = useState<string[]>(['all']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'create' | 'active' | 'issues' | 'completed' | null>(null);
    
    // Login and session states
    const [loggedInCompany, setLoggedInCompany] = useState<CompanyAccount | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // QR Code modal state
    const [selectedQrRequest, setSelectedQrRequest] = useState<ServiceRequest | null>(null);
    const [modalQrUrl, setModalQrUrl] = useState<string>('');
    const [newlyCreatedRequest, setNewlyCreatedRequest] = useState<ServiceRequest | null>(null);
    const [detailedRequest, setDetailedRequest] = useState<ServiceRequest | null>(null);

    const formatAndValidatePlate = (input: string): { formatted: string; isValid: boolean } => {
        const clean = input.replace(/[\s\-\|\\\/,_.]/g, '');
        const digitsMatch = clean.match(/[0-9\u0660-\u0669]/g) || [];
        const lettersMatch = clean.match(/[\u0621-\u064Aa-zA-Z]/g) || [];
        
        if (digitsMatch.length !== 4 || lettersMatch.length !== 3) {
            return {
                formatted: input.trim(),
                isValid: true
            };
        }
        
        const arabicToEngMap: Record<string, string> = {
            '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
            '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
        };
        const normalizedDigits = digitsMatch.map(d => arabicToEngMap[d] || d).join('');
        const formattedLetters = lettersMatch.join(' ');
        
        return {
            formatted: `${formattedLetters} | ${normalizedDigits}`,
            isValid: true
        };
    };

    const handlePlateBlur = () => {
        if (!plateNumber.trim()) return;
        const res = formatAndValidatePlate(plateNumber);
        if (res.isValid) {
            setPlateNumber(res.formatted);
        }
    };

    const handleCopyShareLink = (request: ServiceRequest) => {
        const shareUrl = `${window.location.origin}/map?request=${request.id}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success(`تم نسخ رابط التوجيه للطلب ${request.id}! 🔗`);
    };

    const renderRequestCard = (r: ServiceRequest) => {
        let statusLabel = 'نشط';
        let statusColor = 'var(--accent-orange)';
        if (r.status === 'transferred') {
            statusLabel = 'محول';
            statusColor = 'var(--primary-color)';
        } else if (r.status === 'completed') {
            statusLabel = 'مكتمل';
            statusColor = 'var(--success)';
        } else if (r.status === 'rejected') {
            statusLabel = 'مرفوض';
            statusColor = 'var(--error)';
        } else if (r.status === 'partial') {
            statusLabel = 'خدمات ناقصة';
            statusColor = 'var(--accent-orange)';
        }

        return (
            <div 
                key={r.id} 
                onClick={() => setDetailedRequest(r)}
                className="hover-scale tap-effect glass"
                style={{ 
                    padding: '16px', 
                    background: 'var(--surface-color)', 
                    borderRadius: '16px', 
                    border: '1.5px solid var(--border-color)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px',
                    cursor: 'pointer',
                    textAlign: 'right',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    width: '100%',
                    boxSizing: 'border-box'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: '15px', color: 'var(--text-primary)' }}>
                        🚗 اللوحة: {r.plateNumber}
                    </span>
                    <span style={{ 
                        fontSize: '11px', 
                        background: `rgba(${statusColor === 'var(--success)' ? '16, 185, 129' : statusColor === 'var(--error)' ? '239, 68, 68' : statusColor === 'var(--primary-color)' ? '59, 130, 246' : '245, 158, 11'}, 0.1)`, 
                        color: statusColor, 
                        padding: '3px 8px', 
                        borderRadius: '8px', 
                        fontWeight: 800 
                    }}>
                        {statusLabel}
                    </span>
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {r.serviceDescription}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>#{r.id}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
            </div>
        );
    };

    // Re-route Modal state
    const [reRouteRequest, setReRouteRequest] = useState<ServiceRequest | null>(null);
    const [newTargetBranchIds, setNewTargetBranchIds] = useState<string[]>([]);
    const [isReRouting, setIsReRouting] = useState(false);

    // Search and smart sorting states
    const [branchSearch, setBranchSearch] = useState('');
    const [reRouteBranchSearch, setReRouteBranchSearch] = useState('');

    const getBranchScore = (branchId: string) => {
        if (!loggedInCompany) return 0;
        const companyReqs = requests.filter(r => r.companyId === loggedInCompany.id);
        const completedCount = companyReqs.filter(r => r.branchId === branchId && r.status === 'completed').length;
        const targetedCount = companyReqs.filter(r => r.targetBranchIds?.includes(branchId)).length;
        return completedCount * 3 + targetedCount;
    };

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

    const handleShareRequest = async (request: ServiceRequest) => {
        const shareUrl = `${window.location.origin}/qr?id=${request.id}`;
        const shareText = `🚗 *مراكز خدمة سلمان زمام الخالدي | Salman Zmam Al-Khaldi Service Centers* 🚗

الرجاء الضغط على الرابط أدناه لعرض تفاصيل طلب الصيانة والباركود:
Please click the link below to view your maintenance request details and barcode:

📍 ${shareUrl}`;

        if (navigator.share) {
            try {
                if (modalQrUrl && modalQrUrl.startsWith('data:image')) {
                    const blob = await fetch(modalQrUrl).then(r => r.blob());
                    const file = new File([blob], `qr-${request.id}.png`, { type: 'image/png' });
                    
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: `طلب خدمة رقم ${request.id}`,
                            text: shareText
                        });
                        toast.success('تمت المشاركة بنجاح! 📤');
                        return;
                    }
                }
                
                await navigator.share({
                    title: `طلب خدمة رقم ${request.id}`,
                    text: shareText
                });
                toast.success('تمت المشاركة بنجاح! 📤');
            } catch (error) {
                console.error('Error sharing:', error);
                openWhatsAppShare(shareText);
            }
        } else {
            openWhatsAppShare(shareText);
        }
    };

    const openWhatsAppShare = (text: string) => {
        const encodedText = encodeURIComponent(text);
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
        toast.success('تم فتح واتساب لمشاركة الطلب! 💬');
    };

    // Subscribe to branches, companies, and requests
    useEffect(() => {
        const unsubBranches = subscribeToBranches(setBranches);
        const unsubCompanies = subscribeToCompanies((data) => {
            const storedCompanyId = localStorage.getItem('logged_company_id');
            if (storedCompanyId) {
                const found = data.find(c => c.id === storedCompanyId);
                if (found) {
                    setLoggedInCompany(found);
                }
            }
            setIsLoading(false);
        });
        const unsubRequests = subscribeToServiceRequests(setRequests);
        return () => { unsubBranches(); unsubCompanies(); unsubRequests(); };
    }, []);


    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const pNum = plateNumber.trim();
        const sDesc = serviceDescription.trim();

        if (!loggedInCompany) {
            toast.error('الرجاء تسجيل الدخول أولاً');
            return;
        }
        const validatedPNum = formatAndValidatePlate(pNum).formatted;

        if (!sDesc) {
            toast.error('الرجاء إدخال الخدمة المطلوبة');
            return;
        }
        if (targetBranchIds.length === 0) {
            toast.error('الرجاء تحديد فرع واحد على الأقل أو اختيار "الكل"');
            return;
        }

        setIsSubmitting(true);
        try {
            const visibleBranches = branches.filter(b => !loggedInCompany.hiddenBranchIds?.includes(b.id));
            const finalBranchIds = targetBranchIds.includes('all')
                ? visibleBranches.map(b => b.id)
                : targetBranchIds;

            const newReq = await addServiceRequest({
                companyId: loggedInCompany.id,
                companyName: loggedInCompany.name,
                plateNumber: validatedPNum,
                serviceDescription: sDesc,
                targetBranchIds: finalBranchIds,
                companyHiddenBranchIds: loggedInCompany.hiddenBranchIds || []
            });
            toast.success(`تم إنشاء الطلب بنجاح! رقم الطلب: ${newReq.id} 🎉`);
            setPlateNumber('');
            setServiceDescription('');
            setTargetBranchIds(['all']);
            setNewlyCreatedRequest(newReq);
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء إنشاء الطلب');
        } finally {
            setIsSubmitting(false);
        }
    };



    const openReRouteModal = (req: ServiceRequest) => {
        setReRouteRequest(req);
        setNewTargetBranchIds(req.targetBranchIds || ['all']);
    };

    const handleExecuteReRoute = async () => {
        if (!reRouteRequest) return;
        if (newTargetBranchIds.length === 0) {
            toast.error('الرجاء تحديد فرع واحد على الأقل');
            return;
        }

        setIsReRouting(true);
        try {
            const visibleBranches = branches.filter(b => !loggedInCompany?.hiddenBranchIds?.includes(b.id));
            const finalBranchIds = newTargetBranchIds.includes('all')
                ? visibleBranches.map(b => b.id)
                : newTargetBranchIds;
            await updateServiceRequestBranch(reRouteRequest.id, finalBranchIds);
            toast.success('تم تعديل فروع الطلب بنجاح وإعادة تنشيطه! 🔄');
            setReRouteRequest(null);
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء تعديل فروع الطلب');
        } finally {
            setIsReRouting(false);
        }
    };

    const companyRequests = loggedInCompany ? requests.filter(r => r.companyId === loggedInCompany.id) : [];
    const activeRequests = companyRequests.filter(r => r.status === 'active' || r.status === 'transferred');
    const completedRequests = companyRequests.filter(r => r.status === 'completed');
    const rejectedRequests = companyRequests.filter(r => r.status === 'rejected');
    const partialRequests = companyRequests.filter(r => r.status === 'partial');

    const handleRecreateFromPartial = (req: ServiceRequest) => {
        if (!req.remainingServices) return;
        setPlateNumber(req.plateNumber);
        setServiceDescription(req.remainingServices);
        setTargetBranchIds(['all']);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.success(`تم نسخ البيانات! تفضل بمراجعة تفاصيل طلب الخدمات المتبقية في الأعلى وتأكيد إرساله كطلب جديد.`);
    };

    const handleRepeatRequest = (req: ServiceRequest) => {
        setPlateNumber(req.plateNumber);
        setServiceDescription(req.serviceDescription);
        setTargetBranchIds(req.targetBranchIds || ['all']);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.success(`تم نسخ بيانات السيارة والخدمة المطلوبة! تفضل بمراجعة التفاصيل وتأكيد إرسال الطلب في الأعلى.`);
    };

    const getBranchNamesStr = (ids: string[]) => {
        if (!ids || ids.includes('all')) return 'جميع الفروع (الكل)';
        return ids.map(id => branches.find(b => b.id === id)?.name || id).join('، ');
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', padding: '0 16px', direction: 'rtl' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Loader2 className="animate-spin" size={40} style={{ color: 'var(--primary-color)' }} />
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>جاري التحميل...</p>
                </div>
            </div>
        );
    }

    if (!loggedInCompany) {
        return <Navigate to="/login?type=company" replace />;
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '24px auto', padding: '0 16px', direction: 'rtl' }}>
            {/* Top Selector Card */}
            <div className="glass animate-fade-in" style={{ padding: '24px 32px', borderRadius: '20px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 850, color: 'var(--text-primary)' }}>
                        🏢 لوحة تحكم الشركات B2B
                    </h2>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                        مرحباً بك، أنت مسجل الدخول باسم: <strong style={{ color: 'var(--primary-color)', fontWeight: 800 }}>{loggedInCompany.name}</strong>
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {activeTab === null ? (
                    /* Quick Actions / Categories Navigation Grid */
                    <div className="company-actions-grid animate-fade-in">
                    {/* 1. Create Request */}
                    <div 
                        onClick={() => setActiveTab('create')}
                        className="glass hover-scale tap-effect"
                        style={{
                            padding: '20px',
                            borderRadius: '16px',
                            background: activeTab === 'create' ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)' : 'var(--surface-color)',
                            border: activeTab === 'create' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'center',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: activeTab === 'create' ? '0 10px 20px -5px rgba(59, 130, 246, 0.2)' : 'none'
                        }}
                    >
                        <div style={{ background: activeTab === 'create' ? 'var(--primary-color)' : 'rgba(59, 130, 246, 0.1)', color: activeTab === 'create' ? 'white' : 'var(--primary-color)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                            <PlusCircle size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800 }}>إنشاء طلب جديد</h4>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>تعبئة وتوجيه سيارة جديدة</span>
                        </div>
                    </div>

                    {/* 2. Active Requests */}
                    <div 
                        onClick={() => setActiveTab('active')}
                        className="glass hover-scale tap-effect"
                        style={{
                            padding: '20px',
                            borderRadius: '16px',
                            background: activeTab === 'active' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)' : 'var(--surface-color)',
                            border: activeTab === 'active' ? '2px solid var(--accent-orange)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'center',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: activeTab === 'active' ? '0 10px 20px -5px rgba(245, 158, 11, 0.2)' : 'none'
                        }}
                    >
                        <div style={{ background: activeTab === 'active' ? 'var(--accent-orange)' : 'rgba(245, 158, 11, 0.1)', color: activeTab === 'active' ? 'white' : 'var(--accent-orange)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                            <ClipboardList size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800 }}>
                                الطلبات النشطة
                                <span style={{ background: 'var(--accent-orange)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', marginInlineStart: '6px', fontWeight: 800 }}>
                                    {activeRequests.length}
                                </span>
                            </h4>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>تتبع وتعديل توجيه المركبات</span>
                        </div>
                    </div>

                    {/* 3. Incomplete & Rejected */}
                    <div 
                        onClick={() => setActiveTab('issues')}
                        className="glass hover-scale tap-effect"
                        style={{
                            padding: '20px',
                            borderRadius: '16px',
                            background: activeTab === 'issues' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)' : 'var(--surface-color)',
                            border: activeTab === 'issues' ? '2px solid var(--error)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'center',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: activeTab === 'issues' ? '0 10px 20px -5px rgba(239, 68, 68, 0.2)' : 'none'
                        }}
                    >
                        <div style={{ background: activeTab === 'issues' ? 'var(--error)' : 'rgba(239, 68, 68, 0.1)', color: activeTab === 'issues' ? 'white' : 'var(--error)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800 }}>
                                طلبات معلقة ومرفوضة
                                {(partialRequests.length + rejectedRequests.length) > 0 && (
                                    <span style={{ background: 'var(--error)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', marginInlineStart: '6px', fontWeight: 800 }}>
                                        {partialRequests.length + rejectedRequests.length}
                                    </span>
                                )}
                            </h4>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>خدمات ناقصة وطلبات مرفوضة</span>
                        </div>
                    </div>

                    {/* 4. Completed Requests */}
                    <div 
                        onClick={() => setActiveTab('completed')}
                        className="glass hover-scale tap-effect"
                        style={{
                            padding: '20px',
                            borderRadius: '16px',
                            background: activeTab === 'completed' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)' : 'var(--surface-color)',
                            border: activeTab === 'completed' ? '2px solid var(--success)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'center',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: activeTab === 'completed' ? '0 10px 20px -5px rgba(16, 185, 129, 0.2)' : 'none'
                        }}
                    >
                        <div style={{ background: activeTab === 'completed' ? 'var(--success)' : 'rgba(16, 185, 129, 0.1)', color: activeTab === 'completed' ? 'white' : 'var(--success)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800 }}>
                                الطلبات المنفذة
                                <span style={{ background: 'var(--success)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', marginInlineStart: '6px', fontWeight: 800 }}>
                                    {completedRequests.length}
                                </span>
                            </h4>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>سجل الخدمات المنفذة والمستلمة</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
                    <button
                        onClick={() => setActiveTab(null)}
                        className="hover-scale tap-effect"
                        style={{
                            alignSelf: 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--surface-color)',
                            border: '1px solid var(--border-color)',
                            padding: '10px 18px',
                            borderRadius: '12px',
                            color: 'var(--primary-color)',
                            fontSize: '14px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.25s',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            marginBottom: '4px'
                        }}
                    >
                        <ArrowRight size={16} /> رجوع للوحة التحكم الرئيسية
                    </button>

                {/* Create Request Section */}
                <div className="glass animate-slide-up" style={{ 
                    padding: '28px', 
                    borderRadius: '24px', 
                    background: 'var(--surface-color)', 
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.15)',
                    display: activeTab === 'create' ? 'block' : 'none'
                }}>
                    <h3 style={{ margin: '0 0 24px', fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary-color)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '12px' }}>
                            <PlusCircle size={22} />
                        </span>
                        إنشاء طلب خدمة جديد لـ ({loggedInCompany.name})
                    </h3>
                    <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            {/* Plate Number */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Car size={16} /> رقم لوحة السيارة:
                                </label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        placeholder="مثال: أ ب ج 1 2 3 4"
                                        value={plateNumber}
                                        onChange={(e) => setPlateNumber(e.target.value)}
                                        style={{
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: '2px solid var(--border-color)',
                                            background: 'var(--bg-color)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14.5px',
                                            fontWeight: 700,
                                            width: '100%',
                                            outline: 'none',
                                            transition: 'all 0.3s ease',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'var(--primary-color)';
                                            e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.15), inset 0 2px 4px rgba(0,0,0,0.01)';
                                        }}
                                        onBlur={(e) => {
                                            handlePlateBlur();
                                            e.target.style.borderColor = 'var(--border-color)';
                                            e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)';
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Service Description */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Wrench size={16} /> الخدمة المطلوبة:
                                </label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        placeholder="مثال: غيار زيت سوبر شل 10w30"
                                        value={serviceDescription}
                                        onChange={(e) => setServiceDescription(e.target.value)}
                                        style={{
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: '2px solid var(--border-color)',
                                            background: 'var(--bg-color)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14.5px',
                                            fontWeight: 700,
                                            width: '100%',
                                            outline: 'none',
                                            transition: 'all 0.3s ease',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'var(--primary-color)';
                                            e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.15), inset 0 2px 4px rgba(0,0,0,0.01)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'var(--border-color)';
                                            e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)';
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button (At the Top for easy access) */}
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            style={{
                                alignSelf: 'flex-start',
                                background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '14px 28px',
                                borderRadius: '14px',
                                fontWeight: 800,
                                fontSize: '14.5px',
                                cursor: 'pointer',
                                boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.35)',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(59, 130, 246, 0.45)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(59, 130, 246, 0.35)';
                            }}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                            {isSubmitting ? 'جاري إنشاء الطلب...' : 'إرسال الطلب وإنشاء الرقم'}
                        </button>

                        {/* Branch Selector Chip Grid */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                                <label style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                    <MapPin size={18} color="var(--primary-color)" /> الفروع الموجه إليها الطلب:
                                </label>
                            </div>

                            {/* Search Filter Input & Map Button Row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '240px' }}>
                                    <Search style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} size={16} color="var(--text-secondary)" />
                                    <input
                                        type="text"
                                        placeholder="ابحث عن فرع..."
                                        value={branchSearch}
                                        onChange={(e) => setBranchSearch(e.target.value)}
                                        style={{
                                            padding: '10px 38px',
                                            borderRadius: '12px',
                                            border: '1.5px solid var(--border-color)',
                                            background: 'var(--bg-color)',
                                            color: 'var(--text-primary)',
                                            fontSize: '13.5px',
                                            fontWeight: 600,
                                            width: '100%',
                                            outline: 'none',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'var(--primary-color)';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'var(--border-color)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                    {branchSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setBranchSearch('')}
                                            style={{ 
                                                position: 'absolute', 
                                                left: '12px', 
                                                top: '50%', 
                                                transform: 'translateY(-50%)',
                                                background: 'none', 
                                                border: 'none', 
                                                cursor: 'pointer', 
                                                padding: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <X size={16} color="var(--text-secondary)" />
                                        </button>
                                    )}
                                </div>
                                <a 
                                    href={`/map?type=company&hiddenBranches=${loggedInCompany?.hiddenBranchIds?.join(',') || ''}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: 'white',
                                        fontSize: '13.5px',
                                        fontWeight: 800,
                                        textDecoration: 'none',
                                        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)',
                                        padding: '10px 18px',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                                        transition: 'all 0.2s',
                                        height: '42px',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    🗺️ عرض الفروع على الخريطة التفاعلية
                                </a>
                            </div>
                            
                            <div style={{ 
                                maxHeight: '280px', 
                                overflowY: 'auto', 
                                padding: '12px', 
                                border: '1.5px solid var(--border-color)', 
                                borderRadius: '16px', 
                                background: 'rgba(0,0,0,0.02)',
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                                gap: '10px', 
                                marginTop: '6px',
                                scrollbarWidth: 'thin'
                            }}>
                                {/* "All" Option Badge */}
                                {(!branchSearch || normalizeArabicSimple('جميع الفروع (الكل)').includes(normalizeArabicSimple(branchSearch))) && (
                                    <button
                                        type="button"
                                        onClick={() => setTargetBranchIds(['all'])}
                                        style={{
                                            padding: '14px 18px',
                                            borderRadius: '16px',
                                            fontSize: '13.5px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            border: '2px solid ' + (targetBranchIds.includes('all') ? 'var(--primary-color)' : 'var(--border-color)'),
                                            background: targetBranchIds.includes('all') ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.08) 100%)' : 'var(--bg-color)',
                                            color: targetBranchIds.includes('all') ? 'var(--primary-color)' : 'var(--text-primary)',
                                            boxShadow: targetBranchIds.includes('all') ? '0 8px 20px -6px rgba(59, 130, 246, 0.35)' : 'none',
                                            transform: targetBranchIds.includes('all') ? 'scale(1.02)' : 'none',
                                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                            userSelect: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <Globe size={16} />
                                        <span>جميع الفروع (الكل)</span>
                                        {targetBranchIds.includes('all') && <Check size={16} strokeWidth={3} />}
                                    </button>
                                )}

                                {/* Individual Branch Badges */}
                                {(() => {
                                    const sorted = [...branches]
                                        .filter(b => !loggedInCompany.hiddenBranchIds?.includes(b.id))
                                        .sort((a, b) => getBranchScore(b.id) - getBranchScore(a.id));
                                    const cleanQuery = normalizeArabicSimple(branchSearch);
                                    const filtered = sorted.filter(b => 
                                        normalizeArabicSimple(b.name).includes(cleanQuery) || 
                                        (b.address && normalizeArabicSimple(b.address).includes(cleanQuery))
                                    );
                                    return filtered.map(b => {
                                        const isSelected = targetBranchIds.includes(b.id);
                                        const score = getBranchScore(b.id);
                                        const isTopUsed = score > 0;
                                        return (
                                            <button
                                                key={b.id}
                                                type="button"
                                                onClick={() => {
                                                    if (targetBranchIds.includes('all')) {
                                                        setTargetBranchIds([b.id]);
                                                    } else {
                                                        if (isSelected) {
                                                            const filteredIds = targetBranchIds.filter(id => id !== b.id);
                                                            setTargetBranchIds(filteredIds.length === 0 ? ['all'] : filteredIds);
                                                        } else {
                                                            setTargetBranchIds([...targetBranchIds, b.id]);
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    padding: '14px 18px',
                                                    borderRadius: '16px',
                                                    fontSize: '13.5px',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    border: '2px solid ' + (isSelected ? 'var(--primary-color)' : 'var(--border-color)'),
                                                    background: isSelected ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.08) 100%)' : 'var(--bg-color)',
                                                    color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)',
                                                    boxShadow: isSelected ? '0 8px 20px -6px rgba(59, 130, 246, 0.35)' : 'none',
                                                    transform: isSelected ? 'scale(1.02)' : 'none',
                                                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    userSelect: 'none',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                                                    <MapPin size={16} color={isSelected ? 'var(--primary-color)' : 'var(--text-secondary)'} />
                                                    <span>{b.name}</span>
                                                    {isSelected && <Check size={16} strokeWidth={3} style={{ marginLeft: 'auto' }} />}
                                                </div>
                                                {isTopUsed && (
                                                    <span style={{ 
                                                        fontSize: '9.5px', 
                                                        background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.12)', 
                                                        color: 'var(--accent-orange)', 
                                                        padding: '3px 8px', 
                                                        borderRadius: '6px', 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '3px', 
                                                        fontWeight: 800,
                                                        marginTop: '2px'
                                                    }}>
                                                        <Flame size={10} fill="var(--accent-orange)" /> الأكثر استخداماً
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                            
                            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '6px', display: 'block' }}>
                                * يتم ترتيب الفروع تلقائياً حسب الفروع الأكثر استخداماً من قبل شركتكم لتسهيل الاختيار.
                            </span>
                        </div>


                    </form>
                </div>

                {/* Lists Grid */}
                <div style={{ display: (activeTab === 'active' || activeTab === 'issues') ? 'grid' : 'none', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Active Requests */}
                    <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', display: activeTab === 'active' ? 'block' : 'none', gridColumn: 'span 2' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-orange)' }}>
                            <ClipboardList size={20} /> الطلبات النشطة والمحولة ({activeRequests.length})
                        </h3>
                        {activeRequests.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', margin: '30px 0' }}>
                                لا توجد طلبات نشطة حالياً.
                            </p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                {activeRequests.map(renderRequestCard)}
                            </div>
                        )}
                    </div>

                    {/* Rejected Requests */}
                    <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', display: activeTab === 'issues' ? 'block' : 'none' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}>
                            <AlertTriangle size={20} /> الطلبات المرفوضة ({rejectedRequests.length})
                        </h3>
                        {rejectedRequests.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', margin: '30px 0' }}>
                                لا توجد طلبات مرفوضة.
                            </p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                {rejectedRequests.map(renderRequestCard)}
                            </div>
                        )}
                    </div>

                    {/* Incomplete Requests (Partial Services) */}
                    <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', marginTop: '0px', display: activeTab === 'issues' ? 'block' : 'none' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-orange)' }}>
                            <AlertTriangle size={20} /> طلبات بخدمات ناقصة ({partialRequests.length})
                        </h3>
                        {partialRequests.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', margin: '30px 0' }}>
                                لا توجد طلبات بخدمات ناقصة.
                            </p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                {partialRequests.map(renderRequestCard)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Completed Requests */}
                <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', display: activeTab === 'completed' ? 'block' : 'none' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
                        <CheckCircle size={20} /> الطلبات المنفذة والمستلمة ({completedRequests.length})
                    </h3>
                    {completedRequests.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', margin: '30px 0' }}>
                            لا توجد طلبات منفذة بعد.
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                            {completedRequests.map(renderRequestCard)}
                        </div>
                    )}
                </div>
                </div>
            )}
            </div>

            {/* Re-Route branch Modal */}
            {reRouteRequest && (
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
                        maxWidth: '460px',
                        padding: '24px',
                        position: 'relative',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                    }}>
                        <button 
                            onClick={() => setReRouteRequest(null)}
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
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>

                        <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>تعديل توجيه الطلب (إعادة التعيين)</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            تعديل الفروع المستهدفة للطلب رقم <strong style={{ color: 'var(--accent-orange)' }}>{reRouteRequest.id}</strong> (اللوحة: {reRouteRequest.plateNumber})
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', textAlign: 'right' }}>
                            <label style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={18} color="var(--primary-color)" /> الفروع الموجه إليها الطلب:
                            </label>

                            {/* Search Filter Input */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', maxWidth: '100%', marginBottom: '4px' }}>
                                <Search style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} size={15} color="var(--text-secondary)" />
                                <input
                                    type="text"
                                    placeholder="ابحث عن فرع..."
                                    value={reRouteBranchSearch}
                                    onChange={(e) => setReRouteBranchSearch(e.target.value)}
                                    style={{
                                        padding: '8px 36px 8px 36px',
                                        borderRadius: '10px',
                                        border: '1.5px solid var(--border-color)',
                                        background: 'var(--bg-color)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        width: '100%',
                                        outline: 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary-color)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--border-color)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                {reRouteBranchSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setReRouteBranchSearch('')}
                                        style={{ 
                                            position: 'absolute', 
                                            left: '12px', 
                                            background: 'none', 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            padding: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <X size={15} color="var(--text-secondary)" />
                                    </button>
                                )}
                            </div>
                            
                            <div style={{ 
                                maxHeight: '260px', 
                                overflowY: 'auto', 
                                padding: '10px', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: '16px', 
                                background: 'rgba(0,0,0,0.02)',
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                                gap: '10px', 
                                marginTop: '6px',
                                scrollbarWidth: 'thin'
                            }}>
                                {/* "All" Option Badge */}
                                {(!reRouteBranchSearch || normalizeArabicSimple('الكل (جميع الفروع)').includes(normalizeArabicSimple(reRouteBranchSearch))) && (
                                    <button
                                        type="button"
                                        onClick={() => setNewTargetBranchIds(['all'])}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: '12px',
                                            fontSize: '12.5px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            border: '2px solid ' + (newTargetBranchIds.includes('all') ? 'var(--primary-color)' : 'var(--border-color)'),
                                            background: newTargetBranchIds.includes('all') ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.06) 100%)' : 'var(--bg-color)',
                                            color: newTargetBranchIds.includes('all') ? 'var(--primary-color)' : 'var(--text-primary)',
                                            boxShadow: newTargetBranchIds.includes('all') ? '0 6px 16px -4px rgba(59, 130, 246, 0.25)' : 'none',
                                            transform: newTargetBranchIds.includes('all') ? 'scale(1.02)' : 'none',
                                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                            userSelect: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Globe size={14} />
                                        <span>الكل (جميع الفروع)</span>
                                        {newTargetBranchIds.includes('all') && <Check size={14} strokeWidth={3} />}
                                    </button>
                                )}

                                {/* Individual Branch Badges */}
                                {(() => {
                                    const sorted = [...branches]
                                        .filter(b => !loggedInCompany.hiddenBranchIds?.includes(b.id))
                                        .sort((a, b) => getBranchScore(b.id) - getBranchScore(a.id));
                                    const cleanQuery = normalizeArabicSimple(reRouteBranchSearch);
                                    const filtered = sorted.filter(b => 
                                        normalizeArabicSimple(b.name).includes(cleanQuery) || 
                                        (b.address && normalizeArabicSimple(b.address).includes(cleanQuery))
                                    );
                                    return filtered.map(b => {
                                        const isSelected = newTargetBranchIds.includes(b.id);
                                        const score = getBranchScore(b.id);
                                        const isTopUsed = score > 0;
                                        return (
                                            <button
                                                key={b.id}
                                                type="button"
                                                onClick={() => {
                                                    if (newTargetBranchIds.includes('all')) {
                                                        setNewTargetBranchIds([b.id]);
                                                    } else {
                                                        if (isSelected) {
                                                            const filteredIds = newTargetBranchIds.filter(id => id !== b.id);
                                                            setNewTargetBranchIds(filteredIds.length === 0 ? ['all'] : filteredIds);
                                                        } else {
                                                            setNewTargetBranchIds([...newTargetBranchIds, b.id]);
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    padding: '12px 14px',
                                                    borderRadius: '12px',
                                                    fontSize: '12.5px',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    border: '2px solid ' + (isSelected ? 'var(--primary-color)' : 'var(--border-color)'),
                                                    background: isSelected ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.06) 100%)' : 'var(--bg-color)',
                                                    color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)',
                                                    boxShadow: isSelected ? '0 6px 16px -4px rgba(59, 130, 246, 0.25)' : 'none',
                                                    transform: isSelected ? 'scale(1.02)' : 'none',
                                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    userSelect: 'none',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}>
                                                    <MapPin size={14} color={isSelected ? 'var(--primary-color)' : 'var(--text-secondary)'} />
                                                    <span>{b.name}</span>
                                                    {isSelected && <Check size={14} strokeWidth={3} style={{ marginLeft: 'auto' }} />}
                                                </div>
                                                {isTopUsed && (
                                                    <span style={{ 
                                                        fontSize: '8.5px', 
                                                        background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.12)', 
                                                        color: 'var(--accent-orange)', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px', 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '2px', 
                                                        fontWeight: 800,
                                                        marginTop: '1px'
                                                    }}>
                                                        <Flame size={8} fill="var(--accent-orange)" /> مفضل
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleExecuteReRoute}
                                disabled={isReRouting}
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
                                {isReRouting ? 'جاري الحفظ...' : 'تحديث وتنشيط الطلب'}
                            </button>
                            <button
                                onClick={() => setReRouteRequest(null)}
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
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Viewer Modal */}
            {selectedQrRequest && (
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
                                cursor: 'pointer'
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>الخدمة المطلوبة:</span>
                                <span style={{ fontWeight: 600, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={selectedQrRequest.serviceDescription}>
                                    {selectedQrRequest.serviceDescription}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>الفروع الموجه إليها:</span>
                                <span style={{ fontWeight: 600, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--primary-color)' }}>
                                    {getBranchNamesStr(selectedQrRequest.targetBranchIds)}
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
                                onClick={() => handleShareRequest(selectedQrRequest)}
                                style={{
                                    flex: 1,
                                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
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
                                    boxShadow: '0 6px 18px rgba(34, 197, 94, 0.35)',
                                    transition: 'all 0.25s'
                                }}
                            >
                                <Share2 size={18} /> مشاركة الطلب
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

            {/* newlyCreatedRequest Modal */}
            {newlyCreatedRequest && (
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
                        maxWidth: '420px',
                        padding: '32px 24px 24px',
                        position: 'relative',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        textAlign: 'center'
                    }}>
                        <button 
                            onClick={() => setNewlyCreatedRequest(null)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: 0
                            }}
                            className="hover-scale"
                        >
                            <X size={18} />
                        </button>

                        <div style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e',
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <Check size={30} />
                        </div>

                        <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)' }}>🎉 تم إنشاء الطلب بنجاح!</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>بإمكانك الآن مشاركة الطلب مباشرة مع السائق أو فتح كود الاستجابة</p>

                        <div style={{
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            padding: '16px',
                            marginBottom: '24px',
                            textAlign: 'right',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>رقم الطلب:</span>
                                <span style={{ fontWeight: 800, color: 'var(--primary-color)' }}>#{newlyCreatedRequest.id}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>رقم اللوحة:</span>
                                <span style={{ fontWeight: 700 }}>{newlyCreatedRequest.plateNumber}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>الخدمة المطلوبة:</span>
                                <span style={{ fontWeight: 700 }}>{newlyCreatedRequest.serviceDescription}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                const shareUrl = `${window.location.origin}/qr?id=${newlyCreatedRequest.id}`;
                                const shareText = `🚗 *مراكز خدمة سلمان زمام الخالدي | Salman Zmam Al-Khaldi Service Centers* 🚗\n\nالرجاء الضغط على الرابط أدناه لعرض تفاصيل طلب الصيانة والباركود:\nPlease click the link below to view your maintenance request details and barcode:\n\n📍 ${shareUrl}`;
                                openWhatsAppShare(shareText);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                width: '100%',
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '14.5px',
                                cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(34, 197, 94, 0.25)',
                                marginBottom: '12px',
                                transition: 'all 0.2s'
                            }}
                            className="hover-scale tap-effect"
                        >
                            <Share2 size={16} />
                            مشاركة عبر الواتساب (WhatsApp)
                        </button>

                        <button
                            onClick={() => {
                                window.open(`/qr?id=${newlyCreatedRequest.id}`, '_blank');
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                width: '100%',
                                background: 'rgba(59, 130, 246, 0.08)',
                                color: 'var(--primary-color)',
                                border: '1.5px solid rgba(59, 130, 246, 0.2)',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '14.5px',
                                cursor: 'pointer',
                                marginBottom: '16px',
                                transition: 'all 0.2s'
                            }}
                            className="hover-scale tap-effect"
                        >
                            <QrCode size={16} />
                            عرض الباركود والبيانات
                        </button>

                        <button
                            onClick={() => setNewlyCreatedRequest(null)}
                            style={{
                                width: '100%',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#ef4444',
                                border: '1.5px solid rgba(239, 68, 68, 0.2)',
                                padding: '11px 16px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            className="hover-scale tap-effect"
                        >
                            إغلاق النافذة
                        </button>
                    </div>
                </div>
            )}

            {/* detailedRequest Modal */}
            {detailedRequest && (
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
                        maxWidth: '420px',
                        padding: '32px 24px 24px',
                        position: 'relative',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        textAlign: 'center'
                    }}>
                        <button 
                            onClick={() => setDetailedRequest(null)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: 0
                            }}
                            className="hover-scale"
                        >
                            <X size={18} />
                        </button>

                        <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)' }}>📋 تفاصيل طلب الخدمة</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>رقم المعرف الفريد للطلب: #{detailedRequest.id}</p>

                        <div style={{
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            padding: '16px',
                            marginBottom: '24px',
                            textAlign: 'right',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>رقم اللوحة:</span>
                                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{detailedRequest.plateNumber}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>الخدمة المطلوبة:</span>
                                <span style={{ fontWeight: 700 }}>{detailedRequest.serviceDescription}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>الفروع الموجه إليها الطلب:</span>
                                <span style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '12.5px' }}>{getBranchNamesStr(detailedRequest.targetBranchIds)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>حالة الطلب:</span>
                                <span style={{ 
                                    fontWeight: 800, 
                                    color: detailedRequest.status === 'completed' ? 'var(--success)' : detailedRequest.status === 'rejected' ? 'var(--error)' : 'var(--accent-orange)' 
                                }}>
                                    {detailedRequest.status === 'completed' ? '🟢 مكتمل / تم الصيانة' : detailedRequest.status === 'rejected' ? '🔴 مرفوض' : detailedRequest.status === 'transferred' ? '🔵 محول' : '🟡 نشط معلق'}
                                </span>
                            </div>
                            {detailedRequest.status === 'rejected' && detailedRequest.rejectionReason && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(239, 68, 68, 0.05)', padding: '8px', borderRadius: '8px', borderLeft: '3px solid var(--error)' }}>
                                    <span style={{ color: 'var(--error)', fontSize: '12px', fontWeight: 800 }}>سبب الرفض:</span>
                                    <span style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>{detailedRequest.rejectionReason}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>تاريخ الإنشاء:</span>
                                <span style={{ fontSize: '12.5px' }}>{new Date(detailedRequest.createdAt).toLocaleString('ar-SA')}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    handleShareRequest(detailedRequest);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 18px rgba(34, 197, 94, 0.25)',
                                    transition: 'all 0.2s'
                                }}
                                className="hover-scale tap-effect"
                            >
                                <Share2 size={16} />
                                مشاركة عبر الواتساب (WhatsApp)
                            </button>

                            <button
                                onClick={() => {
                                    setSelectedQrRequest(detailedRequest);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    background: 'rgba(59, 130, 246, 0.08)',
                                    color: 'var(--primary-color)',
                                    border: '1.5px solid rgba(59, 130, 246, 0.2)',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                className="hover-scale tap-effect"
                            >
                                <QrCode size={16} />
                                عرض رمز الـ QR والباركود
                            </button>

                            <button
                                onClick={() => {
                                    handleCopyShareLink(detailedRequest);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    background: 'var(--bg-color)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                className="hover-scale tap-effect"
                            >
                                <Link2 size={16} />
                                نسخ رابط التوجيه الخرائطي
                            </button>

                            <button
                                onClick={() => {
                                    handleRepeatRequest(detailedRequest);
                                    setDetailedRequest(null);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    background: 'rgba(59, 130, 246, 0.08)',
                                    color: 'var(--primary-color)',
                                    border: '1.5px solid rgba(59, 130, 246, 0.2)',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                className="hover-scale tap-effect"
                            >
                                <RefreshCw size={16} />
                                تكرار الطلب كطلب جديد
                            </button>

                            {(detailedRequest.status === 'active' || detailedRequest.status === 'transferred' || detailedRequest.status === 'rejected') && (
                                <button
                                    onClick={() => {
                                        openReRouteModal(detailedRequest);
                                        setDetailedRequest(null);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                                        transition: 'all 0.2s'
                                    }}
                                    className="hover-scale tap-effect"
                                >
                                    <ArrowLeftRight size={16} />
                                    تعديل توجيه فروع الطلب
                                </button>
                            )}

                            {detailedRequest.status === 'partial' && (
                                <button
                                    onClick={() => {
                                        handleRecreateFromPartial(detailedRequest);
                                        setDetailedRequest(null);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                                        transition: 'all 0.2s'
                                    }}
                                    className="hover-scale tap-effect"
                                >
                                    <RefreshCw size={16} />
                                    تحويل الخدمات المتبقية لطلب جديد
                                </button>
                            )}

                            <button
                                onClick={() => setDetailedRequest(null)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    color: '#ef4444',
                                    border: '1.5px solid rgba(239, 68, 68, 0.2)',
                                    padding: '11px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                className="hover-scale tap-effect"
                            >
                                إغلاق النافذة
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyDashboard;
