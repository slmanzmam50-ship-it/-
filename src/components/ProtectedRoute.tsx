import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute: React.FC = () => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';

    if (!isAuthenticated) {
        // إذا لم يكن مسجلاً الدخول، قم بتحويله إلى صفحة تسجيل الدخول
        return <Navigate to="/login" replace />;
    }

    // إذا كان مسجلاً الدخول، اعرض المحتوى (المسارات الفرعية)
    return <Outlet />;
};

export default ProtectedRoute;
