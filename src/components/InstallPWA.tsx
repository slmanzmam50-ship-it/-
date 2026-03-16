import React, { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';

const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            // Check if already shown in this session
            const hasShown = sessionStorage.getItem('pwa_prompt_shown');
            if (!hasShown) {
                setTimeout(() => {
                    setIsVisible(true);
                }, 1000);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
        sessionStorage.setItem('pwa_prompt_shown', 'true');
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_shown', 'true');
    };

    if (!isVisible) return null;

    const isAr = localStorage.getItem('lang') !== 'en';

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: '90%',
            maxWidth: '400px',
            animation: 'slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
            <div className="glass" style={{
                padding: '1.25rem',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px) saturate(180%)'
            }}>
                <div style={{
                    minWidth: '50px',
                    height: '50px',
                    background: 'var(--grad-primary)',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}>
                    <Smartphone color="white" size={28} />
                </div>
                <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                        {isAr ? 'سلمان زمام الخالدي' : 'Salman Al-Khalidi'}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                        {isAr ? 'ثبت التطبيق لتجربة أسرع وأفضل' : 'Install for a better experience'}
                    </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button onClick={handleInstall} style={{
                        background: '#fff',
                        color: 'var(--primary-color)',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}>
                        {isAr ? 'تثبيت' : 'Install'}
                    </button>
                    <button onClick={handleDismiss} style={{
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.6)',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}>
                        {isAr ? 'تخطي' : 'Dismiss'}
                    </button>
                </div>
                <button onClick={handleDismiss} style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    background: '#333',
                    color: '#fff',
                    border: 'none',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default InstallPWA;
