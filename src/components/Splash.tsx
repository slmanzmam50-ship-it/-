import React, { useEffect, useState, useMemo } from 'react';

const Splash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);

    // Timeline
    // 0: Initial dark screen
    // 1: Logo enters (0.3s)
    // 2: Sonar wave & Nodes light up (1.0s)
    // 3: Text fade in & loading line (1.8s)
    // 4: Fade out to app (3.5s)
    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 300);
        const t2 = setTimeout(() => setPhase(2), 1000);
        const t3 = setTimeout(() => setPhase(3), 1800);
        const t4 = setTimeout(() => setPhase(4), 3500);
        const t5 = setTimeout(() => onComplete(), 4100);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
    }, [onComplete]);

    // Generate random map nodes (representing many branches)
    const nodes = useMemo(() => {
        return Array.from({ length: 45 }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 45 + 10; // 10% to 55% from center
            // Convert polar to cartesian (percentage)
            const x = 50 + radius * Math.cos(angle);
            const y = 50 + radius * Math.sin(angle);
            
            return {
                id: i,
                x, y,
                size: Math.random() * 3 + 2,
                opacity: Math.random() * 0.5 + 0.3,
                delay: radius * 0.03 // Delay lighting up based on distance from center!
            };
        });
    }, []);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: '#0a0f18', // Deep luxury navy/black
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            opacity: phase === 4 ? 0 : 1,
            transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>

            {/* ── Subtle Map Grid Background ── */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
                opacity: phase >= 1 ? 1 : 0,
                transition: 'opacity 2s ease',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(circle at center, transparent 30%, #0a0f18 80%)'
                }} />
            </div>

            {/* ── The Network Nodes (Branches lighting up) ── */}
            {nodes.map(n => (
                <div key={n.id} style={{
                    position: 'absolute',
                    left: `${n.x}%`, top: `${n.y}%`,
                    width: `${n.size}px`, height: `${n.size}px`,
                    borderRadius: '50%',
                    backgroundColor: n.id % 4 === 0 ? '#f97316' : '#3b82f6', // Mix of brand orange and tech blue
                    boxShadow: n.id % 4 === 0 ? '0 0 8px #f97316' : '0 0 6px #3b82f6',
                    opacity: phase >= 2 ? n.opacity : 0,
                    transform: phase >= 2 ? 'scale(1)' : 'scale(0)',
                    transition: `all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${n.delay}s`,
                }} />
            ))}

            {/* ── Center Content ── */}
            <div style={{
                position: 'relative', zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>

                {/* The Sonar Pulse */}
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    width: '0px', height: '0px',
                    borderRadius: '50%',
                    border: '2px solid rgba(59, 130, 246, 0.4)',
                    transform: 'translate(-50%, -50%)',
                    opacity: phase === 2 ? 1 : 0,
                    animation: phase >= 2 ? 'sonarExpand 2.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards' : 'none'
                }} />

                {/* Logo Pin */}
                <div style={{
                    width: '90px', height: '90px',
                    borderRadius: '24px',
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                    opacity: phase >= 1 ? 1 : 0,
                    transform: phase >= 1 ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.8)',
                    transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Inner glowing core */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(circle at 50% 0%, rgba(249,115,22,0.15), transparent 70%)',
                    }} />
                    
                    <img
                        src="/logo.png"
                        alt="Logo"
                        style={{ width: '60px', height: '60px', objectFit: 'contain', position: 'relative', zIndex: 2 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>

                {/* Text Reveal */}
                <div style={{
                    marginTop: '2rem',
                    textAlign: 'center',
                    opacity: phase >= 3 ? 1 : 0,
                    transform: phase >= 3 ? 'translateY(0)' : 'translateY(15px)',
                    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                    <h1 style={{
                        color: '#ffffff',
                        fontSize: '24px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        margin: '0 0 8px 0',
                        textShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }}>سلمان زمام الخالدي</h1>
                    
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}>
                        <div style={{ width: '30px', height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                        <span style={{
                            color: '#94a3b8',
                            fontSize: '13px',
                            fontWeight: 500,
                            letterSpacing: '2px',
                            textTransform: 'uppercase'
                        }}>شبكة الخدمة الإقليمية</span>
                        <div style={{ width: '30px', height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                    </div>
                </div>

                {/* Minimalist Loading Indicator */}
                <div style={{
                    marginTop: '3.5rem',
                    width: '120px', height: '2px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '2px',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: phase >= 3 ? 1 : 0,
                    transition: 'opacity 0.6s ease 0.3s'
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, bottom: 0,
                        width: '40%',
                        background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
                        animation: phase >= 3 ? 'minimalSweep 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite' : 'none'
                    }} />
                </div>
            </div>

            <style>{`
                @keyframes sonarExpand {
                    0% { width: 0px; height: 0px; opacity: 1; border-width: 2px; }
                    100% { width: 800px; height: 800px; opacity: 0; border-width: 0px; }
                }
                @keyframes minimalSweep {
                    0% { transform: translateX(-100%); width: 20%; }
                    50% { width: 60%; }
                    100% { transform: translateX(300%); width: 20%; }
                }
            `}</style>
        </div>
    );
};

export default Splash;
