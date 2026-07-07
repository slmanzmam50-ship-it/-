import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, User, Building2, Store, ArrowRight, Shield, Loader2 } from 'lucide-react';
import { loginCompanyAccount, loginBranchAccount } from '../services/storage';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
    const [searchParams] = useSearchParams();
    const typeParam = searchParams.get('type') as 'admin' | 'company' | 'branch';
    
    // Subdomain / App Mode detection
    const hostname = window.location.hostname;
    let mode: 'admin' | 'company' | 'branch' | 'public' = 'public';

    if (hostname.startsWith('admin.') || hostname.includes('admin')) {
        mode = 'admin';
    } else if (hostname.startsWith('b2b.') || hostname.startsWith('company.') || hostname.includes('company') || hostname.includes('b2b')) {
        mode = 'company';
    } else if (hostname.startsWith('branch.') || hostname.startsWith('workshop.') || hostname.includes('branch') || hostname.includes('workshop')) {
        mode = 'branch';
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('appMode');
        if (modeParam === 'admin') mode = 'admin';
        else if (modeParam === 'company') mode = 'company';
        else if (modeParam === 'branch') mode = 'branch';
    }
    
    // Portal selection state
    const [selectedPortal, setSelectedPortal] = useState<'admin' | 'company' | 'branch' | null>(() => {
        if (mode !== 'public') return mode;
        if (typeParam === 'company' || typeParam === 'branch' || typeParam === 'admin') return typeParam;
        return null;
    });

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);

    // If query parameters or mode changes, update selected portal
    useEffect(() => {
        if (mode !== 'public') {
            setSelectedPortal(mode);
        } else if (typeParam === 'company' || typeParam === 'branch' || typeParam === 'admin') {
            setSelectedPortal(typeParam);
        }
    }, [typeParam, mode]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const u = username.trim();
            const p = password.trim();

            if (selectedPortal === 'admin') {
                if (u === 'ahmd.alyazidi2023@gmail.com' && p === 'Aa0539893200') {
                    localStorage.setItem('isAuthenticated', 'true');
                    toast.success('مرحباً بك! تم تسجيل الدخول للإدارة 👋');
                    navigate('/admin');
                } else {
                    setError('بيانات الدخول غير صحيحة ❌');
                    toast.error('بيانات الدخول غير صحيحة ❌');
                }
            } else if (selectedPortal === 'company') {
                if (!u || !p) {
                    toast.error('الرجاء إدخال اسم المستخدم وكلمة المرور');
                    setIsLoading(false);
                    return;
                }
                const result = await loginCompanyAccount(u, p);
                if (result) {
                    localStorage.setItem('logged_company_id', result.id);
                    localStorage.setItem('company_session_token', result.token);
                    toast.success(`مرحباً بك! تم تسجيل الدخول لـ ${result.name} 👋`);
                    navigate('/company');
                } else {
                    setError('اسم المستخدم أو كلمة المرور غير صحيحة ❌');
                    toast.error('اسم المستخدم أو كلمة المرور غير صحيحة ❌');
                }
            } else if (selectedPortal === 'branch') {
                if (!u || !p) {
                    toast.error('الرجاء إدخال اسم المستخدم وكلمة المرور');
                    setIsLoading(false);
                    return;
                }
                const result = await loginBranchAccount(u, p);
                if (result) {
                    localStorage.setItem('logged_branch_id', result.id);
                    localStorage.setItem('branch_session_token', result.token);
                    toast.success(`مرحباً بك! تم تسجيل الدخول لـ ${result.name} 👋`);
                    navigate('/branch');
                } else {
                    setError('اسم المستخدم أو كلمة المرور غير صحيحة ❌');
                    toast.error('اسم المستخدم أو كلمة المرور غير صحيحة ❌');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('حدث خطأ أثناء الاتصال بقاعدة البيانات. تأكد من اتصالك بالإنترنت.');
            toast.error('حدث خطأ في النظام');
        } finally {
            setIsLoading(false);
        }
    };

    // Card Selection Screen Render
    if (selectedPortal === null) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '85vh',
                padding: '24px',
                direction: 'rtl',
                boxSizing: 'border-box'
            }}>
                <h2 style={{
                    marginBottom: '8px',
                    fontSize: '1.7rem',
                    fontWeight: 900,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--primary-color) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    بوابات تسجيل الدخول الإلكترونية
                </h2>
                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    marginBottom: '40px',
                    textAlign: 'center'
                }}>
                    الرجاء تحديد القسم أو البوابة التابع لها للبدء بالعمل
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '24px',
                    width: '100%',
                    maxWidth: '960px'
                }}>
                    {/* Admin Portal Card */}
                    <div
                        onClick={() => setSelectedPortal('admin')}
                        className="hover-scale tap-effect glass"
                        style={{
                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
                            border: '1.5px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '24px',
                            padding: '32px 24px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        <div style={{
                            background: 'rgba(255,255,255,0.1)',
                            width: '64px',
                            height: '64px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            color: '#94a3b8'
                        }}>
                            <Shield size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>بوابة الإدارة العامة</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
                            إدارة الفروع، التحكم بصلاحيات الشركات، والتقارير المالية والتحليلية.
                        </p>
                    </div>

                    {/* Company Portal Card */}
                    <div
                        onClick={() => setSelectedPortal('company')}
                        className="hover-scale tap-effect glass"
                        style={{
                            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.9) 0%, rgba(29, 78, 216, 0.9) 100%)',
                            border: '1.5px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '24px',
                            padding: '32px 24px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            boxShadow: '0 12px 30px rgba(29, 78, 216, 0.2)',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        <div style={{
                            background: 'rgba(255,255,255,0.15)',
                            width: '64px',
                            height: '64px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            color: 'white'
                        }}>
                            <Building2 size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>بوابة حسابات الشركات</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>
                            إنشاء طلبات الخدمة الجديدة، مراجعة الفواتير وإدارة أسطول السيارات.
                        </p>
                    </div>

                    {/* Branch Portal Card */}
                    <div
                        onClick={() => setSelectedPortal('branch')}
                        className="hover-scale tap-effect glass"
                        style={{
                            background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.9) 0%, rgba(180, 83, 9, 0.9) 100%)',
                            border: '1.5px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '24px',
                            padding: '32px 24px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            boxShadow: '0 12px 30px rgba(217, 119, 6, 0.2)',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        <div style={{
                            background: 'rgba(255,255,255,0.15)',
                            width: '64px',
                            height: '64px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            color: 'white'
                        }}>
                            <Store size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>بوابة الفروع والورش</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>
                            مسح باركودات الخدمات بالكاميرا، تأكيد واستقبال طلبات الصيانة الموجهة.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const portalTitles = {
        admin: 'بوابة الإدارة العامة',
        company: 'بوابة حسابات الشركات',
        branch: 'بوابة الفروع والورش'
    };

    const portalColors = {
        admin: 'var(--text-primary)',
        company: 'var(--primary-color)',
        branch: 'var(--accent-orange)'
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '85vh', padding: '16px', direction: 'rtl', boxSizing: 'border-box' }}>
            <div className="glass animate-scale-up" style={{
                padding: '2.5rem 2rem', borderRadius: '24px', width: '100%', maxWidth: '440px',
                textAlign: 'center', background: 'var(--surface-color)', border: '1.5px solid var(--border-color)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)', color: portalColors[selectedPortal], width: '64px', height: '64px',
                    borderRadius: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    margin: '0 auto 1.5rem'
                }}>
                    {selectedPortal === 'admin' && <Shield size={30} />}
                    {selectedPortal === 'company' && <Building2 size={30} />}
                    {selectedPortal === 'branch' && <Store size={30} />}
                </div>

                <h2 style={{ marginBottom: '4px', fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary)' }}>تسجيل الدخول</h2>
                <p style={{ marginBottom: '2rem', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    {portalTitles[selectedPortal]}
                </p>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '0.85rem',
                        borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 700, fontSize: '13.5px',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 800, fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {selectedPortal === 'admin' ? 'البريد الإلكتروني' : 'اسم المستخدم'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type={selectedPortal === 'admin' ? 'email' : 'text'}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={selectedPortal === 'admin' ? 'أدخل البريد الإلكتروني للإدارة' : 'أدخل اسم المستخدم للقسم'}
                                required
                                style={{
                                    width: '100%', padding: '0.85rem 2.6rem 0.85rem 0.85rem', borderRadius: '12px',
                                    border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                                    color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 800, fontSize: '13px', color: 'var(--text-secondary)' }}>كلمة المرور</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="أدخل كلمة المرور السرية"
                                required
                                style={{
                                    width: '100%', padding: '0.85rem 2.6rem 0.85rem 0.85rem', borderRadius: '12px',
                                    border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                                    color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={isLoading} style={{
                        marginTop: '0.5rem', padding: '0.9rem', background: selectedPortal === 'branch' ? 'var(--accent-orange)' : 'var(--primary-color)',
                        color: 'white', border: 'none', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                        fontSize: '15px', fontWeight: 800, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isLoading ? 0.7 : 1,
                        boxShadow: `0 8px 20px -4px ${selectedPortal === 'branch' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                    }}>
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : null}
                        {isLoading ? 'جاري التحقق...' : 'دخول البوابة 🔓'}
                    </button>
                </form>

                {/* Back button to choose another portal - Only visible when not constrained by domain mode or URL query */}
                {mode === 'public' && !typeParam && (
                    <button
                        type="button"
                        onClick={() => { setSelectedPortal(null); setError(''); setUsername(''); setPassword(''); }}
                        style={{
                            marginTop: '24px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <ArrowRight size={16} /> العودة لاختيار البوابات
                    </button>
                )}
            </div>
        </div>
    );
};

export default Login;
