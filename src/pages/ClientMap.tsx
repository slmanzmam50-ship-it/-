import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Language } from '../services/translations';
import { subscribeToBranches, addNavigationIntent, subscribeToActiveNavigators } from '../services/storage';
import { translations } from '../services/translations';
import type { Branch } from '../types';
import { Navigation, Phone, MessageCircle, Map as MapIcon, List, Fuel, Wrench, Zap, CircleDashed, ShieldCheck, Car, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

// Fix typical React Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create pure CSS animated dot markers
const createDotIcon = (status: string) => {
    const isOpen = status === 'مفتوح';
    return L.divIcon({
        className: 'custom-dot-marker',
        html: `<div class="dot-indicator ${isOpen ? 'dot-open' : 'dot-closed'}"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

const SkeletonLoader: React.FC = () => (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[1, 2, 3].map(i => (
            <div key={i} className="glass" style={{ height: '120px', borderRadius: '12px', animation: 'pulse 1.5s infinite', background: 'rgba(255,255,255,0.05)' }}></div>
        ))}
        <style>{`@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 0.8; } 100% { opacity: 0.5; } }`}</style>
    </div>
);

const getCategoryIcon = (name: string) => {
    const n = name.trim();
    if (n.includes('زيت') || n.includes('Oil')) return <Fuel size={12} />;
    if (n.includes('ميكانيكا') || n.includes('Mech')) return <Wrench size={12} />;
    if (n.includes('كهرباء') || n.includes('Elec')) return <Zap size={12} />;
    if (n.includes('إطارات') || n.includes('Tire')) return <CircleDashed size={12} />;
    if (n.includes('فحص') || n.includes('Check')) return <ShieldCheck size={12} />;
    if (n.includes('صيانة') || n.includes('Service')) return <Car size={12} />;
    return <Layers size={12} />;
};

const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        if (map) map.flyTo(center, zoom, { duration: 1.5 });
    }, [center, zoom, map]);
    return null;
};

const ClientMap: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lang, setLang] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'ar');
    const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([24.7136, 46.6753]);
    const [mapZoom, setMapZoom] = useState<number>(5);
    const [categoryFilter] = useState<string>('all');
    const [searchQuery] = useState('');
    const [congestionData, setCongestionData] = useState<Record<string, number>>({});
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

    const t = translations[lang];

    useEffect(() => {
        const checkLang = setInterval(() => {
            const currentLang = (localStorage.getItem('lang') as Language) || 'ar';
            if (currentLang !== lang) setLang(currentLang);
        }, 500);
        return () => clearInterval(checkLang);
    }, [lang]);

    useEffect(() => {
        const unsubBranches = subscribeToBranches((data) => {
            setBranches(data);
            setIsLoading(false);
        });
        return () => unsubBranches();
    }, []);

    useEffect(() => {
        const unsubs: (() => void)[] = [];
        branches.forEach(b => {
             const unsub = subscribeToActiveNavigators(b.id, (count) => {
                 setCongestionData(prev => ({ ...prev, [b.id]: count }));
             });
             unsubs.push(unsub);
        });
        return () => unsubs.forEach(f => f());
    }, [branches]);

    const getCongestionLevel = (branch: Branch, activeIntents: number) => {
        const isOpen = branch.status === 'مفتوح';
        if (!isOpen) return { label: t.closed + ' 🔴', color: 'var(--error)' };
        const capacity = branch.maxCapacity || 10;
        const currentLoad = branch.actualLoad || 0;
        const loadScore = currentLoad + (activeIntents * 0.3);
        const percentage = loadScore / capacity;
        if (percentage >= 0.75) return { label: t.congestion_high + ' 🟠', color: 'var(--warning)' };
        if (percentage >= 0.40) return { label: t.congestion_medium + ' 🟡', color: '#fbbf24' }; 
        return { label: t.congestion_low + ' 🟢', color: 'var(--success)' };
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            toast.loading(lang === 'ar' ? 'جاري تحديد موقعك...' : 'Locating...', { id: 'locate-toast' });
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
                    setUserLoc(loc);
                    const openBranches = branches.filter(b => b.status === 'مفتوح');
                    if (openBranches.length > 0) {
                        const sorted = openBranches.map(b => ({ ...b, dist: calculateDistance(loc[0], loc[1], b.latitude, b.longitude) })).sort((a, b) => a.dist - b.dist);
                        const nearest = sorted[0];
                        toast.success(lang === 'ar' ? `أقرب فرع هو: ${nearest.name}` : `Nearest: ${nearest.name}`, { id: 'locate-toast' });
                        setMapCenter([nearest.latitude, nearest.longitude]);
                        setMapZoom(14);
                    } else {
                        toast.success(t.loading, { id: 'locate-toast' });
                        setMapCenter(loc);
                        setMapZoom(12);
                    }
                },
                () => toast.error(lang === 'ar' ? 'فشل تحديد الموقع' : 'Location failed', { id: 'locate-toast' }),
                { enableHighAccuracy: true }
            );
        }
    };

    const handleNavigate = async (branch: Branch) => {
        if (!userLoc) {
            toast.error(lang === 'ar' ? 'يرجى تحديد موقعك أولاً' : 'Locate yourself first');
            return;
        }
        toast.loading(lang === 'ar' ? 'جاري تجهيز المسار...' : 'Planning route...', { id: 'nav-toast' });
        const distance = calculateDistance(userLoc[0], userLoc[1], branch.latitude, branch.longitude);
        const etaMinutes = Math.max(5, Math.ceil(distance / 0.66));
        try {
            await addNavigationIntent(branch.id, etaMinutes);
            toast.success(`${t.directions} - ${etaMinutes} mins`, { id: 'nav-toast' });
            setCongestionData(prev => ({ ...prev, [branch.id]: (prev[branch.id] || 0) + 1 }));
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`, '_blank');
        } catch (error) {
            toast.error('Error', { id: 'nav-toast' });
        }
    };

    const filteredBranches = branches.filter(branch => {
        const matchesSearch = branch.name.toLowerCase().includes(searchQuery.toLowerCase()) || branch.categories?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = categoryFilter === 'all' || branch.categories?.includes(categoryFilter);
        return matchesSearch && matchesCategory;
    });

    return (
        <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
            <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                {isLoading ? <SkeletonLoader /> : viewMode === 'map' ? (
                    <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
                        <ChangeView center={mapCenter} zoom={mapZoom} />
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {userLoc && (
                            <Marker position={userLoc}>
                                <Popup>{lang === 'ar' ? 'موقعك الحالي' : 'Your Location'}</Popup>
                            </Marker>
                        )}
                        {filteredBranches.map(b => (
                            <Marker key={b.id} position={[b.latitude, b.longitude]} icon={createDotIcon(b.status)}>
                                <Popup className="premium-popup">
                                    <div style={{ minWidth: '220px', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
                                        <h3 style={{ margin: '0 0 8px', color: 'var(--primary-color)', fontSize: '18px' }}>{b.name}</h3>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: getCongestionLevel(b, congestionData[b.id] || 0).color }}>
                                                {getCongestionLevel(b, congestionData[b.id] || 0).label}
                                            </span>
                                            <span style={{ fontSize: '12px', opacity: 0.7 }}>{b.workingHours.start} - {b.workingHours.end}</span>
                                        </div>
                                        <p style={{ fontSize: '13px', margin: '0 0 12px', opacity: 0.8 }}>{b.address}</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                            <button onClick={() => handleNavigate(b)} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '8px 4px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <Navigation size={14} /> {t.directions}
                                            </button>
                                            <a href={`https://wa.me/966${b.phone.startsWith('0') ? b.phone.substring(1) : b.phone}`} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: 'white', textDecoration: 'none', padding: '8px 4px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <MessageCircle size={14} /> {t.whatsapp}
                                            </a>
                                            <a href={`tel:${b.phone}`} style={{ background: 'rgba(0,0,0,0.05)', color: 'black', textDecoration: 'none', padding: '8px 4px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <Phone size={14} /> {t.call}
                                            </a>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                ) : (
                    <div style={{ padding: '1rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredBranches.map(b => (
                            <div key={b.id} className="glass" style={{ padding: '1.25rem', borderRadius: '15px', background: 'var(--navy-surface)', color: 'white' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <h3 style={{ margin: 0 }}>{b.name}</h3>
                                    <span style={{ color: getCongestionLevel(b, congestionData[b.id] || 0).color, fontWeight: 800 }}>{getCongestionLevel(b, congestionData[b.id] || 0).label}</span>
                                </div>
                                <p style={{ opacity: 0.7, fontSize: '14px', marginBottom: '12px' }}>{b.address}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                                    {b.categories?.map((cat, i) => (
                                        <span key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {getCategoryIcon(cat)} {cat}
                                        </span>
                                    ))}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                    <button onClick={() => { setMapCenter([b.latitude, b.longitude]); setMapZoom(16); setViewMode('map'); }} style={{ background: 'var(--accent-orange)', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>{t.map_view}</button>
                                    <button onClick={() => handleNavigate(b)} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>{t.directions}</button>
                                    <a href={`tel:${b.phone}`} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', padding: '10px', borderRadius: '10px', fontWeight: 800, textDecoration: 'none' }}>{t.call}</a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={() => setViewMode(prev => prev === 'map' ? 'list' : 'map')} style={{ position: 'absolute', bottom: '24px', [lang === 'ar' ? 'left' : 'right']: '24px', zIndex: 1000, background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '50%', width: '56px', height: '56px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {viewMode === 'map' ? <List size={26} /> : <MapIcon size={26} />}
                </button>
            </div>
            <button onClick={handleLocateMe} style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'var(--accent-orange)', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '35px', fontWeight: 800, fontSize: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Navigation size={20} /> {t.locate_me}
            </button>
        </div>
    );
};

export default ClientMap;
