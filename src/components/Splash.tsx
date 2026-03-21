import React, { useEffect, useState } from 'react';

const cities = [
    { id: 'riyadh', x: 57.48, y: 47.10, name: 'الرياض', isHQ: true },
    { id: 'dammam', x: 73.57, y: 36.48, name: 'الدمام' },
    { id: 'buraydah', x: 44.42, y: 36.90, name: 'بريدة' },
    { id: 'hail', x: 33.56, y: 29.34, name: 'حائل' },
    { id: 'medina', x: 23.67, y: 48.65, name: 'المدينة المنورة' },
    { id: 'tabuk', x: 9.19, y: 23.89, name: 'تبوك' },
    { id: 'jeddah', x: 21.68, y: 67.51, name: 'جدة' },
    { id: 'mecca', x: 24.64, y: 68.12, name: 'مكة المكرمة' },
    { id: 'taif', x: 27.45, y: 68.87, name: 'الطائف' },
    { id: 'abha', x: 37.43, y: 88.18, name: 'أبها' },
    { id: 'jizan', x: 37.65, y: 96.58, name: 'جازان' },
    { id: 'najran', x: 45.14, y: 92.76, name: 'نجران' },
    { id: 'jubail', x: 71.45, y: 32.58, name: 'الجبيل' },
    { id: 'yanbu', x: 16.38, y: 51.04, name: 'ينبع' },
    { id: 'ahsa', x: 70.99, y: 42.88, name: 'الأحساء' },
    { id: 'khafji', x: 65.88, y: 23.58, name: 'الخفجي' },
    { id: 'arar', x: 30.36, y: 7.50, name: 'عرعر' }
];

const KSAPath = "M 38.73 100.00 L 38.12 97.30 L 36.68 95.40 L 36.31 92.87 L 33.86 90.61 L 31.33 85.31 L 29.98 80.15 L 26.70 75.80 L 24.58 74.76 L 21.43 68.73 L 20.88 64.34 L 21.08 60.59 L 18.35 53.58 L 16.12 51.11 L 13.56 49.80 L 11.99 46.18 L 12.25 44.75 L 10.93 41.47 L 9.54 40.06 L 7.69 35.36 L 4.79 30.26 L 2.37 25.91 L 0.00 25.94 L 0.74 22.47 L 0.95 20.26 L 1.54 17.73 L 6.83 18.74 L 8.88 16.79 L 10.02 14.52 L 13.65 13.64 L 14.43 11.52 L 16.00 10.45 L 11.27 4.13 L 20.79 0.95 L 21.69 0.00 L 27.42 1.71 L 34.50 6.14 L 47.91 18.86 L 56.75 19.36 L 60.98 19.97 L 62.17 22.99 L 65.53 22.82 L 67.39 28.28 L 69.73 29.72 L 70.54 31.94 L 73.78 34.60 L 74.07 37.21 L 73.60 39.32 L 74.20 41.44 L 75.57 43.21 L 76.20 45.29 L 76.91 46.84 L 78.35 48.09 L 79.67 47.64 L 80.57 50.06 L 80.75 51.52 L 82.57 57.93 L 96.86 61.11 L 97.82 59.78 L 100.00 64.26 L 96.83 76.90 L 82.57 83.23 L 68.86 85.65 L 64.42 88.50 L 61.02 95.14 L 58.80 96.19 L 57.61 94.08 L 55.79 94.40 L 51.19 93.77 L 50.32 93.14 L 44.83 93.28 L 43.54 93.85 L 41.59 92.21 L 40.33 95.32 L 40.82 97.98 L 38.73 100.00 Z";

const Splash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    // Phase 0: Hidden
    // Phase 1: Show Map & Logo
    // Phase 2: Start animation sequence
    // Phase 3: Fade out splash screen
    const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

    // Number of branches
    const branchCount = cities.length - 1;
    // Delay between each branch firing
    const staggerTime = 120; // 120ms between each flight path
    // Time it takes for a flight path curve to draw
    const flightDuration = 400; // 400ms duration per line
    
    // Total animation time = startDelay + (branchCount * staggerTime) + flightDuration
    // Extracted end time = 200 + (16 * 120) + 400 = 2520ms
    // The user wants < 0.25s pause after the last branch lands. 2520ms + 200ms = 2720ms.

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 50);   
        const t2 = setTimeout(() => setPhase(2), 200);  
        
        const fadeOutTime = 200 + (branchCount * staggerTime) + flightDuration + 150; // Very short pause
        const unmountTime = fadeOutTime + 500; // Allow 0.5s for opacity fade transition

        const t3 = setTimeout(() => setPhase(3), fadeOutTime); 
        const t4 = setTimeout(() => onComplete(), unmountTime);
        
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }, [onComplete, branchCount]);

    const hq = cities.find(c => c.isHQ)!;
    const branches = cities.filter(c => !c.isHQ);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: '#050a15',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            opacity: phase === 3 ? 0 : 1,
            transition: 'opacity 0.5s ease-in-out',
        }}>
            {/* Pulsing Aura */}
            <div style={{
                position: 'absolute', width: '90vw', height: '90vw',
                background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 60%)',
                animation: 'pulseGlow 2.5s infinite alternate'
            }} />

            {/* Title & Logo (No Loading Bar) */}
            <div style={{
                position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.3s ease', zIndex: 20
            }}>
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    style={{ 
                        width: '90px', height: '90px', objectFit: 'contain',
                        filter: 'drop-shadow(0 0 15px rgba(249,115,22,0.5)) drop-shadow(0 0 30px rgba(255,255,255,0.2))',
                        transform: phase >= 1 ? 'scale(1)' : 'scale(0.8)',
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
            </div>

            {/* Geographic Map */}
            <div style={{
                position: 'absolute',
                top: '55%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%', maxWidth: '650px',
                aspectRatio: '1/1',
            }}>
                <svg viewBox="-5 -5 110 110" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    
                    {/* The Saudi Arabia True Shape */}
                    <path 
                        d={KSAPath}
                        fill="rgba(59,130,246,0.05)"
                        stroke="rgba(59,130,246,0.35)"
                        strokeWidth="0.4"
                        strokeLinejoin="round"
                        className={phase >= 1 ? 'draw-map' : 'hide-map'}
                    />

                    {/* Flight arcs (HQ to branches sequentially) */}
                    {branches.map((c, i) => {
                        // Calculate an upward curve control point
                        const midX = (hq.x + c.x) / 2;
                        const midY = (hq.y + c.y) / 2;
                        // Push the control point "up" (lower Y value) to make an arc
                        const curveFactor = 15 + Math.random() * 10;
                        const cx = midX;
                        const cy = midY - curveFactor;

                        return (
                            <path 
                                key={`arc-${c.id}`}
                                d={`M ${hq.x} ${hq.y} Q ${cx} ${cy} ${c.x} ${c.y}`}
                                fill="none"
                                stroke="rgba(249,115,22,0.6)"
                                strokeWidth="0.3"
                                className="flight-arc"
                                style={{
                                    animationDelay: `${i * staggerTime}ms`,
                                    animationPlayState: phase >= 2 ? 'running' : 'paused'
                                }}
                            />
                        );
                    })}

                    {/* HQ Node */}
                    <g style={{
                        opacity: phase >= 1 ? 1 : 0,
                        transition: 'opacity 0.3s ease'
                    }}>
                        <circle cx={hq.x} cy={hq.y} r={2.5} fill="rgba(249,115,22,0.5)" filter="blur(1px)" />
                        <circle cx={hq.x} cy={hq.y} r={1.2} fill="#f97316" />
                    </g>
                    
                    {/* HQ Radar */}
                    {phase >= 1 && (
                        <circle cx={hq.x} cy={hq.y} r="0" fill="none" stroke="#f97316" strokeWidth="0.6">
                            <animate attributeName="r" values="0; 45" dur="1s" begin="0.2s" keyTimes="0; 1" keySplines="0.1 0.8 0.3 1" calcMode="spline" fill="freeze" />
                            <animate attributeName="opacity" values="1; 0" dur="1s" begin="0.2s" keyTimes="0; 1" keySplines="0.1 0.8 0.3 1" calcMode="spline" fill="freeze" />
                        </circle>
                    )}

                    {/* Branch Nodes pop sequentially AFTER their flight land */}
                    {branches.map((c, i) => (
                        <g key={c.id} className="city-node" style={{
                            animationDelay: `${i * staggerTime + flightDuration}ms`,
                            animationPlayState: phase >= 2 ? 'running' : 'paused'
                        }}>
                            {/* Glow */}
                            <circle cx={c.x} cy={c.y} r={1.5} fill="rgba(59,130,246,0.6)" filter="blur(1px)" />
                            {/* Core */}
                            <circle cx={c.x} cy={c.y} r={0.7} fill="#cbfb45" />
                            
                            {/* City Name labels */}
                            {(c.id === 'jeddah' || c.id === 'dammam' || c.id === 'jizan' || c.id === 'tabuk' || c.id === 'abha' || c.id === 'buraydah') && (
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
                .draw-map { stroke-dasharray: 400; stroke-dashoffset: 0; opacity: 1; transition: stroke-dashoffset 0.8s ease-out, opacity 0.2s; }
                
                .flight-arc {
                    stroke-dasharray: 200;
                    stroke-dashoffset: 200;
                    opacity: 0;
                    animation: drawArc ${flightDuration}ms ease-out forwards;
                }
                
                @keyframes drawArc {
                    0% { stroke-dashoffset: 200; opacity: 1; }
                    50% { opacity: 1; }
                    100% { stroke-dashoffset: 0; opacity: 0.3; } /* Leave trace visible slightly */
                }

                .city-node {
                    opacity: 0;
                    animation: popNode 0.4s ease-out forwards;
                }

                @keyframes popNode {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                
                @keyframes pulseGlow { 0% { opacity: 0.5; } 100% { opacity: 1; transform: scale(1.05); } }
            `}</style>
        </div>
    );
};

export default Splash;
