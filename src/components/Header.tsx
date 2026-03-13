import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Map, Settings, LogOut } from 'lucide-react';

const Header: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        navigate('/login');
    };

    return (
        <header className="glass" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            borderBottom: '1px solid var(--border-color)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Map size={28} color="var(--primary-color)" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>مراكز خدمة سلمان زمام الخالدي</h2>
            </div>

            <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {location.pathname === '/admin' ? (
                    <>
                        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                            <Map size={20} /> الخريطة
                        </Link>
                        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                            <LogOut size={20} /> خروج
                        </button>
                    </>
                ) : (
                    <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                        الإدارة <Settings size={20} />
                    </Link>
                )}
            </nav>
        </header>
    );
};

export default Header;
