import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Map } from 'lucide-react';

const Header: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [lang, setLang] = React.useState<'ar' | 'en'>(() => (localStorage.getItem('lang') as 'ar' | 'en') || 'ar');

    React.useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        localStorage.setItem('lang', lang);
    }, [lang]);

    const toggleLang = () => setLang(prev => prev === 'ar' ? 'en' : 'ar');

    const handleLogout = () => {
        sessionStorage.removeItem('isAuthenticated');
        navigate('/login');
    };

    const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
    const [showInstallBtn, setShowInstallBtn] = React.useState(false);

    React.useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBtn(true);
        });

        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setShowInstallBtn(false);
        });
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstallBtn(false);
        }
    };

    const isAr = lang === 'ar';

    return (
        <header className="glass" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 1050,
            borderBottom: '1px solid var(--border-color)',
        }}>
            <Link to={location.pathname === '/admin' ? '/' : '/admin'} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '2px solid var(--primary-color)'
                    }} 
                />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {isAr ? 'سلمان زمام الخالدي' : 'Salman Al-Khalidi'}
                </h2>
            </Link>

            <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {showInstallBtn && (
                    <button 
                        onClick={handleInstall}
                        style={{
                            background: 'var(--success)',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {isAr ? 'تثبيت التطبيق' : 'Install App'}
                    </button>
                )}

                <button 
                    onClick={toggleLang}
                    style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid var(--primary-color)',
                        color: 'var(--primary-color)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    {isAr ? 'English' : 'عربي'}
                </button>

                {location.pathname === '/admin' && (
                    <>
                        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '14px', color: 'var(--primary-color)', textDecoration: 'none' }}>
                            <Map size={18} /> {isAr ? 'الخريطة' : 'Map'}
                        </Link>
                        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '14px', background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                            <LogOut size={18} /> {isAr ? 'خروج' : 'Logout'}
                        </button>
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;
