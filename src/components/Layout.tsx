import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';

const Layout: React.FC = () => {
    const location = useLocation();
    const isWorker = location.pathname.startsWith('/worker');

    return (
        <>
            {!isWorker && <Header />}
            <main style={{ flex: 1 }}>
                <Outlet />
            </main>
        </>
    );
};

export default Layout;
