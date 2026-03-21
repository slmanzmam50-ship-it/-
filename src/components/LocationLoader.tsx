import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

interface LocationLoaderProps {
    isActive: boolean;
    lang: 'ar' | 'en';
}

const LocationLoader: React.FC<LocationLoaderProps> = ({ isActive, lang }) => {
    const [render, setRender] = useState(isActive);
    const [textIndex, setTextIndex] = useState(0);

    const texts = lang === 'ar' ? [
        "جاري الاتصال بالأقمار الصناعية 🛰️...",
        "حساب الإحداثيات الدقيقة 🧭...",
        "البحث عن الفروع في منطقتك 🔍...",
        "تحليل بيانات الازدحام 📊...",
        "تجهيز الخريطة لك 🗺️..."
    ] : [
        "Connecting to satellites 🛰️...",
        "Calculating coordinates 🧭...",
        "Scanning nearby branches 🔍...",
        "Analyzing congestion data 📊...",
        "Preparing your map 🗺️..."
    ];

    // Handle unmount animation
    useEffect(() => {
        if (isActive) setRender(true);
        else {
            const t = setTimeout(() => setRender(false), 500); // match CSS fade-out dur
            return () => clearTimeout(t);
        }
    }, [isActive]);

    // Cycling text
    useEffect(() => {
        if (!isActive) return;
        setTextIndex(0);
        const interval = setInterval(() => {
            setTextIndex(prev => (prev + 1) % texts.length);
        }, 2200);
        return () => clearInterval(interval);
    }, [isActive, texts.length]);

    if (!render) return null;

    // Generate random "found" blips
    const blips = Array.from({ length: 6 }).map((_, i) => ({
        id: i,
        top: Math.random() * 80 + 10,  // 10% to 90%
        left: Math.random() * 80 + 10, // 10% to 90%
        delay: Math.random() * 3,
        dur: Math.random() * 2 + 1.5
    }));

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: isActive ? 1 : 0,
            transition: 'opacity 0.4s ease-out'
        }}>
            {/* Radar Container */}
            <div style={{
                position: 'relative', width: '280px', height: '280px',
                borderRadius: '50%',
                border: '2px solid rgba(59, 130, 246, 0.3)',
                boxShadow: '0 0 40px rgba(59, 130, 246, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden'
            }}>
                {/* Radar Grid circles */}
                <div style={{ position: 'absolute', inset: '15%', borderRadius: '50%', border: '1px solid rgba(59,130,246,0.2)' }} />
                <div style={{ position: 'absolute', inset: '35%', borderRadius: '50%', border: '1px solid rgba(59,130,246,0.3)' }} />
                
                {/* Crosshairs */}
                <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'rgba(59,130,246,0.3)' }} />
                <div style={{ position: 'absolute', height: '100%', width: '1px', background: 'rgba(59,130,246,0.3)' }} />

                {/* Radar Sweep */}
                <div style={{
                    position: 'absolute', top: 0, left: '50%',
                    width: '50%', height: '50%',
                    background: 'linear-gradient(90deg, transparent 50%, rgba(59,130,246,0.5) 100%)',
                    transformOrigin: 'bottom left',
                    animation: 'radarSpin 2s linear infinite'
                }} />

                {/* Center dot */}
                <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: '#3b82f6',
                    boxShadow: '0 0 15px #3b82f6, 0 0 30px #3b82f6',
                    position: 'relative', zIndex: 10
                }} />

                {/* Blips (Found branches) */}
                {blips.map(b => (
                    <div key={b.id} style={{
                        position: 'absolute',
                        top: `${b.top}%`, left: `${b.left}%`,
                        color: '#f97316',
                        animation: `blipFade ${b.dur}s ease-in-out ${b.delay}s infinite`,
                        opacity: 0,
                    }}>
                        <MapPin size={20} fill="currentColor" opacity={0.8} />
                    </div>
                ))}
            </div>

            {/* Dynamic Text Container */}
            <div style={{
                marginTop: '3rem', height: '40px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', width: '300px'
            }}>
                {texts.map((txt, i) => (
                    <p key={i} style={{
                        position: 'absolute', width: '100%', textAlign: 'center',
                        margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'white',
                        opacity: i === textIndex ? 1 : 0,
                        transform: i === textIndex ? 'translateY(0)' : 'translateY(10px)',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        {txt}
                    </p>
                ))}
            </div>

            <style>{`
                @keyframes radarSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes blipFade {
                    0% { opacity: 0; transform: scale(0.5); }
                    10% { opacity: 1; transform: scale(1.2); }
                    20% { opacity: 0.8; transform: scale(1); }
                    50% { opacity: 0; transform: scale(1); }
                    100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default LocationLoader;
