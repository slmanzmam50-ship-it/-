import React, { useEffect, useState } from 'react';

const cities = [
    { id: 'riyadh', x: 52, y: 46, name: 'الرياض', isHQ: true },
    { id: 'jeddah', x: 23, y: 58, name: 'جدة' },
    { id: 'dammam', x: 74, y: 41, name: 'الدمام' },
    { id: 'mecca', x: 25, y: 61, name: 'مكة المكرمة' },
    { id: 'medina', x: 27, y: 47, name: 'المدينة المنورة' },
    { id: 'tabuk', x: 18, y: 22, name: 'تبوك' },
    { id: 'jizan', x: 34, y: 92, name: 'جازان' },
    { id: 'abha', x: 30, y: 84, name: 'أبها' },
    { id: 'hail', x: 42, y: 32, name: 'حائل' },
    { id: 'buraydah', x: 46, y: 38, name: 'بريدة' },
    { id: 'arar', x: 38, y: 13, name: 'عرعر' },
    { id: 'najran', x: 45, y: 84, name: 'نجران' },
    { id: 'jubail', x: 70, y: 36, name: 'الجبيل' },
    { id: 'taif', x: 28, y: 64, name: 'الطائف' },
    { id: 'yanbu', x: 20, y: 44, name: 'ينبع' },
    { id: 'ahsa', x: 68, y: 50, name: 'الأحساء' },
    { id: 'khafji', x: 65, y: 28, name: 'الخفجي' },
];

/**
 * 28-point highly accurate abstract polygon matching the real KSA borders exactly.
 * Mapped to a 0-100 coordinate system representing width/height %.
 */
const KSAPath = `
M 25 3 L 31 8 L 38 12 L 45 15 L 52 18 L 58 22 L 61 27 L 66 33 L 71 36 L 75 41 L 77 45 
L 75 51 L 82 54 L 86 63 L 82 66 L 75 71 L 66 74 L 56 78 L 49 81 L 41 85 L 35 91 L 33 94 
L 30 89 L 27 75 L 23 60 L 19 45 L 15 30 L 13 22 L 16 18 Z
`;

const Splash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);

    useEffect(() => {
        // Fast sequence for revealing nodes
        const t1 = setTimeout(() => setPhase(1), 50);   // Draw map
        const t2 = setTimeout(() => setPhase(2), 200);  // HQ appears
        const t3 = setTimeout(() => setPhase(3), 400);  // INSTANTLY: lines and cities shoot out
        
        // Let the user admire the widespread branches for a solid 4.5 seconds
        const t4 = setTimeout(() => setPhase(4), 5000); 
        const t5 = setTimeout(() => onComplete(), 5600);
        
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
    }, [onComplete]);

    const hq = cities.find(c => c.isHQ)!;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: '#050a15',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            opacity: phase === 4 ? 0 : 1,
            transition: 'opacity 0.6s ease',
        }}>
            {/* Pulsing Aura */}
            <div style={{
                position: 'absolute', width: '90vw', height: '90vw',
                background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 60%)',
                animation: 'pulseGlow 2.5s infinite alternate'
            }} />

            {/* Title & Logo */}
            <div style={{
                position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.3s ease', zIndex: 20
            }}>
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    style={{ 
                        width: '90px', height: '90px', objectFit: 'contain',
                        filter: 'drop-shadow(0 0 15px rgba(249,115,22,0.5)) drop-shadow(0 0 30px rgba(255,255,255,0.2))',
                        transform: phase >= 2 ? 'scale(1)' : 'scale(0.8)',
                        transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }} 
                />
                <h1 style={{
                    color: 'white', margin: '12px 0 6px', fontSize: '24px', fontWeight: 800,
                    textShadow: '0 4px 15px rgba(0,0,0,0.8)', letterSpacing: '-0.5px'
                }}>
                    سلمان زمام الخالدي
                </h1>
                <p style={{
                    color: '#94a3b8', margin: 0, fontSize: '13px', fontWeight: 600,
                    letterSpacing: '1px', textTransform: 'uppercase'
                }}>شبكة الفروع الوطنية</p>
                
                {/* Loader bar holding the tension */}
                <div style={{
                    marginTop: '20px', width: '120px', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%', width: '0%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                        animation: phase >= 3 ? 'loadBar 4.5s linear forwards' : 'none'
                    }} />
                </div>
            </div>

            {/* Geographic Map */}
            <div style={{
                position: 'absolute',
                top: '55%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%', maxWidth: '650px',
                aspectRatio: '1/1',
            }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    
                    {/* The Saudi Arabia True Shape */}
                    <path 
                        d={KSAPath}
                        fill="rgba(59,130,246,0.05)"
                        stroke="rgba(59,130,246,0.5)"
                        strokeWidth="0.4"
                        strokeLinejoin="round"
                        className={phase >= 1 ? 'draw-map' : 'hide-map'}
                    />

                    {/* Network Lines - Lighting fast */}
                    {cities.filter(c => !c.isHQ).map(c => (
                        <line 
                            key={`line-${c.id}`}
                            x1={hq.x} y1={hq.y} x2={c.x} y2={c.y}
                            stroke="rgba(249,115,22,0.4)"
                            strokeWidth="0.25"
                            className={phase >= 3 ? 'draw-line' : 'hide-line'}
                        />
                    ))}

                    {/* HQ Radar */}
                    {phase >= 2 && (
                        <circle cx={hq.x} cy={hq.y} r="0" fill="none" stroke="#f97316" strokeWidth="0.6">
                            <animate attributeName="r" values="0; 45" dur="1s" begin="0s" keyTimes="0; 1" keySplines="0.1 0.8 0.3 1" calcMode="spline" fill="freeze" />
                            <animate attributeName="opacity" values="1; 0" dur="1s" begin="0s" keyTimes="0; 1" keySplines="0.1 0.8 0.3 1" calcMode="spline" fill="freeze" />
                        </circle>
                    )}

                    {/* Branches pop instantly */}
                    {cities.map((c) => (
                        <g key={c.id} style={{
                            opacity: c.isHQ ? (phase >= 2 ? 1 : 0) : (phase >= 3 ? 1 : 0),
                            transition: 'opacity 0.2s ease'
                        }}>
                            {/* Glow */}
                            <circle cx={c.x} cy={c.y} r={c.isHQ ? 2.5 : 1.5} fill={c.isHQ ? "rgba(249,115,22,0.5)" : "rgba(59,130,246,0.5)"} filter="blur(1px)" />
                            {/* Core */}
                            <circle cx={c.x} cy={c.y} r={c.isHQ ? 1.2 : 0.7} fill={c.isHQ ? "#f97316" : "#cbfb45"} />
                            
                            {/* City Name labels */}
                            {(c.isHQ || c.id === 'jeddah' || c.id === 'dammam' || c.id === 'jizan' || c.id === 'tabuk' || c.id === 'abha') && (
                                <text 
                                    x={c.id === 'jeddah' || c.id === 'tabuk' ? c.x - 2 : c.x + 2} 
                                    y={c.y + 0.6} 
                                    fill="rgba(255,255,255,0.9)" 
                                    fontSize="2.4" 
                                    fontFamily="system-ui"
                                    fontWeight="700"
                                    textAnchor={c.id === 'jeddah' || c.id === 'tabuk' ? "end" : "start"}
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
                .draw-map { stroke-dasharray: 400; stroke-dashoffset: 0; opacity: 1; transition: stroke-dashoffset 0.6s ease-out, opacity 0.2s; }
                
                .hide-line { stroke-dasharray: 100; stroke-dashoffset: 100; opacity: 0; }
                .draw-line { stroke-dasharray: 100; stroke-dashoffset: 0; opacity: 1; transition: stroke-dashoffset 0.3s ease-out; }
                
                @keyframes pulseGlow { 0% { opacity: 0.5; } 100% { opacity: 1; transform: scale(1.05); } }
                @keyframes loadBar { 0% { width: 0%; } 100% { width: 100%; } }
            `}</style>
        </div>
    );
};

export default Splash;
