import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Map, Sun, Moon, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Header: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [lang, setLang] = React.useState<'ar' | 'en'>(() => (localStorage.getItem('lang') as 'ar' | 'en') || 'ar');

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

    return (
        <header className="glass app-header">
            <Link to={location.pathname === '/admin' ? '/' : '/admin'} className="app-logo-link">
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="app-logo-img"
                />
                <h2 className="app-logo-text">
                    {isAr ? 'سلمان زمام الخالدي' : 'Salman Al-Khalidi'}
                </h2>
            </Link>

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

                {location.pathname === '/admin' && (
                    <>
                        <Link to="/" className="header-link">
                            <Map size={18} /> {isAr ? 'الخريطة' : 'Map'}
                        </Link>
                        <button onClick={handleLogout} className="logout-btn">
                            <LogOut size={18} /> {isAr ? 'خروج' : 'Logout'}
                        </button>
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;
