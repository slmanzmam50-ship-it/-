import React, { useEffect, useState } from 'react';

const Splash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
    // phase 0 = particles only
    // phase 1 = logo appears
    // phase 2 = text appears
    // phase 3 = fade out

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 300);
        const t2 = setTimeout(() => setPhase(2), 1000);
        const t3 = setTimeout(() => setPhase(3), 2600);
        const t4 = setTimeout(() => onComplete(), 3200);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }, [onComplete]);

    // 20 random particles for the background
    const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        size: Math.random() * 6 + 2,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 3,
        dur: Math.random() * 4 + 3,
        opacity: Math.random() * 0.5 + 0.1,
    }));

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'linear-gradient(135deg, #060b18 0%, #0d1b35 50%, #0f172a 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            opacity: phase === 3 ? 0 : 1,
            transition: 'opacity 0.6s cubic-bezier(0.4,0,0.2,1)',
        }}>

            {/* ── Ambient glow blobs ── */}
            <div style={{
                position: 'absolute', width: '700px', height: '700px',
                background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 65%)',
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                animation: 'blobPulse 4s ease-in-out infinite alternate',
            }} />
            <div style={{
                position: 'absolute', width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 65%)',
                top: '20%', right: '-10%',
                animation: 'blobPulse 5s ease-in-out infinite alternate-reverse',
            }} />
            <div style={{
                position: 'absolute', width: '300px', height: '300px',
                background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 65%)',
                bottom: '10%', left: '-5%',
                animation: 'blobPulse 6s ease-in-out infinite alternate',
            }} />

            {/* ── Floating particles ── */}
            {particles.map(p => (
                <div key={p.id} style={{
                    position: 'absolute',
                    width: p.size, height: p.size,
                    borderRadius: '50%',
                    left: `${p.x}%`, top: `${p.y}%`,
                    background: p.id % 3 === 0 ? '#f97316' : p.id % 3 === 1 ? '#3b82f6' : 'rgba(255,255,255,0.6)',
                    opacity: p.opacity,
                    animation: `floatParticle ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
                }} />
            ))}

            {/* ── Grid lines (subtle) ── */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `
                    linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
            }} />

            {/* ── Center content ── */}
            <div style={{
                position: 'relative', zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0',
            }}>

                {/* Logo Container */}
                <div style={{
                    position: 'relative', marginBottom: '2rem',
                    opacity: phase >= 1 ? 1 : 0,
                    transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.4) translateY(30px)',
                    transition: 'all 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    {/* Outer ring */}
                    <div style={{
                        position: 'absolute', inset: '-16px',
                        borderRadius: '50%',
                        border: '1.5px solid rgba(249,115,22,0.3)',
                        animation: 'ringRotate 8s linear infinite',
                    }}>
                        {/* Ring dot */}
                        <div style={{
                            position: 'absolute', top: '6px', left: '50%',
                            transform: 'translateX(-50%)',
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: '#f97316', boxShadow: '0 0 10px #f97316',
                        }} />
                    </div>

                    {/* Second ring */}
                    <div style={{
                        position: 'absolute', inset: '-28px',
                        borderRadius: '50%',
                        border: '1px solid rgba(59,130,246,0.2)',
                        animation: 'ringRotate 12s linear infinite reverse',
                    }}>
                        <div style={{
                            position: 'absolute', bottom: '8px', left: '50%',
                            transform: 'translateX(-50%)',
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: '#3b82f6', boxShadow: '0 0 8px #3b82f6',
                        }} />
                    </div>

                    {/* Logo circle */}
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: 'linear-gradient(145deg, #1e3a5f, #0f172a)',
                        border: '2px solid rgba(249,115,22,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 40px rgba(249,115,22,0.25), 0 0 80px rgba(249,115,22,0.1), inset 0 0 30px rgba(0,0,0,0.5)',
                        overflow: 'hidden',
                        position: 'relative',
                    }}>
                        <img
                            src="/logo.png"
                            alt="Logo"
                            style={{ width: '70px', height: '70px', objectFit: 'contain', position: 'relative', zIndex: 2 }}
                            onError={(e) => {
                                // Fallback to car icon if logo not found
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        {/* Shimmer sweep */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                            animation: 'shimmerSweep 2.5s ease-in-out infinite',
                        }} />
                    </div>
                </div>

                {/* Company name - Arabic */}
                <div style={{
                    opacity: phase >= 2 ? 1 : 0,
                    transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1)',
                    textAlign: 'center',
                    marginBottom: '0.75rem',
                }}>
                    <h1 style={{
                        margin: 0,
                        fontSize: '2rem',
                        fontWeight: 900,
                        color: 'white',
                        letterSpacing: '-0.5px',
                        textShadow: '0 2px 20px rgba(0,0,0,0.8)',
                        lineHeight: 1.2,
                    }}>
                        سلمان زمام الخالدي
                    </h1>
                </div>

                {/* Divider line */}
                <div style={{
                    opacity: phase >= 2 ? 1 : 0,
                    transition: 'opacity 0.6s ease 0.15s',
                    width: phase >= 2 ? '180px' : '0px',
                    height: '1.5px',
                    background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
                    margin: '0.5rem auto',
                    transitionProperty: 'opacity, width',
                    transitionDuration: '0.6s, 0.8s',
                    transitionDelay: '0.15s, 0.2s',
                }} />

                {/* Subtitle */}
                <div style={{
                    opacity: phase >= 2 ? 1 : 0,
                    transform: phase >= 2 ? 'translateY(0)' : 'translateY(12px)',
                    transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s',
                    textAlign: 'center',
                    marginBottom: '3rem',
                }}>
                    <p style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        color: 'rgba(249,115,22,0.9)',
                        letterSpacing: '3px',
                        textTransform: 'uppercase',
                    }}>
                        لخدمات السيارات
                    </p>
                </div>

                {/* Loading bar */}
                <div style={{
                    opacity: phase >= 2 ? 1 : 0,
                    transition: 'opacity 0.4s ease 0.4s',
                }}>
                    <div style={{
                        width: '160px', height: '2px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #f97316, #fb923c)',
                            borderRadius: '2px',
                            animation: 'loadBar 2s ease-out forwards',
                            boxShadow: '0 0 10px rgba(249,115,22,0.7)',
                        }} />
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes blobPulse {
                    from { transform: translate(-50%, -50%) scale(0.85); opacity: 0.6; }
                    to   { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
                }
                @keyframes floatParticle {
                    from { transform: translateY(0px) scale(1); }
                    to   { transform: translateY(-20px) scale(1.2); }
                }
                @keyframes ringRotate {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                @keyframes shimmerSweep {
                    0%   { transform: translateX(-100%); }
                    60%  { transform: translateX(100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes loadBar {
                    from { width: 0%; }
                    to   { width: 100%; }
                }
            `}</style>
        </div>
    );
};

export default Splash;
