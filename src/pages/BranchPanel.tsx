import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { subscribeToBranches, subscribeToServiceRequests, updateServiceRequestStatus } from '../services/storage';
import type { Branch, ServiceRequest } from '../types';
import { Search, CheckCircle, Clock, AlertTriangle, QrCode, X, Loader2, ArrowLeftRight, Ban, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';

const BranchPanel: React.FC = () => {
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Rejection dialog states
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // Partial completion dialog states
    const [showPartialDialog, setShowPartialDialog] = useState(false);
    const [partialRemainingServices, setPartialRemainingServices] = useState('');

    // Login and session states
    const [loggedInBranch, setLoggedInBranch] = useState<Branch | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Tabs and history logs state
    const [activeTab, setActiveTab] = useState<'scan' | 'search' | 'today' | 'history'>('scan');
    const [historySearchQuery, setHistorySearchQuery] = useState('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'completed' | 'rejected' | 'transferred' | 'partial'>('all');

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
                             // Extract ID from full URL or use raw string
                            let cleanText = decodedText.trim();
                            if (cleanText.includes('/')) {
                                const parts = cleanText.split('/');
                                cleanText = parts[parts.length - 1];
                            }
                            setSearchQuery(cleanText);
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
            const storedBranchId = localStorage.getItem('logged_branch_id');
            if (storedBranchId) {
                const found = data.find(b => b.id === storedBranchId);
                if (found) {
                    setLoggedInBranch(found);
                }
            }
            setIsLoading(false);
        });
        const unsubRequests = subscribeToServiceRequests(setRequests);
        return () => { unsubBranches(); unsubRequests(); };
    }, []);


    // Search query matches
    const matchedRequest = searchQuery.trim() 
        ? requests.find(r => r.id.toLowerCase() === searchQuery.trim().toLowerCase()) 
        : null;

    // Check if branch can accept this order
    const isTargetBranch = matchedRequest && loggedInBranch 
        ? (matchedRequest.targetBranchIds?.includes('all') || matchedRequest.targetBranchIds?.includes(loggedInBranch.id) || matchedRequest.status === 'transferred')
        : false;

    const handleCompleteRequest = async () => {
        if (!matchedRequest || !isTargetBranch) return;
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

    const handleTransferRequest = async () => {
        if (!matchedRequest) return;
        if (!loggedInBranch) {
            toast.error('الرجاء تسجيل الدخول أولاً');
            return;
        }

        setIsProcessing(true);
        try {
            await updateServiceRequestStatus(
                matchedRequest.id,
                'transferred',
                loggedInBranch.id,
                loggedInBranch.name
            );
            toast.success(`تم تحويل الطلب ${matchedRequest.id} وتعميمه على كافة الفروع بنجاح 🔄`);
            setSearchQuery('');
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء تحويل الطلب');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectRequest = async () => {
        if (!matchedRequest) return;
        if (!loggedInBranch) {
            toast.error('الرجاء تسجيل الدخول أولاً');
            return;
        }
        if (!rejectionReason.trim()) {
            toast.error('الرجاء كتابة سبب الرفض');
            return;
        }

        setIsProcessing(true);
        try {
            await updateServiceRequestStatus(
                matchedRequest.id,
                'rejected',
                loggedInBranch.id,
                loggedInBranch.name,
                rejectionReason.trim()
            );
            toast.success(`تم رفض الطلب ${matchedRequest.id} وإعادته للشركة ❌`);
            setShowRejectDialog(false);
            setRejectionReason('');
            setSearchQuery('');
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء رفض الطلب');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePartialRequest = async () => {
        if (!matchedRequest) return;
        if (!loggedInBranch) {
            toast.error('الرجاء تسجيل الدخول أولاً');
            return;
        }
        if (!partialRemainingServices.trim()) {
            toast.error('الرجاء كتابة الخدمات المتبقية التي لم يتم تنفيذها');
            return;
        }

        setIsProcessing(true);
        try {
            await updateServiceRequestStatus(
                matchedRequest.id,
                'partial',
                loggedInBranch.id,
                loggedInBranch.name,
                undefined,
                partialRemainingServices.trim()
            );
            toast.success(`تم تسجيل الطلب ${matchedRequest.id} كخدمات ناقصة وإرساله للشركة ⚠️`);
            setShowPartialDialog(false);
            setPartialRemainingServices('');
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

    // All requests processed by this branch (completed, rejected, transferred, partial)
    const branchAllProcessed = loggedInBranch ? requests.filter(r => 
        r.branchId === loggedInBranch.id &&
        r.completedAt &&
        (r.status === 'completed' || r.status === 'rejected' || r.status === 'transferred' || r.status === 'partial')
    ).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)) : [];

    // Filtered history list based on search and status selector
    const filteredHistory = branchAllProcessed.filter(r => {
        const query = historySearchQuery.trim().toLowerCase();
        const matchesSearch = !query || 
            r.id.toLowerCase().includes(query) ||
            r.plateNumber.toLowerCase().includes(query) ||
            r.companyName.toLowerCase().includes(query) ||
            (r.serviceDescription && r.serviceDescription.toLowerCase().includes(query)) ||
            (r.rejectionReason && r.rejectionReason.toLowerCase().includes(query));
        
        const matchesStatus = historyStatusFilter === 'all' || r.status === historyStatusFilter;
        return matchesSearch && matchesStatus;
    });

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

    if (!loggedInBranch) {
        return <Navigate to="/login?type=branch" replace />;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '24px auto', padding: '0 16px', direction: 'rtl' }}>
            {/* Top Info Card */}
            <div className="glass animate-fade-in" style={{ padding: '24px 32px', borderRadius: '20px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 850, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏪 بوابة موظفي الفروع
                    </h2>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                        الفرع الحالي: <strong style={{ color: 'var(--primary-color)', fontWeight: 800 }}>{loggedInBranch.name}</strong>
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Quick Action Category Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '8px' }}>
                    {/* 1. Scan QR Card */}
                    <div 
                        onClick={() => setActiveTab('scan')}
                        className="glass hover-scale tap-effect"
                        style={{
                            padding: '20px',
                            borderRadius: '16px',
                            background: activeTab === 'scan' ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)' : 'var(--surface-color)',
                            border: activeTab === 'scan' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'center',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: activeTab === 'scan' ? '0 10px 20px -5px rgba(59, 130, 246, 0.2)' : 'none'
                        }}
                    >
                        <div style={{ background: activeTab === 'scan' ? 'var(--primary-color)' : 'rgba(59, 130, 246, 0.1)', color: activeTab === 'scan' ? 'white' : 'var(--primary-color)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                            <QrCode size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800 }}>مسح الرمز (QR)</h4>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>مسح سريع للطلب</span>
                        </div>
                    </div>

                    {/* 2. Manual Search Card */}
                    <div 
                        onClick={() => setActiveTab('search')}
                        className="glass hover-scale tap-effect"
                        style={{
                            padding: '20px',
                            borderRadius: '16px',
                            background: activeTab === 'search' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)' : 'var(--surface-color)',
                            border: activeTab === 'search' ? '2px solid var(--accent-orange)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'center',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: activeTab === 'search' ? '0 10px 20px -5px rgba(245, 158, 11, 0.2)' : 'none'
                        }}
                    >
                        <div style={{ background: activeTab === 'search' ? 'var(--accent-orange)' : 'rgba(245, 158, 11, 0.1)', color: activeTab === 'search' ? 'white' : 'var(--accent-orange)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                            <Search size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800 }}>البحث اليدوي</h4>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>رقم الطلب أو اللوحة</span>
                        </div>
                    </div>

                    {/* 3. Today's Operations Card */}
                    <div 
                        onClick={() => setActiveTab('today')}
                        className="glass hover-scale tap-effect"
                        style={{
                            padding: '20px',
                            borderRadius: '16px',
                            background: activeTab === 'today' ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)' : 'var(--surface-color)',
                            border: activeTab === 'today' ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'center',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: activeTab === 'today' ? '0 10px 20px -5px rgba(139, 92, 246, 0.2)' : 'none'
                        }}
                    >
                        <div style={{ background: activeTab === 'today' ? '#8b5cf6' : 'rgba(139, 92, 246, 0.1)', color: activeTab === 'today' ? 'white' : '#8b5cf6', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800 }}>
                                عمليات اليوم
                                <span style={{ background: '#8b5cf6', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', marginInlineStart: '6px', fontWeight: 800 }}>
                                    {branchCompletedToday.length}
                                </span>
                            </h4>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>المركبات المنجزة اليوم</span>
                        </div>
                    </div>

                    {/* 4. Operations History Card */}
                    <div 
                        onClick={() => setActiveTab('history')}
                        className="glass hover-scale tap-effect"
                        style={{
                            padding: '20px',
                            borderRadius: '16px',
                            background: activeTab === 'history' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)' : 'var(--surface-color)',
                            border: activeTab === 'history' ? '2px solid var(--success)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'center',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: activeTab === 'history' ? '0 10px 20px -5px rgba(16, 185, 129, 0.2)' : 'none'
                        }}
                    >
                        <div style={{ background: activeTab === 'history' ? 'var(--success)' : 'rgba(16, 185, 129, 0.1)', color: activeTab === 'history' ? 'white' : 'var(--success)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                            <History size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800 }}>
                                سجل العمليات
                                <span style={{ background: 'var(--success)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', marginInlineStart: '6px', fontWeight: 800 }}>
                                    {branchAllProcessed.length}
                                </span>
                            </h4>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>الأرشيف الكامل للفروع</span>
                        </div>
                    </div>
                </div>

                {/* Scan Tab Panel */}
                <div className="glass animate-slide-up" style={{ 
                    padding: '40px 32px', 
                    borderRadius: '24px', 
                    background: 'var(--surface-color)', 
                    border: '1px solid var(--border-color)',
                    textAlign: 'center',
                    boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.15)',
                    display: activeTab === 'scan' ? 'flex' : 'none',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px'
                }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', width: '72px', height: '72px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                        <QrCode size={36} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 850, color: 'var(--text-primary)' }}>
                        مسح رمز استلام الخدمة (QR Code)
                    </h3>
                    <p style={{ margin: '0 max(16px, 10%)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        قم بمسح رمز الاستجابة السريعة (QR Code) المعروض على هاتف السائق لاستلام الطلب والبدء في تقديم الخدمة فوراً.
                    </p>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="hover-scale tap-effect"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '16px 36px',
                            borderRadius: '16px',
                            fontWeight: 850,
                            fontSize: '15.5px',
                            cursor: 'pointer',
                            transition: 'all 0.25s',
                            boxShadow: '0 10px 24px rgba(59, 130, 246, 0.35)',
                            marginTop: '12px'
                        }}
                    >
                        <QrCode size={20} /> فتح الكاميرا للمسح التلقائي
                    </button>
                </div>

                {/* Search Order Card */}
                <div className="glass animate-slide-up" style={{ 
                    padding: '32px', 
                    borderRadius: '24px', 
                    background: 'var(--surface-color)', 
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.15)',
                    display: activeTab === 'search' ? 'block' : 'none'
                }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '1.35rem', fontWeight: 850, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)' }}>
                        🔍 البحث عن طلب خدمة واستلامه
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', width: '100%', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 2, minWidth: '280px' }}>
                            <Search style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                            <input 
                                type="text"
                                placeholder="ادخل رقم الطلب هنا... (مثال: RQ-1234)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '14px 46px 14px 16px',
                                    borderRadius: '12px',
                                    border: '2px solid var(--border-color)',
                                    background: 'var(--bg-color)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14.5px',
                                    fontWeight: 700,
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
                        <button
                            onClick={() => setIsScannerOpen(true)}
                            className="hover-scale tap-effect"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '14px 24px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '14.5px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.35)',
                                height: '51px',
                                boxSizing: 'border-box'
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
                                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', background: matchedRequest.status === 'active' || matchedRequest.status === 'transferred' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: matchedRequest.status === 'active' || matchedRequest.status === 'transferred' ? 'var(--accent-orange)' : 'var(--success)' }}>
                                            {matchedRequest.status === 'active' || matchedRequest.status === 'transferred' ? 'طلب نشط وجاهز للتنفيذ' : matchedRequest.status === 'rejected' ? 'طلب مرفوض' : 'طلب مكتمل ومستلم سابقاً'}
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

                                    {(matchedRequest.status === 'active' || matchedRequest.status === 'transferred') ? (
                                        !isTargetBranch ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--error)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px' }}>
                                                    <AlertTriangle size={18} />
                                                    <span>تنبيه: هذا الطلب غير موجه لفرعكم الحالي!</span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                                                    الرجاء التواصل مع إدارة الشركة أو المشرف لإعادة توجيه الطلب إلى فرعكم (<strong>{loggedInBranch.name}</strong>) ليصبح متاحاً للتنفيذ على النظام.
                                                </p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                                                <button 
                                                    onClick={handleCompleteRequest}
                                                    disabled={isProcessing}
                                                    style={{
                                                        background: 'var(--success)',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '12px 24px',
                                                        borderRadius: '10px',
                                                        fontWeight: 800,
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    <CheckCircle size={16} /> {isProcessing ? 'جاري التنفيذ...' : 'تنفيذ الطلب واستلامه'}
                                                </button>

                                                <button 
                                                    onClick={handleTransferRequest}
                                                    disabled={isProcessing}
                                                    style={{
                                                        background: 'rgba(59, 130, 246, 0.1)',
                                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                                        color: 'var(--primary-color)',
                                                        padding: '12px 20px',
                                                        borderRadius: '10px',
                                                        fontWeight: 800,
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    <ArrowLeftRight size={16} /> تحويل لكافة الفروع
                                                </button>

                                                <button 
                                                    onClick={() => setShowPartialDialog(true)}
                                                    disabled={isProcessing}
                                                    style={{
                                                        background: 'rgba(245, 158, 11, 0.1)',
                                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                                        color: 'var(--accent-orange)',
                                                        padding: '12px 20px',
                                                        borderRadius: '10px',
                                                        fontWeight: 800,
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    <AlertTriangle size={16} /> خدمات ناقصة
                                                </button>

                                                <button 
                                                    onClick={() => setShowRejectDialog(true)}
                                                    disabled={isProcessing}
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                        color: 'var(--error)',
                                                        padding: '12px 20px',
                                                        borderRadius: '10px',
                                                        fontWeight: 800,
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    <Ban size={16} /> رفض الطلب
                                                </button>
                                            </div>
                                        )
                                    ) : matchedRequest.status === 'rejected' ? (
                                        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--error)', fontSize: '13px', fontWeight: 700 }}>
                                            ❌ هذا الطلب تم رفضه وإعادته للشركة. لمزيد من التعديلات يرجى إبلاغ الشركة بإعادة توجيهه.
                                        </div>
                                    ) : matchedRequest.status === 'partial' ? (
                                        <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)', color: 'var(--accent-orange)', fontSize: '13px', fontWeight: 700 }}>
                                            ⚠️ تم تنفيذ هذا الطلب مع وجود خدمات ناقصة في فرع: ({matchedRequest.branchName}) بتاريخ {matchedRequest.completedAt ? new Date(matchedRequest.completedAt).toLocaleString('ar-SA') : ''}. الخدمات المتبقية: ({matchedRequest.remainingServices})
                                        </div>
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

                {/* Unified Operations Log & History Card */}
                <div className="glass animate-slide-up" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', display: (activeTab === 'today' || activeTab === 'history') ? 'block' : 'none' }}>
                    {/* Tab Buttons */}
                    <div style={{ display: 'none', borderBottom: '2px solid var(--border-color)', marginBottom: '20px', gap: '20px' }}>
                        <button
                            onClick={() => setActiveTab('today')}
                            style={{
                                padding: '12px 8px',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'today' ? '3px solid var(--primary-color)' : '3px solid transparent',
                                color: activeTab === 'today' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'today' ? 800 : 600,
                                fontSize: '15px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                marginBottom: '-2px'
                            }}
                        >
                            <CheckCircle size={18} />
                            عمليات اليوم
                            <span style={{ fontSize: '11px', background: activeTab === 'today' ? 'var(--primary-color)' : 'var(--border-color)', color: activeTab === 'today' ? 'white' : 'var(--text-secondary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                                {branchCompletedToday.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            style={{
                                padding: '12px 8px',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'history' ? '3px solid var(--primary-color)' : '3px solid transparent',
                                color: activeTab === 'history' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'history' ? 800 : 600,
                                fontSize: '15px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                marginBottom: '-2px'
                            }}
                        >
                            <History size={18} />
                            سجل العمليات الكامل
                            <span style={{ fontSize: '11px', background: activeTab === 'history' ? 'var(--primary-color)' : 'var(--border-color)', color: activeTab === 'history' ? 'white' : 'var(--text-secondary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                                {branchAllProcessed.length}
                            </span>
                        </button>
                    </div>

                    {/* Tab 1: Today's completed requests */}
                    {activeTab === 'today' && (
                        <div>
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
                    )}

                    {/* Tab 2: Full history of processed requests */}
                    {activeTab === 'history' && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Search and Filter panel */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                    <Search style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={16} />
                                    <input 
                                        type="text"
                                        placeholder="ابحث برقم اللوحة، الطلب، الشركة..."
                                        value={historySearchQuery}
                                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 32px 8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-color)',
                                            color: 'var(--text-primary)',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                                    {(['all', 'completed', 'rejected', 'transferred', 'partial'] as const).map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setHistoryStatusFilter(status)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: historyStatusFilter === status ? 'var(--primary-color)' : 'var(--border-color)',
                                                background: historyStatusFilter === status ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                color: historyStatusFilter === status ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {status === 'all' && 'الكل'}
                                            {status === 'completed' && 'منفذة 🟢'}
                                            {status === 'rejected' && 'مرفوضة ❌'}
                                            {status === 'transferred' && 'محولة 🔄'}
                                            {status === 'partial' && 'ناقصة ⚠️'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* History list */}
                            {filteredHistory.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', margin: '30px 0' }}>
                                    لم يتم العثور على أي عمليات مطابقة للفلاتر.
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {filteredHistory.map(r => (
                                        <div 
                                            key={r.id} 
                                            style={{ 
                                                padding: '14px 16px', 
                                                background: 'var(--bg-color)', 
                                                borderRadius: '12px', 
                                                border: '1px solid var(--border-color)', 
                                                display: 'flex', 
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                <div>
                                                    <span style={{ fontWeight: 800, fontSize: '14px', marginLeft: '8px' }}>رقم اللوحة: {r.plateNumber}</span>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({r.id})</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    {r.status === 'completed' && (
                                                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
                                                            🟢 مكتمل
                                                        </span>
                                                    )}
                                                    {r.status === 'rejected' && (
                                                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--error)' }}>
                                                            ❌ مرفوض
                                                        </span>
                                                    )}
                                                    {r.status === 'transferred' && (
                                                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary-color)' }}>
                                                            🔄 محول للكل
                                                        </span>
                                                    )}
                                                    {r.status === 'partial' && (
                                                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-orange)' }}>
                                                            ⚠️ خدمات ناقصة
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={12} /> {r.completedAt ? new Date(r.completedAt).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)' }}>الخدمة: </span>
                                                    <span style={{ fontWeight: 700 }}>{r.serviceDescription}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)' }}>الشركة: </span>
                                                    <span style={{ fontWeight: 700 }}>{r.companyName}</span>
                                                </div>
                                            </div>

                                            {r.status === 'rejected' && r.rejectionReason && (
                                                <div style={{ marginTop: '4px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', fontSize: '11px', color: 'var(--error)' }}>
                                                    <strong>سبب الرفض:</strong> {r.rejectionReason}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Rejection Warning Dialog */}
            {showRejectDialog && matchedRequest && (
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
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        textAlign: 'right'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)', marginBottom: '16px' }}>
                            <AlertTriangle size={24} />
                            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>هل أنت متأكد من رفض الطلب؟</h3>
                        </div>

                        <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '16px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                            ⚠️ <strong>تنبيه هام للورشة:</strong> نقترح عليك استخدام خيار <strong>"التحويل لكافة الفروع"</strong> بدلاً من الرفض التام، حيث يتيح ذلك للعميل التوجه لأي ورشة/فرع آخر دون حاجة الشركة لإرسال طلب جديد كلياً. 
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                            <label style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)' }}>سبب رفض الطلب:</label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="اكتب سبب الرفض هنا بالتفصيل (مثال: نقص قطع الغيار، انشغال الكادر...)"
                                style={{
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-color)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    minHeight: '80px',
                                    outline: 'none',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleRejectRequest}
                                disabled={isProcessing}
                                style={{
                                    flex: 1,
                                    background: 'var(--error)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                {isProcessing ? 'جاري الرفض...' : 'تأكيد الرفض النهائي'}
                            </button>
                            <button
                                onClick={handleTransferRequest}
                                disabled={isProcessing}
                                style={{
                                    flex: 1,
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                تحويل الفروع بدلاً من الرفض
                            </button>
                            <button
                                onClick={() => setShowRejectDialog(false)}
                                style={{
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
                                تراجع
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Partial Completion Warning Dialog */}
            {showPartialDialog && matchedRequest && (
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
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        textAlign: 'right'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-orange)', marginBottom: '16px' }}>
                            <AlertTriangle size={24} />
                            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>تسجيل خدمات ناقصة</h3>
                        </div>

                        <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '16px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                            ⚠️ <strong>تنبيه:</strong> سيتم تسجيل هذا الطلب كمنفذ جزئياً. سيظهر للشركة الخدمات المتبقية التي لم يتمكن الفرع من إكمالها ليتم إعادة توجيهها أو إنشاؤها كطلب جديد.
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                            <label style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)' }}>الخدمات المتبقية (التي لم يتم تنفيذها):</label>
                            <textarea
                                value={partialRemainingServices}
                                onChange={(e) => setPartialRemainingServices(e.target.value)}
                                placeholder="اكتب الخدمات المتبقية هنا بالتفصيل (مثال: ترصيص الإطارات الخلفية، تبديل فلتر الهواء...)"
                                style={{
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-color)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    minHeight: '80px',
                                    outline: 'none',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handlePartialRequest}
                                disabled={isProcessing}
                                style={{
                                    flex: 1,
                                    background: 'var(--accent-orange)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                {isProcessing ? 'جاري التسجيل...' : 'تأكيد الإرسال جزئياً'}
                            </button>
                            <button
                                onClick={() => setShowPartialDialog(false)}
                                style={{
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
                                تراجع
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera QR Scanner Modal */}
            {isScannerOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
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
