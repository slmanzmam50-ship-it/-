import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC = () => {
    const [isChecking, setIsChecking] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                localStorage.setItem('isAuthenticated', 'true');
            } else {
                localStorage.removeItem('isAuthenticated');
            }
            setIsChecking(false);
        });
        return () => unsubscribe();
    }, []);

    if (isChecking) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Loader2 className="animate-spin" size={40} color="var(--primary-color)" />
        </div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
