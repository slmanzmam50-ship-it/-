import React, { useEffect, useState } from 'react';

const cities = [
    { id: 'riyadh', x: 55, y: 48, name: 'الرياض', isHQ: true },
    { id: 'jeddah', x: 22, y: 62, name: 'جدة' },
    { id: 'dammam', x: 76, y: 42, name: 'الدمام' },
    { id: 'mecca', x: 25, y: 64, name: 'مكة المكرمة' },
    { id: 'medina', x: 27, y: 50, name: 'المدينة المنورة' },
    { id: 'tabuk', x: 18, y: 27, name: 'تبوك' },
    { id: 'jizan', x: 34, y: 94, name: 'جازان' },
    { id: 'abha', x: 28, y: 83, name: 'أبها' },
    { id: 'hail', x: 44, y: 34, name: 'حائل' },
    { id: 'buraydah', x: 49, y: 39, name: 'بريدة' },
    { id: 'arar', x: 40, y: 13, name: 'عرعر' },
    { id: 'najran', x: 47, y: 86, name: 'نجران' },
    { id: 'jubail', x: 73, y: 37, name: 'الجبيل' },
    { id: 'taif', x: 29, y: 66, name: 'الطائف' },
    { id: 'yanbu', x: 18, y: 48, name: 'ينبع' },
    { id: 'ahsa', x: 72, y: 52, name: 'الأحساء' },
    { id: 'khafji', x: 67, y: 27, name: 'الخفجي' },
];

// Highly accurate 31-point geographic polygon of Saudi Arabia's borders
const KSAPath = `
M 27 4 L 33 6 L 40 10 L 47 13 L 55 18 L 63 22 L 65 27 L 69 31 
L 72 35 L 75 39 L 77 43 L 80 48 L 85 59 L 80 65 L 74 71 L 67 76 
L 59 81 L 52 84 L 45 86 L 38 90 L 33 95 L 31 88 L 29 80 L 26 73 
L 24 66 L 22 59 L 20 52 L 18 45 L 16 38 L 16 28 L 21 21 Z
`;

const Splash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);

    useEffect(() => {
        // Fast sequence
        const t1 = setTimeout(() => setPhase(1), 50);   // Draw map outline quickly
        const t2 = setTimeout(() => setPhase(2), 300);  // HQ & Logo appear instantly
        const t3 = setTimeout(() => setPhase(3), 600);  // All branches and lines shoot out simultaneously
        
        // Wait duration (3.4 seconds to admire the scale of the network)
        const t4 = setTimeout(() => setPhase(4), 4000); // Fade out whole screen
        const t5 = setTimeout(() => onComplete(), 4500); // Unmount
        
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
            transition: 'opacity 0.5s ease',
        }}>
            {/* Background glowing aura */}
            <div style={{
                position: 'absolute', width: '80vw', height: '80vw',
                background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
                animation: 'pulseGlow 3s infinite alternate'
            }} />

            {/* Title & Logo */}
            <div style={{
                position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 20
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
                
                {/* Loader bar */}
                <div style={{
                    marginTop: '20px', width: '120px', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%', width: '0%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                        animation: phase >= 3 ? 'loadBar 3.4s linear forwards' : 'none'
                    }} />
                </div>
            </div>

            {/* The Map Container */}
            <div style={{
                position: 'absolute',
                top: '58%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%', maxWidth: '600px',
                aspectRatio: '1/1',
            }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    
                    {/* Accurate Map Outline */}
                    <path 
                        d={KSAPath}
                        fill="rgba(59,130,246,0.04)"
                        stroke="rgba(59,130,246,0.5)"
                        strokeWidth="0.4"
                        strokeLinejoin="round"
                        className={phase >= 1 ? 'draw-map' : 'hide-map'}
                    />

                    {/* Network Lines (HQ to branches) - Appear very fast */}
                    {cities.filter(c => !c.isHQ).map(c => (
                        <line 
                            key={`line-${c.id}`}
                            x1={hq.x} y1={hq.y} x2={c.x} y2={c.y}
                            stroke="rgba(249,115,22,0.4)"
                            strokeWidth="0.25"
                            className={phase >= 3 ? 'draw-line' : 'hide-line'}
                        />
                    ))}

                    {/* HQ Radar Pulse */}
                    {phase >= 2 && (
                        <circle cx={hq.x} cy={hq.y} r="0" fill="none" stroke="#f97316" strokeWidth="0.6">
                            <animate attributeName="r" values="0; 40" dur="1.5s" begin="0.1s" keyTimes="0; 1" keySplines="0.1 0.8 0.3 1" calcMode="spline" fill="freeze" />
                            <animate attributeName="opacity" values="1; 0" dur="1.5s" begin="0.1s" keyTimes="0; 1" keySplines="0.1 0.8 0.3 1" calcMode="spline" fill="freeze" />
                        </circle>
                    )}

                    {/* Branch Nodes - Instantly appear with phase 3 */}
                    {cities.map((c) => (
                        <g key={c.id} style={{
                            opacity: c.isHQ ? (phase >= 2 ? 1 : 0) : (phase >= 3 ? 1 : 0),
                            transition: 'opacity 0.3s ease'
                        }}>
                            {/* Glow */}
                            <circle cx={c.x} cy={c.y} r={c.isHQ ? 2.5 : 1.5} fill={c.isHQ ? "rgba(249,115,22,0.4)" : "rgba(59,130,246,0.4)"} filter="blur(1px)" />
                            {/* Core */}
                            <circle cx={c.x} cy={c.y} r={c.isHQ ? 1.2 : 0.7} fill={c.isHQ ? "#f97316" : "#60a5fa"} />
                            
                            {/* City Name */}
                            {(c.isHQ || c.id === 'jeddah' || c.id === 'dammam' || c.id === 'jizan' || c.id === 'tabuk') && (
                                <text 
                                    x={c.id === 'jeddah' || c.id === 'tabuk' ? c.x - 2 : c.x + 2} 
                                    y={c.y + 0.5} 
                                    fill="rgba(255,255,255,0.8)" 
                                    fontSize="2.2" 
                                    fontFamily="system-ui"
                                    fontWeight="600"
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
                .draw-map { stroke-dasharray: 400; stroke-dashoffset: 0; opacity: 1; transition: stroke-dashoffset 0.8s ease-out, opacity 0.3s; }
                
                .hide-line { stroke-dasharray: 100; stroke-dashoffset: 100; opacity: 0; }
                .draw-line { stroke-dasharray: 100; stroke-dashoffset: 0; opacity: 1; transition: stroke-dashoffset 0.4s ease-out; }
                
                @keyframes pulseGlow { 0% { opacity: 0.5; } 100% { opacity: 1; transform: scale(1.05); } }
                @keyframes loadBar { 0% { width: 0%; } 100% { width: 100%; } }
            `}</style>
        </div>
    );
};

export default Splash;
