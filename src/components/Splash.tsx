import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

const Splash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        // Start fading out after 2.5 seconds
        const timer1 = setTimeout(() => {
            setFadeOut(true);
        }, 2500);

        // Completely unmount after 3 seconds
        const timer2 = setTimeout(() => {
            onComplete();
        }, 3000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [onComplete]);

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#0f172a', // deep slate/navy bg
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                opacity: fadeOut ? 0 : 1,
                transition: 'opacity 0.5s ease-out',
                overflow: 'hidden'
            }}
        >
            {/* Background glowing effects */}
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(15,23,42,0) 70%)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'pulse-glow 3s infinite alternate'
            }}></div>

            <div 
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1.5rem',
                    animation: 'slide-up 1s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    zIndex: 10
                }}
            >
                {/* Logo Icon */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '24px',
                    background: 'linear-gradient(135deg, var(--accent-orange), #ea580c)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px rgba(234, 88, 12, 0.4)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <MapPin size={40} color="white" style={{ position: 'relative', zIndex: 2 }} />
                    <div className="shimmer" style={{
                        position: 'absolute',
                        top: 0, left: '-100%', width: '100%', height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                        animation: 'shimmer 2s infinite',
                        zIndex: 1
                    }}></div>
                </div>

                {/* Company Name */}
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{
                        color: 'white',
                        fontSize: '2rem',
                        fontWeight: 900,
                        margin: '0 0 0.5rem',
                        letterSpacing: '-0.5px',
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                    }}>سلمان زمام الخالدي</h1>
                    <p style={{
                        color: 'var(--accent-orange)',
                        fontSize: '1rem',
                        fontWeight: 600,
                        margin: 0,
                        letterSpacing: '1px'
                    }}>لخدمات السيارات</p>
                </div>

                {/* Loading indicator */}
                <div style={{ marginTop: '2rem', display: 'flex', gap: '8px' }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: '10px',
                            height: '10px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            opacity: 0.2,
                            animation: `bounce-dot 1s infinite alternate ${i * 0.2}s`
                        }}></div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes pulse-glow {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
                    100% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                }
                @keyframes slide-up {
                    0% { transform: translateY(40px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes shimmer {
                    100% { left: 100%; }
                }
                @keyframes bounce-dot {
                    to { transform: translateY(-8px); opacity: 1; background-color: var(--accent-orange); }
                }
            `}</style>
        </div>
    );
};

export default Splash;
