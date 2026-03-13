import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBranches, getActiveNavigatorsCount, addNavigationIntent, getCategories } from '../services/storage';
import type { Branch, Category } from '../types';
import { Navigation, MapPin, Clock, Phone, Search, AlertCircle, MessageCircle, Map as MapIcon, List, Layers } from 'lucide-react';
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
    const [categories, setCategories] = useState<Category[]>([]);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

    useEffect(() => {
        const loadData = async () => {
            const [data, cats] = await Promise.all([
                getBranches(),
                getCategories()
            ]);
            setBranches(data);
            setCategories(cats);

            const counts: Record<string, number> = {};
            for (const b of data) {
                counts[b.id] = await getActiveNavigatorsCount(b.id);
            }
            setCongestionData(counts);
        };
        loadData();
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
        const matchesSearch = branch.name.includes(searchQuery) || branch.categories?.some(c => c.includes(searchQuery));
        const matchesCategory = categoryFilter === 'all' || branch.categories?.includes(categoryFilter);
        return matchesSearch && matchesCategory;
    });

    return (
        <div style={{ height: 'calc(100vh - 80px)', width: '100%', display: 'flex', flexDirection: 'column', background: 'var(--navy-deep)' }}>
            
            {/* Dark Navy Header Section */}
            <div className="branch-directory-header" style={{ 
                background: 'var(--navy-deep)', 
                padding: '1.5rem 1rem 1rem', 
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                zIndex: 1001
            }}>
                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'white' }}>
                    <MapPin size={24} color="var(--accent-orange)" />
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>دليل الفروع</h1>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                    <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="ابحث عن مدينتك أو خدمتك..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input-mobile"
                        style={{ 
                            width: '100%', 
                            padding: '12px 48px 12px 16px', 
                            borderRadius: 'var(--radius-full)', 
                            border: 'none', 
                            background: 'white', 
                            fontSize: '16px',
                            color: 'var(--navy-deep)',
                            outline: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                    />
                </div>

                {/* View Mode Toggle */}
                <div style={{ 
                    display: 'flex', 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '4px',
                    width: '100%',
                    maxWidth: '400px',
                    margin: '0 auto'
                }}>
                    <button 
                        onClick={() => setViewMode('map')}
                        className="toggle-button-mobile"
                        style={{ 
                            flex: 1, 
                            padding: '8px', 
                            borderRadius: 'var(--radius-md)', 
                            border: 'none',
                            background: viewMode === 'map' ? 'var(--accent-orange)' : 'transparent',
                            color: 'white',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <MapIcon size={18} /> الخريطة
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className="toggle-button-mobile"
                        style={{ 
                            flex: 1, 
                            padding: '8px', 
                            borderRadius: 'var(--radius-md)', 
                            border: 'none',
                            background: viewMode === 'list' ? 'var(--accent-orange)' : 'transparent',
                            color: 'white',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <List size={18} /> القائمة
                    </button>
                </div>

                {/* Category Pills */}
                <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    overflowX: 'auto', 
                    padding: '4px 0',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}>
                    <button
                        onClick={() => setCategoryFilter('all')}
                        style={{
                            padding: '6px 20px',
                            borderRadius: 'var(--radius-full)',
                            border: 'none',
                            background: categoryFilter === 'all' ? 'var(--accent-orange)' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            whiteSpace: 'nowrap',
                            fontSize: '14px',
                            fontWeight: 600
                        }}
                    >
                        الكل
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setCategoryFilter(cat.name)}
                            className="pill-button-mobile"
                            style={{
                                padding: '6px 20px',
                                borderRadius: 'var(--radius-full)',
                                border: 'none',
                                background: categoryFilter === cat.name ? 'var(--accent-orange)' : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                whiteSpace: 'nowrap',
                                fontSize: '14px',
                                fontWeight: 600
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, position: 'relative' }}>
                {viewMode === 'map' ? (
                    <>
                        <MapContainer
                            center={mapCenter}
                            zoom={5}
                            minZoom={5}
                            maxBounds={[
                                [16.3, 34.5],
                                [32.2, 55.6]
                            ]}
                            maxBoundsViscosity={1.0}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <ChangeView center={mapCenter} zoom={mapCenter[0] === 24.7136 ? 5 : 12} />
                            <TileLayer
                                attribution='&copy; <a href="https://www.google.com/intl/ar/help/terms_maps/">Google Maps</a>'
                                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar"
                            />

                            {userLoc && (
                                <Marker position={userLoc}>
                                    <Popup>
                                        <strong>موقعك الحالي</strong>
                                    </Popup>
                                </Marker>
                            )}

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
                                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{branch.categories?.join('، ')}</span>
                                            </div>

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

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
                                                <button
                                                    onClick={() => handleNavigate(branch)}
                                                    className="popup-call-btn"
                                                    style={{ 
                                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px',
                                                        background: 'var(--primary-color)', color: 'white', border: 'none',
                                                        padding: '8px 4px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                                        fontWeight: 'bold', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    <Navigation size={14} />
                                                    الاتجاه
                                                </button>
                                                <a
                                                    href={`https://wa.me/966${branch.phone.startsWith('0') ? branch.phone.substring(1) : branch.phone}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="popup-call-btn"
                                                    style={{ 
                                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px',
                                                        background: '#25D366', color: 'white', border: 'none',
                                                        padding: '8px 4px', borderRadius: 'var(--radius-md)', 
                                                        textDecoration: 'none', fontWeight: 'bold',
                                                        transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    <MessageCircle size={14} />
                                                    واتساب
                                                </a>
                                                <a
                                                    href={`tel:${branch.phone}`}
                                                    className="popup-call-btn"
                                                    style={{ 
                                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px',
                                                        background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                                                        padding: '8px 4px', borderRadius: 'var(--radius-md)', 
                                                        textDecoration: 'none', fontWeight: 'bold',
                                                        transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    <Phone size={14} />
                                                    اتصال
                                                </a>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>

                        {/* Floating Action Button for Location */}
                        <button
                            onClick={handleLocateMe}
                            style={{
                                position: 'absolute',
                                bottom: '24px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 1000,
                                padding: '12px 24px',
                                borderRadius: 'var(--radius-full)',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: 'white',
                                background: 'var(--accent-orange)',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                                fontWeight: 800,
                                fontSize: '14px',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <Navigation size={18} />
                            أقرب فرع لي
                        </button>
                    </>
                ) : (
                    <div style={{ height: '100%', overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredBranches.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'white' }}>
                                <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <h3>لا توجد فروع مطابقة لبحثك</h3>
                            </div>
                        ) : (
                            filteredBranches.map(branch => (
                                <div key={branch.id} className="glass branch-card-mobile" style={{ 
                                    padding: '1.25rem', 
                                    borderRadius: 'var(--radius-lg)', 
                                    background: 'var(--navy-surface)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    color: 'white'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0 }}>{branch.name}</h3>
                                        <span style={{ 
                                            padding: '4px 10px', 
                                            borderRadius: 'var(--radius-full)', 
                                            background: branch.status === 'مفتوح' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                            color: branch.status === 'مفتوح' ? 'var(--success)' : 'var(--error)',
                                            fontSize: '12px',
                                            fontWeight: 700
                                        }}>{branch.status}</span>
                                    </div>
                                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>{branch.address}</p>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={16} /> {branch.workingHours.start} - {branch.workingHours.end}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Layers size={16} /> {branch.categories?.join('، ')}
                                        </div>
                                    </div>
                                    <div className="action-buttons-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                        <button onClick={() => { setMapCenter([branch.latitude, branch.longitude]); setViewMode('map'); }} style={{ background: 'var(--primary-color)', border: 'none', color: 'white', padding: '8px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>الخريطة</button>
                                        <a href={`https://wa.me/966${branch.phone.startsWith('0') ? branch.phone.substring(1) : branch.phone}`} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: 'white', textAlign: 'center', padding: '8px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>واتساب</a>
                                        <a href={`tel:${branch.phone}`} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', padding: '8px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>اتصال</a>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientMap;
