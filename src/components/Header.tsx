import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Map, Sun, Moon, Share2, Building2, Store, Sliders, X, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Header: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [lang, setLang] = React.useState<'ar' | 'en'>(() => (localStorage.getItem('lang') as 'ar' | 'en') || 'ar');
    const [showOptionsModal, setShowOptionsModal] = React.useState(false);

    const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved as 'light' | 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    React.useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        localStorage.setItem('lang', lang);
    }, [lang]);

    React.useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleLang = () => {
        const newLang = lang === 'ar' ? 'en' : 'ar';
        setLang(newLang);
        localStorage.setItem('lang', newLang);
        window.dispatchEvent(new CustomEvent('langChange'));
    };
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const handleLogout = () => {
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('logged_company_id');
        sessionStorage.removeItem('logged_branch_id');
        navigate('/login');
    };

    const handleShareApp = async () => {
        const shareData = {
            title: 'Salman Zamam Al-Khalidi',
            text: lang === 'ar' ? 'اكتشف أقرب فروع صيانة السيارات والملاحة إليها' : 'Discover the nearest auto service branches and navigate to them',
            url: window.location.origin
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Share failed', err);
            }
        } else {
            navigator.clipboard.writeText(shareData.url);
            toast.success(lang === 'ar' ? 'تم نسخ رابط التطبيق' : 'App link copied');
        }
    };

    const isAr = lang === 'ar';

    const handleLogoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        navigate('/');
    };

    const getMapLink = () => {
        if (sessionStorage.getItem('isAuthenticated') === 'true') {
            return '/map?type=admin';
        }
        if (sessionStorage.getItem('logged_company_id')) {
            return '/map?type=company';
        }
        return '/map';
    };

    return (
        <>
            <header className="glass app-header">
                <div onClick={handleLogoClick} className="app-logo-link" style={{ cursor: 'pointer' }}>
                    <img 
                        src="/logo.png" 
                        alt="Logo" 
                        className="app-logo-img"
                    />
                    <h2 className="app-logo-text">
                        {isAr ? 'سلمان زمام الخالدي' : 'Salman Al-Khalidi'}
                    </h2>
                </div>

                <nav className="header-nav">

                    <button 
                        onClick={toggleTheme}
                        className="theme-toggle-btn"
                        title={isAr ? 'تبديل المظهر' : 'Toggle Theme'}
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <button 
                        onClick={toggleLang}
                        className="lang-toggle-btn"
                    >
                        {isAr ? 'English' : 'عربي'}
                    </button>

                    <button 
                        onClick={handleShareApp}
                        className="share-btn-header"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}
                        title={isAr ? 'مشاركة التطبيق' : 'Share App'}
                    >
                        <Share2 size={20} />
                    </button>

                    {location.pathname !== '/map' && (
                        <Link to={getMapLink()} className="header-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 700 }}>
                            <Map size={18} /> {isAr ? 'الخريطة' : 'Map'}
                        </Link>
                    )}
                    {location.pathname === '/map' && (
                        (() => {
                            const searchParams = new URLSearchParams(location.search);
                            const typeParam = searchParams.get('type');
                            
                            let backUrl = '';
                            let label = '';
                            if (typeParam === 'admin' || sessionStorage.getItem('isAuthenticated') === 'true') {
                                backUrl = '/admin';
                                label = isAr ? 'لوحة الإدارة' : 'Admin Panel';
                            } else if (typeParam === 'company' || sessionStorage.getItem('logged_company_id')) {
                                backUrl = '/company';
                                label = isAr ? 'لوحة التحكم' : 'Dashboard';
                            } else if (typeParam === 'branch' || sessionStorage.getItem('logged_branch_id')) {
                                backUrl = '/branch';
                                label = isAr ? 'بوابة الفروع' : 'Branch Panel';
                            }

                            if (!backUrl) return null;

                            return (
                                <Link to={backUrl + (typeParam ? `?type=${typeParam}` : '')} className="header-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: 'var(--primary-color)', fontWeight: 800 }}>
                                    {isAr ? <ArrowRight size={18} /> : <ArrowLeft size={18} />} {label}
                                </Link>
                            );
                        })()
                    )}
                    {(sessionStorage.getItem('isAuthenticated') === 'true' || 
                      sessionStorage.getItem('logged_company_id') || 
                      sessionStorage.getItem('logged_branch_id')) && (
                        <button onClick={handleLogout} className="logout-btn" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', fontWeight: 700 }}>
                            <LogOut size={18} /> {isAr ? 'خروج' : 'Logout'}
                        </button>
                    )}
                </nav>
            </header>

            {showOptionsModal && (
                <div 
                    onClick={() => setShowOptionsModal(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'fadeIn 0.2s ease'
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="glass animate-scale-in"
                        style={{
                            width: '90%',
                            maxWidth: '480px',
                            background: 'var(--surface-color)',
                            borderRadius: '24px',
                            padding: '28px 24px',
                            border: '1px solid var(--border-color)',
                            position: 'relative',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                            textAlign: 'center'
                        }}
                    >
                        <button 
                            onClick={() => setShowOptionsModal(false)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(0,0,0,0.05)',
                                border: 'none',
                                color: 'var(--text-primary)',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={18} />
                        </button>

                        <h3 style={{ margin: '12px 0 24px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {isAr ? 'اختر الوجهة' : 'Select Destination'}
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            {/* Option 1: Management (إدارة) */}
                            <div 
                                onClick={() => {
                                    setShowOptionsModal(false);
                                    navigate('/admin');
                                }}
                                className="option-card"
                                style={{
                                    background: 'rgba(59, 130, 246, 0.08)',
                                    border: '1px solid rgba(59, 130, 246, 0.15)',
                                    borderRadius: '16px',
                                    padding: '20px 10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Sliders size={24} />
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                                    {isAr ? 'إدارة' : 'Management'}
                                </span>
                            </div>

                            {/* Option 2: Company (شركة) */}
                            <div 
                                onClick={() => {
                                    setShowOptionsModal(false);
                                    navigate('/company');
                                }}
                                className="option-card"
                                style={{
                                    background: 'rgba(245, 158, 11, 0.08)',
                                    border: '1px solid rgba(245, 158, 11, 0.15)',
                                    borderRadius: '16px',
                                    padding: '20px 10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{
                                    background: 'var(--accent-orange)',
                                    color: 'white',
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Building2 size={24} />
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                                    {isAr ? 'شركة' : 'Company'}
                                </span>
                            </div>

                            {/* Option 3: Branch (فرع) */}
                            <div 
                                onClick={() => {
                                    setShowOptionsModal(false);
                                    navigate('/branch');
                                }}
                                className="option-card"
                                style={{
                                    background: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid rgba(16, 185, 129, 0.15)',
                                    borderRadius: '16px',
                                    padding: '20px 10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{
                                    background: 'var(--success)',
                                    color: 'white',
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Store size={24} />
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                                    {isAr ? 'فرع' : 'Branch'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
