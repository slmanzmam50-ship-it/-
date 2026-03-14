import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

const Login: React.FC = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // استخدام كلمة المرور التي طلبها المستخدم
        if (password === 'salman.zmam') {
            sessionStorage.setItem('isAuthenticated', 'true');
            navigate('/admin');
        } else {
            setError('كلمة المرور غير صحيحة');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="glass" style={{
                padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px',
                textAlign: 'center'
            }}>
                <div style={{
                    background: 'var(--primary-color)', color: 'white', width: '60px', height: '60px',
                    borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    margin: '0 auto 1.5rem'
                }}>
                    <Lock size={30} />
                </div>

                <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>تسجيل الدخول للإدارة</h2>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '0.75rem',
                        borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontWeight: 500
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>كلمة المرور</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="أدخل كلمة المرور"
                            required
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                                color: 'var(--text-primary)', fontSize: '1rem'
                            }}
                        />
                    </div>

                    <button type="submit" style={{
                        marginTop: '0.5rem', padding: '0.75rem', background: 'var(--primary-color)',
                        color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
                        fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: '0.3s'
                    }}>
                        دخول
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
