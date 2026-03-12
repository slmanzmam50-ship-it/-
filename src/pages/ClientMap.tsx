import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBranches, getActiveNavigatorsCount, addNavigationIntent } from '../services/storage';
import type { Branch } from '../types';
import { Navigation, MapPin, Clock, Phone, Search, SlidersHorizontal, Info } from 'lucide-react';
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
    return L.divIcon({
        className: 'custom-dot-marker',
        html: `<div class="dot-indicator ${status === 'مفتوح' ? 'dot-open' : 'dot-closed'}"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

// Component to dynamically set map center with smooth flyTo animation
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom, { duration: 1.5 });
    }, [center, zoom, map]);
    return null;
};

const ClientMap: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([24.7136, 46.6753]); // Default Riyadh
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [congestionData, setCongestionData] = useState<Record<string, number>>({});

    useEffect(() => {
        const loadBranches = async () => {
            const data = await getBranches();
            setBranches(data);

            const counts: Record<string, number> = {};
            for (const b of data) {
                counts[b.id] = await getActiveNavigatorsCount(b.id);
            }
            setCongestionData(counts);
        };
        loadBranches();
    }, []);

    const getCongestionLevel = (branch: Branch, activeIntents: number) => {
        if (branch.status === 'مغلق') return { label: 'مغلق 🔴', color: 'var(--error)' };

        const capacity = branch.maxCapacity || 10;
        const currentLoad = branch.actualLoad || 0;
        const loadScore = currentLoad + (activeIntents * 0.3); // intent weight 0.3
        const percentage = loadScore / capacity;

        // If >= 75% load, show strong orange/warning instead of red error.
        if (percentage >= 0.75) return { label: 'مزدحم 🟠', color: 'var(--warning)' };
        // If >= 40% load, show light orange/yellow.
        if (percentage >= 0.40) return { label: 'متوسط 🟡', color: '#fbbf24' }; // lighter yellow-orange 
        // Default
        return { label: 'هادئ 🟢', color: 'var(--success)' };
    };

    // Haversine formula to calculate distance between two lat/lng coordinates in km
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance;
    };

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            toast.loading('جاري تحديد موقعك والبحث عن أقرب فرع...', { id: 'locate-toast' });
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
                    setUserLoc(loc);

                    // Find nearest OPEN branch
                    const openBranches = branches.filter(b => b.status === 'مفتوح');
                    if (openBranches.length > 0) {
                        let nearestBranch = openBranches[0];
                        let minDistance = calculateDistance(loc[0], loc[1], nearestBranch.latitude, nearestBranch.longitude);

                        for (let i = 1; i < openBranches.length; i++) {
                            const dist = calculateDistance(loc[0], loc[1], openBranches[i].latitude, openBranches[i].longitude);
                            if (dist < minDistance) {
                                minDistance = dist;
                                nearestBranch = openBranches[i];
                            }
                        }

                        toast.success(`أقرب فرع لك هو: ${nearestBranch.name} (يبعد ${minDistance.toFixed(1)} كم)`, { id: 'locate-toast', duration: 5000 });
                        setMapCenter([nearestBranch.latitude, nearestBranch.longitude]);
                    } else {
                        toast.success('تم تحديد موقعك، ولكن لا توجد فروع مفتوحة حالياً.', { id: 'locate-toast' });
                        setMapCenter(loc);
                    }
                },
                (error) => {
                    console.error("Error getting location: ", error);
                    toast.error('تعذر الوصول إلى موقعك. يرجى تفعيل إعدادات الموقع.', { id: 'locate-toast' });
                }
            );
        } else {
            toast.error('متصفحك لا يدعم تحديد الموقع.');
        }
    };

    const handleNavigate = async (branch: Branch) => {
        if (!userLoc) {
            toast.error('يرجى تحديد موقعك أولاً لنتمكن من توجيهك بشكل دقيق');
            return;
        }

        toast.loading('جاري تجهيز المسار وتسجيلك...', { id: 'nav-toast' });
        const distance = calculateDistance(userLoc[0], userLoc[1], branch.latitude, branch.longitude);
        // Assuming ~40 km/h average speed = 0.66 km per minute
        const etaMinutes = Math.max(5, Math.ceil(distance / 0.66));

        try {
            await addNavigationIntent(branch.id, etaMinutes);
            toast.success(`رافقتك السلامة! الوقت المتوقع: ${etaMinutes} دقيقة`, { id: 'nav-toast' });
            
            // Optimistically update local congestion data
            setCongestionData(prev => ({ ...prev, [branch.id]: (prev[branch.id] || 0) + 1 }));

            // Open Google Maps
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`, '_blank');
        } catch (error) {
            toast.error('حدث خطأ أثناء الاتصال', { id: 'nav-toast' });
        }
    };

    const filteredBranches = branches.filter(branch => {
        const matchesSearch = branch.name.includes(searchQuery) || branch.category.includes(searchQuery);
        const matchesCategory = categoryFilter === 'all' || branch.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div style={{ height: 'calc(100vh - 80px)', width: '100%', padding: '1rem', position: 'relative' }}>

            {/* Search and Filter Panel (Modern Floating) */}
            <div className="glass search-panel" style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                padding: '12px 16px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <Search size={20} color="var(--text-secondary)" />
                <input
                    type="text"
                    placeholder="ابحث عن فرع أو خدمة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '16px' }}
                />
                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{ 
                            border: 'none', background: 'transparent', outline: 'none', 
                            color: 'var(--text-primary)', cursor: 'pointer', appearance: 'none', 
                            fontWeight: 500, fontSize: '14px', paddingLeft: '8px', paddingRight: '22px'
                        }}
                    >
                        <option value="all">جميع الفئات</option>
                        <option value="صيانة عامة">صيانة عامة</option>
                        <option value="غيار زيت">غيار زيت</option>
                        <option value="إطارات">إطارات</option>
                        <option value="فحص شامل">فحص شامل</option>
                    </select>
                    <SlidersHorizontal size={16} color="var(--text-secondary)" style={{ position: 'absolute', right: '0', pointerEvents: 'none' }} />
                </div>
            </div>

            {/* Empty State Feedback */}
            {filteredBranches.length === 0 && (
                <div className="glass" style={{
                    position: 'absolute',
                    top: '90px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    padding: '12px 24px',
                    borderRadius: 'var(--radius-full)',
                    color: 'var(--warning)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 'bold',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <Info size={20} />
                    عذراً، لم نجد فروع مطابقة لبحثك
                </div>
            )}

            <button
                onClick={handleLocateMe}
                className="glass"
                style={{
                    position: 'absolute',
                    bottom: '30px',
                    right: '20px',
                    zIndex: 1000,
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--surface-color)',
                    background: 'var(--primary-color)',
                    boxShadow: 'var(--shadow-lg)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary-color)'}
                title="تحديد موقعي"
            >
                <Navigation size={24} />
            </button>

            <MapContainer
                center={mapCenter}
                zoom={12}
                style={{ height: '100%', width: '100%', borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}
            >
                <ChangeView center={mapCenter} zoom={12} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {/* User Location Marker */}
                {userLoc && (
                    <Marker position={userLoc}>
                        <Popup>
                            <strong>موقعك الحالي</strong>
                        </Popup>
                    </Marker>
                )}

                {/* Branch Markers */}
                {filteredBranches.map((branch) => (
                    <Marker
                        key={branch.id}
                        position={[branch.latitude, branch.longitude]}
                        icon={createDotIcon(branch.status)}
                    >
                        <Popup className="premium-popup">
                            <div style={{ textAlign: 'right', direction: 'rtl', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ margin: '0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px', fontWeight: 'bold' }}>
                                        <MapPin size={18} /> {branch.name}
                                    </h3>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginTop: '4px' }}>
                                    <span style={{
                                        background: branch.status === 'مفتوح' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: branch.status === 'مفتوح' ? 'var(--success)' : 'var(--error)',
                                        padding: '4px 10px',
                                        borderRadius: 'var(--radius-full)',
                                        fontWeight: 'bold'
                                    }}>
                                        {branch.status}
                                    </span>
                                    <span style={{ color: 'var(--text-secondary)' }}>•</span>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{branch.category}</span>
                                </div>

                                {/* Hybrid Congestion UI */}
                                {branch.status === 'مفتوح' && (
                                    <div style={{ background: 'var(--bg-color)', padding: '6px 10px', borderRadius: 'var(--radius-md)', fontSize: '13px', marginTop: '4px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>حالة الفرع:</span>
                                        <span style={{ fontWeight: 'bold', color: getCongestionLevel(branch, congestionData[branch.id] || 0).color }}>
                                            {getCongestionLevel(branch, congestionData[branch.id] || 0).label}
                                        </span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', marginTop: '6px', color: 'var(--text-primary)' }}>
                                    <Clock size={16} color="var(--text-secondary)" />
                                    <span>{branch.workingHours.start} - {branch.workingHours.end}</span>
                                </div>

                                <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    {branch.address}
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                                    <button
                                        onClick={() => handleNavigate(branch)}
                                        className="popup-call-btn"
                                        style={{ 
                                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
                                            background: 'var(--primary-color)', color: 'white', border: 'none',
                                            padding: '8px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                            fontWeight: 'bold', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)'
                                        }}
                                    >
                                        <Navigation size={16} />
                                        الاتجاه
                                    </button>
                                    <a
                                        href={`tel:${branch.phone}`}
                                        className="popup-call-btn"
                                        style={{ 
                                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
                                            background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                                            padding: '8px 12px', borderRadius: 'var(--radius-md)', 
                                            textDecoration: 'none', fontWeight: 'bold',
                                            transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)'
                                        }}
                                    >
                                        <Phone size={16} />
                                        اتصال
                                    </a>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default ClientMap;
