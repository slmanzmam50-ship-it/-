import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, User, Building2, Store, Sliders } from 'lucide-react';
import { subscribeToCompanies, subscribeToBranches } from '../services/storage';
import type { CompanyAccount, Branch } from '../types';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
    const [searchParams] = useSearchParams();
    const typeParam = searchParams.get('type') as 'admin' | 'company' | 'branch';
    
    // Subdomain / App Mode detection
    const hostname = window.location.hostname;
    let mode: 'admin' | 'company' | 'branch' | 'public' = 'public';

    if (hostname.startsWith('admin.') || hostname.includes('admin')) {
        mode = 'admin';
    } else if (hostname.startsWith('b2b.') || hostname.startsWith('company.') || hostname.includes('company') || hostname.includes('b2b')) {
        mode = 'company';
    } else if (hostname.startsWith('branch.') || hostname.startsWith('workshop.') || hostname.includes('branch') || hostname.includes('workshop')) {
        mode = 'branch';
    } else {
        // Fallback for localhost testing
        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('appMode');
        if (modeParam === 'admin') mode = 'admin';
        else if (modeParam === 'company') mode = 'company';
        else if (modeParam === 'branch') mode = 'branch';
    }
    
    const [loginType, setLoginType] = useState<'admin' | 'company' | 'branch'>(() => {
        if (mode !== 'public') return mode;
        return typeParam === 'company' || typeParam === 'branch' || typeParam === 'admin' 
            ? typeParam 
            : 'admin';
    });

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Data lists for validation
    const [companies, setCompanies] = useState<CompanyAccount[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    useEffect(() => {
        const unsubCompanies = subscribeToCompanies(setCompanies);
        const unsubBranches = subscribeToBranches(setBranches);
        return () => {
            unsubCompanies();
            unsubBranches();
        };
    }, []);

    // Sync tab from query param if it changes
    useEffect(() => {
        if (mode === 'public' && (typeParam === 'company' || typeParam === 'branch' || typeParam === 'admin')) {
            setLoginType(typeParam);
        }
    }, [typeParam, mode]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const u = username.trim();
        const p = password.trim();

        if (loginType === 'admin') {
            if (p === '0539893200') {
                localStorage.setItem('isAuthenticated', 'true');
                toast.success('مرحباً بك! تم تسجيل الدخول للإدارة 👋');
                navigate('/admin');
            } else {
                setError('كلمة المرور غير صحيحة ❌');
                toast.error('كلمة المرور غير صحيحة ❌');
            }
        } else if (loginType === 'company') {
            if (!u || !p) {
                toast.error('الرجاء إدخال اسم المستخدم وكلمة المرور');
                return;
            }
            const found = companies.find(c => c.username === u && c.password === p);
            if (found) {
                localStorage.setItem('logged_company_id', found.id);
                toast.success(`مرحباً بك! تم تسجيل الدخول لـ ${found.name} 👋`);
                navigate('/company');
            } else {
                setError('اسم المستخدم أو كلمة المرور غير صحيحة ❌');
                toast.error('اسم المستخدم أو كلمة المرور غير صحيحة ❌');
            }
        } else if (loginType === 'branch') {
            if (!u || !p) {
                toast.error('الرجاء إدخال اسم المستخدم وكلمة المرور');
                return;
            }
            const found = branches.find(b => b.username === u && b.password === p);
            if (found) {
                localStorage.setItem('logged_branch_id', found.id);
                toast.success(`مرحباً بك! تم تسجيل الدخول لـ ${found.name} 👋`);
                navigate('/branch');
            } else {
                setError('اسم المستخدم أو كلمة المرور غير صحيحة ❌');
                toast.error('اسم المستخدم أو كلمة المرور غير صحيحة ❌');
            }
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '0 16px', direction: 'rtl' }}>
            <div className="glass animate-scale-up" style={{
                padding: '2rem', borderRadius: '24px', width: '100%', maxWidth: '440px',
                textAlign: 'center', background: 'var(--surface-color)', border: '1px solid var(--border-color)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}>
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', width: '60px', height: '60px',
                    borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    margin: '0 auto 1.5rem'
                }}>
                    <Lock size={30} />
                </div>

                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>بوابة تسجيل الدخول</h2>

                {/* Tabs */}
                {mode === 'public' && !typeParam && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px', background: 'var(--bg-color)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <button
                            type="button"
                            onClick={() => { setLoginType('admin'); setError(''); setUsername(''); setPassword(''); }}
                            style={{
                                padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, border: 'none',
                                background: loginType === 'admin' ? 'var(--primary-color)' : 'transparent',
                                color: loginType === 'admin' ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s', width: '100%'
                            }}
                        >
                            <Sliders size={14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> إدارة
                        </button>
                        <button
                            type="button"
                            onClick={() => { setLoginType('company'); setError(''); setUsername(''); setPassword(''); }}
                            style={{
                                padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, border: 'none',
                                background: loginType === 'company' ? 'var(--primary-color)' : 'transparent',
                                color: loginType === 'company' ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s', width: '100%'
                            }}
                        >
                            <Building2 size={14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> شركات
                        </button>
                        <button
                            type="button"
                            onClick={() => { setLoginType('branch'); setError(''); setUsername(''); setPassword(''); }}
                            style={{
                                padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, border: 'none',
                                background: loginType === 'branch' ? 'var(--primary-color)' : 'transparent',
                                color: loginType === 'branch' ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s', width: '100%'
                            }}
                        >
                            <Store size={14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> فروع
                        </button>
                    </div>
                )}

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '0.75rem',
                        borderRadius: '12px', marginBottom: '1rem', fontWeight: 500, fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {loginType !== 'admin' && (
                        <div style={{ textAlign: 'right' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)' }}>اسم المستخدم</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="أدخل اسم المستخدم"
                                    required
                                    style={{
                                        width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.75rem', borderRadius: '12px',
                                        border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                                        color: 'var(--text-primary)', fontSize: '14px', outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ textAlign: 'right' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)' }}>كلمة المرور</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="أدخل كلمة المرور"
                                required
                                style={{
                                    width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.75rem', borderRadius: '12px',
                                    border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                                    color: 'var(--text-primary)', fontSize: '14px', outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <button type="submit" style={{
                        marginTop: '0.5rem', padding: '0.9rem', background: 'var(--primary-color)',
                        color: 'white', border: 'none', borderRadius: '12px',
                        fontSize: '15px', fontWeight: 800, cursor: 'pointer', transition: '0.3s',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                    }}>
                        دخول
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
