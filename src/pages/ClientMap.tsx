import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBranches } from '../services/storage';
import type { Branch } from '../types';
import { Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

// Fix typical React Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons for open/closed status
const openIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'marker-pulse-green'
});

const closedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'marker-pulse-red'
});

// Component to dynamically set map center
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    map.setView(center, zoom);
    return null;
};

const ClientMap: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([24.7136, 46.6753]); // Default Riyadh
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadBranches = async () => {
            const data = await getBranches();
            setBranches(data);
        };
        loadBranches();
    }, []);

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

    const filteredBranches = branches.filter(branch => {
        const matchesSearch = branch.name.includes(searchQuery) || branch.category.includes(searchQuery);
        const matchesCategory = categoryFilter === 'all' || branch.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div style={{ height: 'calc(100vh - 80px)', width: '100%', padding: '1rem', position: 'relative' }}>

            {/* Search and Filter Panel (Overlay) */}
            <div className="glass" style={{
                position: 'absolute',
                top: '2rem',
                left: '2rem',
                zIndex: 1000,
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                width: '300px',
                maxWidth: 'calc(100vw - 4rem)'
            }}>
                <input
                    type="text"
                    placeholder="ابحث عن فرع أو خدمة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                />
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                >
                    <option value="all">جميع التصنيفات</option>
                    <option value="صيانة عامة">صيانة عامة</option>
                    <option value="غيار زيت">غيار زيت</option>
                    <option value="إطارات">إطارات</option>
                    <option value="فحص شامل">فحص شامل</option>
                </select>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
                    تم العثور على {filteredBranches.length} فرع
                </div>
            </div>

            <button
                onClick={handleLocateMe}
                className="glass"
                style={{
                    position: 'absolute',
                    bottom: '2rem',
                    right: '2rem',
                    zIndex: 1000,
                    padding: '12px',
                    borderRadius: '50%',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary-color)',
                    boxShadow: 'var(--shadow-lg)',
                    cursor: 'pointer'
                }}
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
                        icon={branch.status === 'مفتوح' ? openIcon : closedIcon}
                    >
                        <Popup>
                            <div style={{ textAlign: 'right', direction: 'rtl' }}>
                                <h3 style={{ margin: '0 0 5px', color: 'var(--primary-color)' }}>{branch.name}</h3>
                                <p style={{ margin: '0 0 5px', fontSize: '14px' }}>
                                    <strong>التصنيف:</strong> {branch.category}
                                </p>
                                <p style={{ margin: '0 0 5px', fontSize: '14px' }}>
                                    <strong>الحالة:</strong>
                                    <span style={{
                                        color: branch.status === 'مفتوح' ? 'var(--success)' : 'var(--error)',
                                        fontWeight: 'bold',
                                        marginRight: '5px'
                                    }}>
                                        {branch.status}
                                    </span>
                                </p>
                                <p style={{ margin: '0 0 5px', fontSize: '14px' }}>
                                    <strong>أوقات العمل:</strong> {branch.workingHours.start} - {branch.workingHours.end}
                                </p>
                                <p style={{ margin: '0 0 5px', fontSize: '14px' }}>
                                    <strong>العنوان:</strong> {branch.address}
                                </p>
                                <a
                                    href={`tel:${branch.phone}`}
                                    style={{ display: 'block', marginTop: '10px', background: 'var(--primary-color)', color: 'white', padding: '5px 10px', borderRadius: '4px', textAlign: 'center', textDecoration: 'none' }}
                                >
                                    اتصال
                                </a>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default ClientMap;
