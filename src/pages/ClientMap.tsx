import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBranches } from '../services/storage';
import type { Branch } from '../types';
import { Navigation } from 'lucide-react';

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

    useEffect(() => {
        setBranches(getBranches());
    }, []);

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
                    setUserLoc(loc);
                    setMapCenter(loc);
                },
                (error) => {
                    console.error("Error getting location: ", error);
                    alert('تعذر الوصول إلى موقعك. يرجى تفعيل إعدادات الموقع.');
                }
            );
        } else {
            alert('متصفحك لا يدعم تحديد الموقع.');
        }
    };

    return (
        <div style={{ height: 'calc(100vh - 80px)', width: '100%', padding: '1rem', position: 'relative' }}>
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
                {branches.map((branch) => (
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
