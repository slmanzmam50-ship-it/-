import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, Settings } from 'lucide-react';

const Header: React.FC = () => {
    const location = useLocation();

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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>مراكز خدمة الخالدي</h2>
            </div>

            <nav>
                {location.pathname === '/admin' ? (
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                        <Map size={20} /> الخريطة
                    </Link>
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
