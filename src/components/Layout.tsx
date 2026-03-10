import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const Layout: React.FC = () => {
    return (
        <>
            <Header />
            <main style={{ flex: 1 }}>
                <Outlet />
            </main>
        </>
    );
};

export default Layout;
