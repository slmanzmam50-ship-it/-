import React, { useEffect, useState } from 'react';

const cities = [
    { id: 'riyadh', x: 55, y: 48, name: 'الرياض', isHQ: true },
    { id: 'jeddah', x: 22, y: 62, name: 'جدة' },
    { id: 'dammam', x: 76, y: 42, name: 'الدمام' },
    { id: 'mecca', x: 25, y: 65, name: 'مكة المكرمة' },
    { id: 'medina', x: 27, y: 50, name: 'المدينة المنورة' },
    { id: 'tabuk', x: 18, y: 27, name: 'تبوك' },
    { id: 'jizan', x: 34, y: 94, name: 'جازان' },
    { id: 'abha', x: 28, y: 83, name: 'أبها' },
    { id: 'hail', x: 44, y: 34, name: 'حائل' },
    { id: 'buraydah', x: 49, y: 39, name: 'بريدة' },
    { id: 'arar', x: 43, y: 14, name: 'عرعر' },
    { id: 'najran', x: 47, y: 86, name: 'نجران' },
    { id: 'jubail', x: 73, y: 37, name: 'الجبيل' },
    { id: 'taif', x: 29, y: 67, name: 'الطائف' },
    { id: 'yanbu', x: 18, y: 48, name: 'ينبع' },
    { id: 'ahsa', x: 72, y: 52, name: 'الأحساء' },
    { id: 'khafji', x: 69, y: 28, name: 'الخفجي' },
];

// Abstract stylized polygon resembling Saudi Arabia
const KSAPath = "M32 5 L45 10 L65 25 L75 40 L80 44 L87 63 L74 76 L55 85 L35 95 L25 81 L20 60 L14 45 L14 25 L20 15 Z";

const Splash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 100);  // Map stroke starts drawing
        const t2 = setTimeout(() => setPhase(2), 1200); // HQ & Logo lights up 
        const t3 = setTimeout(() => setPhase(3), 2000); // Network lines & cities light up
        const t4 = setTimeout(() => setPhase(4), 4000); // Fade out screen
        const t5 = setTimeout(() => onComplete(), 4600); // Unmount
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
    }, [onComplete]);

    const hq = cities.find(c => c.isHQ)!;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: '#050a15', // Ultra dark blue for professional tech look
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            opacity: phase === 4 ? 0 : 1,
            transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
            {/* Background glowing aura */}
            <div style={{
                position: 'absolute', width: '80vw', height: '80vw',
                background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
                animation: 'pulseGlow 4s infinite alternate'
            }} />

            {/* Title & Logo (Positioned above map) */}
            <div style={{
                position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                opacity: phase >= 2 ? 1 : 0, transition: 'opacity 1s ease', zIndex: 20
            }}>
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    style={{ 
                        width: '100px', height: '100px', objectFit: 'contain',
                        filter: 'drop-shadow(0 0 20px rgba(249,115,22,0.4)) drop-shadow(0 0 40px rgba(255,255,255,0.1))',
                        transform: phase >= 2 ? 'scale(1)' : 'scale(0.8)',
                        transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }} 
                />
                <h1 style={{
                    color: 'white', margin: '16px 0 8px', fontSize: '26px', fontWeight: 800,
                    textShadow: '0 4px 15px rgba(0,0,0,0.8)', letterSpacing: '-0.5px'
                }}>
                    سلمان زمام الخالدي
                </h1>
                <p style={{
                    color: '#94a3b8', margin: 0, fontSize: '14px', fontWeight: 600,
                    letterSpacing: '2px', textTransform: 'uppercase'
                }}>شبكة الفروع الوطنية</p>
                
                {/* Loader bar */}
                <div style={{
                    marginTop: '24px', width: '140px', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%', width: '0%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                        animation: phase >= 3 ? 'loadBar 1.8s ease-out forwards' : 'none'
                    }} />
                </div>
            </div>

            {/* The Map Container */}
            <div style={{
                position: 'absolute',
                top: '55%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%', maxWidth: '600px',
                aspectRatio: '1/1',
            }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    
                    {/* Map Outline */}
                    <path 
                        d={KSAPath}
                        fill="rgba(59,130,246,0.03)"
                        stroke="rgba(59,130,246,0.4)"
                        strokeWidth="0.4"
                        strokeLinejoin="round"
                        className={phase >= 1 ? 'draw-map' : 'hide-map'}
                    />

                    {/* Network Lines (HQ to branches) */}
                    {cities.filter(c => !c.isHQ).map(c => (
                        <line 
                            key={`line-${c.id}`}
                            x1={hq.x} y1={hq.y} x2={c.x} y2={c.y}
                            stroke="rgba(249,115,22,0.4)"
                            strokeWidth="0.2"
                            className={phase >= 3 ? 'draw-line' : 'hide-line'}
                        />
                    ))}

                    {/* HQ Radar Pulse */}
                    {phase >= 2 && (
                        <circle cx={hq.x} cy={hq.y} r="0" fill="none" stroke="#f97316" strokeWidth="0.5">
                            <animate attributeName="r" values="0; 30" dur="2s" begin="0.2s" keyTimes="0; 1" keySplines="0.1 0.8 0.3 1" calcMode="spline" fill="freeze" />
                            <animate attributeName="opacity" values="1; 0" dur="2s" begin="0.2s" keyTimes="0; 1" keySplines="0.1 0.8 0.3 1" calcMode="spline" fill="freeze" />
                        </circle>
                    )}

                    {/* Branch Nodes */}
                    {cities.map((c, i) => (
                        <g key={c.id} style={{
                            opacity: c.isHQ ? (phase >= 2 ? 1 : 0) : (phase >= 3 ? 1 : 0),
                            transition: `opacity 0.6s ease ${c.isHQ ? 0 : (i * 0.05)}s`
                        }}>
                            {/* Glow */}
                            <circle cx={c.x} cy={c.y} r={c.isHQ ? 2.5 : 1.5} fill={c.isHQ ? "rgba(249,115,22,0.3)" : "rgba(59,130,246,0.3)"} filter="blur(1px)" />
                            {/* Core */}
                            <circle cx={c.x} cy={c.y} r={c.isHQ ? 1 : 0.6} fill={c.isHQ ? "#f97316" : "#60a5fa"} />
                            
                            {/* City Name (only for a few major ones to avoid clutter) */}
                            {(c.isHQ || c.id === 'jeddah' || c.id === 'dammam') && (
                                <text 
                                    x={c.id === 'jeddah' ? c.x - 2 : c.x + 2} 
                                    y={c.y + 0.5} 
                                    fill="rgba(255,255,255,0.6)" 
                                    fontSize="2" 
                                    fontFamily="system-ui"
                                    textAnchor={c.id === 'jeddah' ? "end" : "start"}
                                >
                                    {c.name}
                                </text>
                            )}
                        </g>
                    ))}
                </svg>
            </div>

            <style>{`
                .hide-map { stroke-dasharray: 400; stroke-dashoffset: 400; opacity: 0; }
                .draw-map { stroke-dasharray: 400; stroke-dashoffset: 0; opacity: 1; transition: stroke-dashoffset 2s ease-in-out, opacity 0.5s; }
                
                .hide-line { stroke-dasharray: 100; stroke-dashoffset: 100; opacity: 0; }
                .draw-line { stroke-dasharray: 100; stroke-dashoffset: 0; opacity: 1; transition: stroke-dashoffset 1s ease-out; }
                
                @keyframes pulseGlow { 0% { opacity: 0.5; } 100% { opacity: 1; transform: scale(1.1); } }
                @keyframes loadBar { 0% { width: 0%; } 100% { width: 100%; } }
            `}</style>
        </div>
    );
};

export default Splash;
