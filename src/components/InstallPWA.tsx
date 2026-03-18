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
        <div className="pwa-banner-wrapper">
            <div className="glass pwa-banner-content">
                <div className="pwa-banner-icon">
                    <Smartphone color="white" size={24} />
                </div>
                <div className="pwa-banner-text">
                    <h4>{isAr ? 'سلمان زمام الخالدي' : 'Salman Al-Khalidi'}</h4>
                    <p>{isAr ? 'ثبت التطبيق لتجربة أسرع وأفضل' : 'Install for a better experience'}</p>
                </div>
                <div className="pwa-banner-actions">
                    <button className="pwa-btn-install" onClick={handleInstall}>
                        {isAr ? 'تثبيت' : 'Install'}
                    </button>
                    <button className="pwa-btn-dismiss" onClick={handleDismiss}>
                        {isAr ? 'تخطي' : 'Dismiss'}
                    </button>
                </div>
                <button className="pwa-btn-close" onClick={handleDismiss}>
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default InstallPWA;
