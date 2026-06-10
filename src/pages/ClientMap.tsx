import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Language } from '../services/translations';
import { subscribeToBranches, addNavigationIntent, subscribeToActiveNavigators, subscribeToCategories } from '../services/storage';
import { translations } from '../services/translations';
import type { Branch, Category } from '../types';
import { Navigation, MessageCircle, Fuel, Wrench, Zap, CircleDashed, ShieldCheck, Car, Layers, Search, MapPin, Share2, AlertCircle, BarChart2, Phone, Clock, ChevronDown, X, SortAsc } from 'lucide-react';
import toast from 'react-hot-toast';
import LocationLoader from '../components/LocationLoader';

// Fix typical React Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================================
// #10 - Custom user location marker (blue pulsing dot)
// ============================================================
const createUserIcon = () => L.divIcon({
    className: 'custom-user-marker',
    html: `
        <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(59,130,246,0.25);animation:userPulse 2s infinite;"></div>
            <div style="width:14px;height:14px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(59,130,246,0.8);position:relative;z-index:1;"></div>
        </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

// Branch status circular marker with branch image and pointer pin
const createBranchIcon = (branch: Branch, isOpen: boolean) => {
    const statusColor = branch.status === 'تحت الصيانة' ? '#f97316' : (isOpen ? '#10b981' : '#ef4444');
    
    // SVG store icon placeholder if no image is present
    const placeholderSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; color: ${statusColor}; display: block;">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
    `;

    const htmlContent = `
        <div class="custom-branch-marker-container">
            <div class="marker-circle" style="border-color: ${statusColor};">
                ${branch.imageUrl 
                    ? `<img src="${branch.imageUrl}" alt="${branch.name}" class="marker-img" />`
                    : `<div class="marker-placeholder">${placeholderSvg}</div>`
                }
            </div>
            <div class="marker-pin" style="background-color: ${statusColor};"></div>
        </div>
    `;

    return L.divIcon({
        className: 'custom-branch-leaflet-icon',
        html: htmlContent,
        iconSize: [46, 56],
        iconAnchor: [23, 56], // Tip of pin points to coordinates
        popupAnchor: [0, -56]
    });
};




const getCategoryIcon = (name: string) => {
    const n = name.trim();
    if (n.includes('زيت') || n.includes('Oil')) return <Fuel size={12} />;
    if (n.includes('ميكانيكا') || n.includes('Mech')) return <Wrench size={12} />;
    if (n.includes('كهرباء') || n.includes('Elec')) return <Zap size={12} />;
    if (n.includes('إطارات') || n.includes('كفرات') || n.includes('Tire')) return <CircleDashed size={12} />;
    if (n.includes('فحص') || n.includes('Check')) return <ShieldCheck size={12} />;
    if (n.includes('صيانة') || n.includes('Service')) return <Car size={12} />;
    return <Layers size={12} />;
};

const EmptyState: React.FC<{ message: string; subMessage?: string }> = ({ message, subMessage }) => (
    <div className="empty-state-container animate-fade-in">
        <AlertCircle className="empty-state-icon" />
        <div className="empty-state-title">{message}</div>
        {subMessage && <div className="empty-state-desc">{subMessage}</div>}
    </div>
);

// ============================================================
// #11 - Track open popup to zoom in/out on open/close
// ============================================================
const MapController: React.FC<{
    center: [number, number];
    zoom: number;
    onPopupOpen: () => void;
    onPopupClose: () => void;
}> = ({ center, zoom, onPopupOpen, onPopupClose }) => {
    const map = useMap();
    useEffect(() => {
        if (map) map.flyTo(center, zoom, { duration: 0.8 });
    }, [center, zoom, map]);

    useMapEvents({
        popupopen: onPopupOpen,
        popupclose: onPopupClose,
    });
    return null;
};

// ============================================================
// #2 - Auto detect if branch is open based on current time
// ============================================================
const isCurrentlyOpen = (branch: Branch): boolean => {
    if (branch.status === 'مغلق' || branch.status === 'تحت الصيانة') return false;
    try {
        const now = new Date();
        const [startH, startM] = branch.workingHours.start.split(':').map(Number);
        const [endH, endM] = branch.workingHours.end.split(':').map(Number);
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;
        const nowMins = now.getHours() * 60 + now.getMinutes();
        if (endMins < startMins) {
            // Crosses midnight
            return nowMins >= startMins || nowMins < endMins;
        }
        return nowMins >= startMins && nowMins < endMins;
    } catch {
        return branch.status === 'مفتوح';
    }
};

// Utility to format 24‑hour time strings to 12‑hour with Arabic/English suffixes
const formatTime = (time: string, lang: Language): string => {
    const [hStr, mStr] = time.split(":");
    let hour = parseInt(hStr, 10);
    const minute = mStr;
    const isPM = hour >= 12;
    if (hour === 0) hour = 12; // midnight => 12 AM
    else if (hour > 12) hour = hour - 12;
    if (lang === "ar") {
        return `${hour}:${minute} ${isPM ? "م" : "ص"}`;
    }
    return `${hour}:${minute} ${isPM ? "PM" : "AM"}`;
};

const getTimeRemaining = (branch: Branch, lang: Language): string => {
    if (branch.status === 'تحت الصيانة') return '';
    try {
        const now = new Date();
        const [startH, startM] = branch.workingHours.start.split(':').map(Number);
        const [endH, endM] = branch.workingHours.end.split(':').map(Number);
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const open = isCurrentlyOpen(branch);

        if (open) {
            const remaining = endMins > nowMins ? endMins - nowMins : (endMins + 1440) - nowMins;
            const h = Math.floor(remaining / 60);
            const m = remaining % 60;
            if (lang === 'ar') return h > 0 ? `يغلق بعد ${h}س ${m}د` : `يغلق بعد ${m} دقيقة`;
            return h > 0 ? `Closes in ${h}h ${m}m` : `Closes in ${m}m`;
        } else {
            const minsUntilOpen = startMins > nowMins ? startMins - nowMins : (startMins + 1440) - nowMins;
            const h = Math.floor(minsUntilOpen / 60);
            const m = minsUntilOpen % 60;
            if (lang === 'ar') return h > 0 ? `يفتح بعد ${h}س ${m}د` : `يفتح بعد ${m} دقيقة`;
            return h > 0 ? `Opens in ${h}h ${m}m` : `Opens in ${m}m`;
        }
    } catch {
        return '';
    }
};

// ============================================================
// #4 - Branch Detail Modal (full-screen card)
// ============================================================
const BranchDetailModal: React.FC<{
    branch: Branch;
    lang: Language;
    congestionLevel: { text: string; class: string; color: string };
    onClose: () => void;
    onNavigate: () => void;
    onImageClick: (url: string) => void;
}> = ({ branch, lang, congestionLevel, onClose, onNavigate, onImageClick }) => {
    const open = isCurrentlyOpen(branch);
    const timeRem = getTimeRemaining(branch, lang);

    return (
        <div className="branch-modal-overlay animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="branch-modal-card animate-slide-up">
                <button onClick={onClose} className="branch-modal-close">
                    <X size={20} />
                </button>

                {branch.imageUrl && (
                    <div 
                        onClick={() => onImageClick(branch.imageUrl!)}
                        style={{ height: '200px', overflow: 'hidden', borderRadius: '16px 16px 0 0', cursor: 'zoom-in' }}
                    >
                        <img src={branch.imageUrl} alt={branch.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                )}

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 800 }}>{branch.name}</h2>
                        <p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>{branch.address}</p>
                    </div>

                    {/* Status + Time Remaining */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{
                            padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '13px',
                            background: branch.status === 'تحت الصيانة'
                                ? 'rgba(249, 115, 22, 0.15)'
                                : open 
                                    ? 'rgba(16,185,129,0.15)' 
                                    : 'rgba(239,68,68,0.15)',
                            color: branch.status === 'تحت الصيانة'
                                ? '#f97316'
                                : open 
                                    ? 'var(--success)' 
                                    : 'var(--error)'
                        }}>
                            {branch.status === 'تحت الصيانة'
                                ? (lang === 'ar' ? '🟠 تحت الصيانة' : '🟠 Under Maint.')
                                : open 
                                    ? (lang === 'ar' ? '🟢 مفتوح الآن' : '🟢 Open Now') 
                                    : (lang === 'ar' ? '🔴 مغلق الآن' : '🔴 Closed Now')}
                        </span>
                        {timeRem && (
                            <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <Clock size={14} /> {timeRem}
                            </span>
                        )}
                    </div>

                    {/* Info Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '12px' }}>
                            <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{lang === 'ar' ? 'ساعات العمل' : 'Working Hours'}</p>
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{formatTime(branch.workingHours.start, lang)} – {formatTime(branch.workingHours.end, lang)}</p>
                        </div>
                        <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '12px' }}>
                            <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{lang === 'ar' ? 'الازدحام' : 'Congestion'}</p>
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart2 size={14} /> {congestionLevel.text}</p>
                        </div>
                        {branch.phone && (
                            <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '12px' }}>
                                <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{lang === 'ar' ? 'الهاتف' : 'Phone'}</p>
                                <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, direction: 'ltr', textAlign: lang === 'ar' ? 'right' : 'left' }}>{branch.phone}</p>
                            </div>
                        )}
                        {branch.managerName && (
                            <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '12px' }}>
                                <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{lang === 'ar' ? 'المسؤول' : 'Manager'}</p>
                                <p style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{branch.managerName}</p>
                            </div>
                        )}
                    </div>

                    {/* Categories */}
                    {branch.categories && branch.categories.length > 0 && (
                        <div>
                            <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>{lang === 'ar' ? 'الخدمات' : 'Services'}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {branch.categories.map((cat, i) => (
                                    <span key={i} style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {getCategoryIcon(cat)} {cat}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '4px' }}>
                        <button onClick={onNavigate} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '12px 8px', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Navigation size={16} /> {lang === 'ar' ? 'الاتجاه' : 'Directions'}
                        </button>
                        <a href={`https://wa.me/966${branch.phone?.startsWith('0') ? branch.phone.substring(1) : branch.phone}`} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: 'white', textDecoration: 'none', padding: '12px 8px', borderRadius: '12px', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <MessageCircle size={16} /> {lang === 'ar' ? 'واتساب' : 'WhatsApp'}
                        </a>
                        {/* #1 - Call Button */}
                        <a href={`tel:${branch.phone}`} style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', textDecoration: 'none', padding: '12px 8px', borderRadius: '12px', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid var(--success)' }}>
                            <Phone size={16} /> {lang === 'ar' ? 'اتصال' : 'Call'}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const normalizeArabic = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u0652]/g, '') // remove diacritics
        .replace(/(^|\s)ال/g, '$1') // remove 'ال' definition prefix
        .replace(/\s+/g, ' ') // normalize spaces
        .trim();
};

const normalizeArabicSimple = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const ClientMap: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [customLocInput, setCustomLocInput] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // #3 - Use CustomEvent instead of setInterval for language
    const [lang, setLang] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'ar');
    const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([24.7136, 46.6753]);
    const [mapZoom, setMapZoom] = useState<number>(5);
    const [prevZoom] = useState<number>(5);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [congestionData, setCongestionData] = useState<Record<string, number>>({});
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    // #6 - Sort state
    const [sortBy, setSortBy] = useState<'default' | 'open' | 'nearest' | 'name'>('default');
    // #4 - Branch detail modal
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [showSortMenu, setShowSortMenu] = useState(false);
    // #11 - Track popup open state for zoom behavior
    const [popupOpen, setPopupOpen] = useState(false);
    const [isLocatingLoc, setIsLocatingLoc] = useState(false);
    const prevMapZoomRef = useRef<number>(5);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    const t = translations[lang];

    // #3 - CustomEvent-based language switching (replaces setInterval)
    useEffect(() => {
        const handleLangChange = () => {
            const newLang = (localStorage.getItem('lang') as Language) || 'ar';
            setLang(newLang);
        };
        window.addEventListener('langChange', handleLangChange);
        return () => window.removeEventListener('langChange', handleLangChange);
    }, []);

    const [searchParams] = useSearchParams();

    // Subscribe to data
    useEffect(() => {
        const unsubBranches = subscribeToBranches((data) => {
            setBranches(data);
            setIsLoading(false);
        });
        const unsubCategories = subscribeToCategories(setCategories);
        return () => { unsubBranches(); unsubCategories(); };
    }, []);

    // Handle deep linking from shared links (?branch=id) -> Redirect directly to Google Maps
    useEffect(() => {
        const branchId = searchParams.get('branch');
        if (branchId && branches.length > 0) {
            const target = branches.find(b => b.id === branchId);
            if (target) {
                const mapsUrl = target.mapUrl || `https://www.google.com/maps/search/?api=1&query=${target.latitude},${target.longitude}`;
                window.location.replace(mapsUrl);
            }
        }
    }, [searchParams, branches]);

    // Automatically zoom/center on search results when the query changes to make it responsive
    useEffect(() => {
        const query = searchQuery.trim();
        if (!query || sortedBranches.length === 0) return;
        
        // Prioritize matching the location/address first (city/neighborhood), then fall back to matching branch name
        const bestMatch = sortedBranches.find(b => 
            normalizeArabic(b.address).includes(normalizeArabic(query)) ||
            normalizeArabicSimple(b.address).includes(normalizeArabicSimple(query))
        ) || sortedBranches.find(b => 
            normalizeArabic(b.name).includes(normalizeArabic(query)) ||
            normalizeArabicSimple(b.name).includes(normalizeArabicSimple(query))
        ) || sortedBranches[0];

        setMapCenter([bestMatch.latitude, bestMatch.longitude]);
        setMapZoom(13);
    }, [searchQuery]);

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

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };





    const handleParseCustomLoc = async () => {
        const input = customLocInput.trim();
        if (!input) return;

        const performGeocode = async (queryStr: string, toastId?: string) => {
            const currentToastId = toastId || toast.loading(lang === 'ar' ? 'جاري البحث عن الموقع...' : 'Searching for location...');
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`);
                const data = await response.json();
                if (data && data.length > 0) {
                    const first = data[0];
                    const loc: [number, number] = [parseFloat(first.lat), parseFloat(first.lon)];
                    setUserLoc(loc);
                    setMapCenter(loc);
                    setMapZoom(13);
                    setSortBy('nearest');
                    toast.success(lang === 'ar' ? `تم تحديد الموقع: ${first.display_name.split(',')[0]} ✅` : `Location set: ${first.display_name.split(',')[0]} ✅`, { id: currentToastId });
                } else {
                    toast.error(lang === 'ar' ? 'لم نتمكن من العثور على هذا الموقع.' : 'Could not find this location.', { id: currentToastId });
                }
            } catch {
                toast.error(lang === 'ar' ? 'خطأ في الاتصال بخدمة البحث.' : 'Error connecting to search service.', { id: currentToastId });
            }
        };

        // If it's a shortened google maps link, resolve it first
        if (input.includes("goo.gl") || input.includes("maps.app.goo.gl")) {
            const toastId = toast.loading(lang === 'ar' ? 'جاري تحليل رابط موقع العميل...' : 'Analyzing client location link...');
            
            const tryBackendResolve = async () => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                try {
                    const res = await fetch(`/api/resolve-short-url?url=${encodeURIComponent(input)}`, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!res.ok) throw new Error();
                    const data = await res.json();
                    if (data.latitude && data.longitude) {
                        const loc: [number, number] = [data.latitude, data.longitude];
                        setUserLoc(loc);
                        setMapCenter(loc);
                        setMapZoom(13);
                        setSortBy('nearest');
                        toast.success(lang === 'ar' ? 'تم تحديد موقع العميل بنجاح عبر السيرفر! ✅' : 'Location resolved successfully via server! ✅', { id: toastId });
                        return true;
                    }
                    return false;
                } catch {
                    clearTimeout(timeoutId);
                    return false;
                }
            };

            const fetchHTML = async () => {
                const fetchWithTimeout = async (url: string, timeout = 4000) => {
                    const controller = new AbortController();
                    const id = setTimeout(() => controller.abort(), timeout);
                    try {
                        const response = await fetch(url, { signal: controller.signal });
                        clearTimeout(id);
                        return response;
                    } catch (error) {
                        clearTimeout(id);
                        throw error;
                    }
                };

                try {
                    const res = await fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent(input)}`, 4000);
                    if (!res.ok) throw new Error();
                    return await res.text();
                } catch {
                    const res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(input)}`, 4000);
                    if (!res.ok) throw new Error("Redirect lookup failed");
                    return await res.text();
                }
            };

            const resolveLink = async () => {
                const resolvedViaBackend = await tryBackendResolve();
                if (resolvedViaBackend) return;

                try {
                    const html = await fetchHTML();
                    
                    // A. Exact pin coordinates match
                    const pinMatch = html.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
                    if (pinMatch) {
                        const resolvedLat = parseFloat(pinMatch[1]);
                        const resolvedLng = parseFloat(pinMatch[2]);
                        const loc: [number, number] = [resolvedLat, resolvedLng];
                        setUserLoc(loc);
                        setMapCenter(loc);
                        setMapZoom(13);
                        setSortBy('nearest');
                        toast.success(lang === 'ar' ? 'تم تحديد موقع العميل بنجاح من الدبوس! ✅' : 'Location resolved from exact pin! ✅', { id: toastId });
                        return;
                    }

                    // B. Fallback coordinate matches
                    const coordMatch = html.match(/ll=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) ||
                                       html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                                       html.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);

                    if (coordMatch) {
                        const resolvedLat = parseFloat(coordMatch[1]);
                        const resolvedLng = parseFloat(coordMatch[2]);
                        const loc: [number, number] = [resolvedLat, resolvedLng];
                        setUserLoc(loc);
                        setMapCenter(loc);
                        setMapZoom(13);
                        setSortBy('nearest');
                        toast.success(lang === 'ar' ? 'تم تحديد موقع العميل بنجاح! ✅' : 'Location resolved successfully! ✅', { id: toastId });
                        return;
                    }

                    // C. Fallback og:url match
                    const ogUrlMatch = html.match(/property="og:url"\s+content="([^"]+)"/i) || 
                                     html.match(/content="([^"]+)"\s+property="og:url"/i);
                    
                    if (ogUrlMatch && ogUrlMatch[1]) {
                        const resolvedUrl = ogUrlMatch[1];
                        const resolvedMatch = resolvedUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
                                              resolvedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                                              resolvedUrl.match(/[?&/](?:q|query|loc|place|dir|ll|cbll|addr)=?(-?\d+\.\d+)[,\s/|;]+(-?\d+\.\d+)/);
                        if (resolvedMatch) {
                            const resolvedLat = parseFloat(resolvedMatch[1]);
                            const resolvedLng = parseFloat(resolvedMatch[2]);
                            const loc: [number, number] = [resolvedLat, resolvedLng];
                            setUserLoc(loc);
                            setMapCenter(loc);
                            setMapZoom(13);
                            setSortBy('nearest');
                            toast.success(lang === 'ar' ? 'تم تحديد موقع العميل بنجاح! ✅' : 'Location resolved successfully! ✅', { id: toastId });
                            return;
                        }
                    }

                    toast.dismiss(toastId);
                    toast.error(lang === 'ar' ? 'لم نتمكن من استخراج الإحداثيات تلقائياً. جاري البحث عن اسم المكان...' : 'Could not extract coordinates automatically. Searching location name...');
                    await performGeocode(input, toastId);
                } catch {
                    toast.dismiss(toastId);
                    await performGeocode(input, toastId);
                }
            };

            resolveLink();
            return;
        }

        // Try extracting coordinates directly from text
        let lat: number | null = null;
        let lng: number | null = null;

        // Pattern A: @lat,lng
        const matchAt = input.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (matchAt) {
            lat = parseFloat(matchAt[1]);
            lng = parseFloat(matchAt[2]);
        } else {
            const matchQuery = input.match(/[?&/](?:q|query|loc|place|dir|ll|cbll|addr)=?(-?\d+\.\d+)[,\s/|;]+(-?\d+\.\d+)/);
            if (matchQuery) {
                lat = parseFloat(matchQuery[1]);
                lng = parseFloat(matchQuery[2]);
            } else {
                const matchPlain = input.match(/^[\s]*(-?\d+\.\d+)[,\s/|;]+(-?\d+\.\d+)[\s]*$/);
                if (matchPlain) {
                    lat = parseFloat(matchPlain[1]);
                    lng = parseFloat(matchPlain[2]);
                }
            }
        }

        if (lat !== null && lng !== null) {
            const loc: [number, number] = [lat, lng];
            setUserLoc(loc);
            setMapCenter(loc);
            setMapZoom(13);
            setSortBy('nearest');
            toast.success(lang === 'ar' ? 'تم تحديد موقع العميل المخصص وفرز الفروع القريبة!' : 'Custom location set and nearby branches sorted!');
        } else {
            // Address search fallback
            await performGeocode(input);
        }
    };

    const handleClearCustomLoc = () => {
        setUserLoc(null);
        setCustomLocInput('');
        setSortBy('default');
        toast.success(lang === 'ar' ? 'تم إعادة تعيين الموقع.' : 'Location reset.');
    };

    // ─── Smart 3-phase geolocation ────────────────────────────────────────
    const locateAndCenter = (loc: [number, number]) => {
        setUserLoc(loc);
        const openBranches = branches.filter(b => isCurrentlyOpen(b));
        const allBranches = branches;
        const pool = openBranches.length > 0 ? openBranches : allBranches;
        if (pool.length > 0) {
            const sorted = pool
                .map(b => ({ ...b, dist: calculateDistance(loc[0], loc[1], b.latitude, b.longitude) }))
                .sort((a, b) => a.dist - b.dist);
            const nearest = sorted[0];
            const distKm = sorted[0].dist.toFixed(1);
            const label = openBranches.length > 0
                ? (lang === 'ar' ? `أقرب فرع مفتوح: ${nearest.name} (${distKm} كم)` : `Nearest open: ${nearest.name} (${distKm} km)`)
                : (lang === 'ar' ? `أقرب فرع: ${nearest.name} (${distKm} كم)` : `Nearest: ${nearest.name} (${distKm} km)`);
            toast.success(label, { id: 'locate-toast', duration: 4000 });
            prevMapZoomRef.current = mapZoom;
            setMapCenter([nearest.latitude, nearest.longitude]);
            setMapZoom(14);
        } else {
            toast.success(lang === 'ar' ? 'تم تحديد موقعك' : 'Location found', { id: 'locate-toast' });
            setMapCenter(loc);
            setMapZoom(12);
        }
        setIsLocatingLoc(false);
    };

    const tryIPFallback = async () => {
        try {
            const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(6000) });
            if (!res.ok) throw new Error('IP lookup failed');
            const data = await res.json();
            if (data.latitude && data.longitude) {
                const loc: [number, number] = [data.latitude, data.longitude];
                toast.loading(
                    lang === 'ar' ? '⚠️ موقع تقريبي عبر الشبكة' : '⚠️ Approximate location via network',
                    { id: 'locate-toast', duration: 3000 }
                );
                locateAndCenter(loc);
            } else {
                throw new Error('No coords');
            }
        } catch {
            setIsLocatingLoc(false);
            toast.error(
                lang === 'ar'
                    ? 'تعذّر تحديد الموقع. تأكد من منح الإذن في إعدادات المتصفح.'
                    : 'Location unavailable. Please allow location in browser settings.',
                { id: 'locate-toast', duration: 5000 }
            );
        }
    };

    const tryLowAccuracy = () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                locateAndCenter([pos.coords.latitude, pos.coords.longitude]);
            },
            () => {
                // Phase 3: IP fallback
                tryIPFallback();
            },
            { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 }
        );
    };

    const handleLocateMe = () => {
        setIsLocatingLoc(true);
        if (!navigator.geolocation) {
            tryIPFallback();
            return;
        }
        
        // Phase 1: High accuracy GPS
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                locateAndCenter([pos.coords.latitude, pos.coords.longitude]);
            },
            (err) => {
                // PERMISSION_DENIED → no point retrying
                if (err.code === 1) {
                    setIsLocatingLoc(false);
                    toast.error(
                        lang === 'ar'
                            ? 'يرجى السماح بالوصول للموقع من إعدادات المتصفح'
                            : 'Please allow location access in browser settings',
                        { id: 'locate-toast', duration: 5000 }
                    );
                    return;
                }
                // Phase 2: retry with low accuracy
                tryLowAccuracy();
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
        );
    };



    const handleNavigate = useCallback(async (branch: Branch) => {
        let etaMinutes = 15;
        if (userLoc) {
            const distance = calculateDistance(userLoc[0], userLoc[1], branch.latitude, branch.longitude);
            etaMinutes = Math.max(5, Math.ceil(distance / 0.66));
        } else {
            // Silently request geolocation for future uses
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
                    () => {},
                    { enableHighAccuracy: false, timeout: 5000 }
                );
            }
        }
        
        toast.loading(lang === 'ar' ? 'جاري تجهيز المسار...' : 'Planning route...', { id: 'nav-toast' });
        try {
            await addNavigationIntent(branch.id, etaMinutes);
            const etaMsg = lang === 'ar' ? `الوقت المقدر: ${etaMinutes} دقيقة` : `ETA: ${etaMinutes} mins`;
            toast.success(etaMsg, { id: 'nav-toast' });
            setCongestionData(prev => ({ ...prev, [branch.id]: (prev[branch.id] || 0) + 1 }));
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`, '_blank');
        } catch {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`, '_blank');
        }
    }, [userLoc, lang]);

    const handleShare = async (branch: Branch) => {
        const mapsUrl = branch.mapUrl || `https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`;
        
        // Build rich text description with bold styling for WhatsApp
        const lines = [
            `🛠️ *${branch.name}*`,
            `📍 *${lang === 'ar' ? 'العنوان' : 'Address'}:* ${branch.address}`,
            branch.phone ? `📞 *${lang === 'ar' ? 'الجوال' : 'Phone'}:* ${branch.phone}` : '',
            branch.managerName ? `👤 *${lang === 'ar' ? 'المسؤول' : 'Manager'}:* ${branch.managerName}` : '',
            branch.workingHours ? `⏰ *${lang === 'ar' ? 'الدوام' : 'Hours'}:* ${branch.workingHours.start} – ${branch.workingHours.end}` : '',
            branch.categories && branch.categories.length > 0 ? `⚙️ *${lang === 'ar' ? 'الخدمات' : 'Services'}:* ${branch.categories.join(' - ')}` : '',
            `\n${lang === 'ar' ? 'سلمان زمام الخالدي لخدمة السيارات' : 'Salman Al-Khalidi Auto Service'}`
        ].filter(Boolean);

        const shareData = {
            title: branch.name,
            text: lines.join('\n'),
            url: mapsUrl
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch { /* ignore */ }
        } else {
            navigator.clipboard.writeText(`${shareData.text}\n🔗 موقع قوقل ماب: ${shareData.url}`);
            toast.success(lang === 'ar' ? 'تم نسخ رابط قوقل ماب وتفاصيل الفرع بنجاح!' : 'Google Maps link and details copied successfully!');
        }
    };

    // #5 - Enhanced search including categories (tolerant to Arabic spelling variations like ة/ه, أ/ا, etc.)
    const filteredBranches = branches.filter(branch => {
        const queryText = searchQuery.trim();
        if (!queryText) {
            const matchesCategory = categoryFilter === 'all' || branch.categories?.includes(categoryFilter);
            return matchesCategory;
        }

        // Split query into individual words/terms to support multi-word search (e.g. "الدمام العمامرة")
        const terms = queryText.split(/\s+/).filter(Boolean);
        
        // For a branch to match, every search term must match at least one field in the branch
        const matchesSearch = terms.every(term => {
            const q = normalizeArabic(term);
            const qSimple = normalizeArabicSimple(term);

            return (
                normalizeArabic(branch.name).includes(q) ||
                normalizeArabic(branch.address).includes(q) ||
                branch.categories?.some(c => normalizeArabic(c).includes(q)) ||
                (branch.managerName && normalizeArabic(branch.managerName).includes(q)) ||
                // Fallback simple matches (without Al- prefix removal)
                normalizeArabicSimple(branch.name).includes(qSimple) ||
                normalizeArabicSimple(branch.address).includes(qSimple) ||
                branch.categories?.some(c => normalizeArabicSimple(c).includes(qSimple)) ||
                (branch.managerName && normalizeArabicSimple(branch.managerName).includes(qSimple))
            );
        });

        const matchesCategory = categoryFilter === 'all' || branch.categories?.includes(categoryFilter);
        return matchesSearch && matchesCategory;
    });

    // #6 - Sort filtered branches
    const sortedBranches = [...filteredBranches].sort((a, b) => {
        if (sortBy === 'open') {
            const aOpen = isCurrentlyOpen(a) ? 0 : 1;
            const bOpen = isCurrentlyOpen(b) ? 0 : 1;
            return aOpen - bOpen;
        }
        if (sortBy === 'nearest' && userLoc) {
            return calculateDistance(userLoc[0], userLoc[1], a.latitude, a.longitude) -
                calculateDistance(userLoc[0], userLoc[1], b.latitude, b.longitude);
        }
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name, 'ar');
        }
        return 0;
    });

    const getCongestionLevel = (branchId: string) => {
        const count = congestionData[branchId] || 0;
        if (count < 2) return { text: lang === 'ar' ? 'هادئ' : 'Quiet', class: 'congestion-quiet', color: 'var(--success)' };
        if (count < 5) return { text: lang === 'ar' ? 'متوسط' : 'Busy', class: 'congestion-busy', color: '#fbbf24' };
        return { text: lang === 'ar' ? 'مزدحم' : 'Crowded', class: 'congestion-crowded', color: 'var(--error)' };
    };

    // #11 - Popup open/close zoom handling
    const handlePopupOpen = useCallback(() => {
        prevMapZoomRef.current = mapZoom;
        setPopupOpen(true);
    }, [mapZoom]);

    const handlePopupClose = useCallback(() => {
        if (popupOpen) {
            setMapZoom(prevZoom);
            setPopupOpen(false);
        }
    }, [popupOpen, prevZoom]);

    // #9 - Dark mode tile URL
    const [isDark, setIsDark] = useState(() =>
        document.documentElement.classList.contains('dark') ||
        (!document.documentElement.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(
                document.documentElement.classList.contains('dark') ||
                (!document.documentElement.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches)
            );
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const tileUrl = isDark
        ? 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar&style=feature:all|element:labels.text.fill|color:0xffffff&style=feature:all|element:geometry|color:0x1e2130'
        : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar';

    if (isLoading) {
        return (
            <div style={{ padding: '0 15px', marginTop: '20px' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="glass" style={{ marginBottom: '15px', padding: '15px', borderRadius: '15px' }}>
                        <div className="skeleton skeleton-title" style={{ width: '40%' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <div className="skeleton-circle skeleton"></div>
                            <div className="skeleton-circle skeleton"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const sortLabels: Record<string, string> = {
        default: lang === 'ar' ? 'الافتراضي' : 'Default',
        open: lang === 'ar' ? 'المفتوح أولاً' : 'Open First',
        nearest: lang === 'ar' ? 'الأقرب' : 'Nearest',
        name: lang === 'ar' ? 'الاسم' : 'Name',
    };

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="branch-directory-header" style={{ padding: '8px 12px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '600px' }}>
                    <div className="search-pill-container" style={{ flex: 1, position: 'relative', margin: 0 }}>
                        <Search style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                        <input
                            className="search-pill"
                            type="text"
                            placeholder={lang === 'ar' ? 'ابحث بالاسم، المدينة...' : 'Search by name, city...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ padding: '8px 36px 8px 12px', fontSize: '14px', height: '38px' }}
                        />
                    </div>
                    {/* Sort Button */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowSortMenu(!showSortMenu)}
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 12px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '38px', whiteSpace: 'nowrap' }}
                        >
                            <SortAsc size={16} /> <span className="mobile-hide">{sortLabels[sortBy]}</span> <ChevronDown size={12} />
                        </button>
                        {showSortMenu && (
                            <div style={{ position: 'absolute', top: '110%', left: 0, background: 'var(--navy-surface)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '6px', zIndex: 9999, minWidth: '140px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                                {(['default', 'open', 'nearest', 'name'] as const).map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                                        style={{ display: 'block', width: '100%', padding: '8px 12px', background: sortBy === opt ? 'var(--accent-orange)' : 'transparent', color: 'white', border: 'none', borderRadius: '8px', textAlign: lang === 'ar' ? 'right' : 'left', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                    >
                                        {sortLabels[opt]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="pills-row" style={{ display: 'flex', gap: '6px', overflowX: 'auto', width: '100%', maxWidth: '600px', margin: 0, paddingBottom: '2px' }}>
                    <button className={`pill-btn ${categoryFilter === 'all' ? 'active' : ''}`} onClick={() => setCategoryFilter('all')} style={{ padding: '6px 12px', fontSize: '12px' }}>
                        {lang === 'ar' ? 'الكل' : 'All'}
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`pill-btn ${categoryFilter === cat.name ? 'active' : ''}`}
                            onClick={() => setCategoryFilter(cat.name)}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Set Custom Location (ضع الموقع) */}
                <div style={{ display: 'flex', gap: '6px', width: '100%', maxWidth: '600px', margin: 0 }}>
                    <input
                        type="text"
                        placeholder={lang === 'ar' ? 'ضع رابط موقع العميل أو الإحداثيات هنا...' : 'Paste client location link or coordinates...'}
                        value={customLocInput}
                        onChange={(e) => setCustomLocInput(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'rgba(255,255,255,0.08)',
                            color: 'white',
                            fontSize: '12px',
                            outline: 'none',
                            height: '36px'
                        }}
                    />
                    <button
                        onClick={handleParseCustomLoc}
                        style={{
                            background: 'var(--accent-orange)',
                            color: 'white',
                            border: 'none',
                            padding: '0 12px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            height: '36px'
                        }}
                    >
                        {lang === 'ar' ? 'تحديد' : 'Locate'}
                    </button>
                    {userLoc && (
                        <button
                            onClick={handleClearCustomLoc}
                            style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                padding: '0 10px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '11px',
                                cursor: 'pointer',
                                height: '36px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {lang === 'ar' ? 'إعادة تعيين' : 'Reset'}
                        </button>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {viewMode === 'map' ? (
                    <MapContainer center={mapCenter} zoom={mapZoom} maxZoom={20} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
                        {/* #9 - MapController also handles popup zoom events */}
                        <MapController
                            center={mapCenter}
                            zoom={mapZoom}
                            onPopupOpen={handlePopupOpen}
                            onPopupClose={handlePopupClose}
                        />
                        {/* #9 - Dark-mode aware tile layer */}
                        <TileLayer
                            attribution='&copy; Google Maps'
                            url={tileUrl}
                            maxZoom={20}
                        />
                        {/* #10 - Custom user location marker */}
                        {userLoc && (
                            <Marker position={userLoc} icon={createUserIcon()}>
                                <Popup>{lang === 'ar' ? '📍 موقعك الحالي' : '📍 Your Location'}</Popup>
                            </Marker>
                        )}
                        {(() => {
                            const usedCoords = new Set<string>();
                            return sortedBranches.map(b => {
                                const open = isCurrentlyOpen(b);
                                let lat = b.latitude;
                                let lng = b.longitude;
                                const coordKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
                                
                                if (usedCoords.has(coordKey)) {
                                    const count = Array.from(usedCoords).filter(k => k === coordKey).length + 1;
                                    lat += (Math.sin(count * 2.5) * 0.00018);
                                    lng += (Math.cos(count * 2.5) * 0.00018);
                                }
                                usedCoords.add(coordKey);

                                return (
                                    <Marker
                                        key={b.id}
                                        position={[lat, lng]}
                                        icon={createBranchIcon(b, open)}
                                        zIndexOffset={b.imageUrl ? 1000 : 0}
                                        eventHandlers={{
                                            click: () => {
                                                prevMapZoomRef.current = mapZoom;
                                                setMapCenter([b.latitude, b.longitude]);
                                                setMapZoom(15);
                                            }
                                        }}
                                    >
                                    <Popup className="premium-popup">
                                        <div style={{ minWidth: '220px', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
                                            <h3 style={{ margin: '0 0 6px', color: 'var(--primary-color)', fontSize: '16px' }}>{b.name}</h3>
                                            {b.imageUrl && (
                                                <div 
                                                    onClick={() => setLightboxImage(b.imageUrl || null)}
                                                    style={{ height: '100px', width: '100%', marginBottom: '8px', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in' }}
                                                >
                                                    <img src={b.imageUrl} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            )}
                                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '8px' }}>
                                                Debug: Image URL? {b.imageUrl ? `Yes (${b.imageUrl.length} chars)` : 'No'}
                                            </div>

                                            {/* #2 Smart open/close indicator */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                                                <span style={{
                                                    fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px',
                                                    background: b.status === 'تحت الصيانة'
                                                        ? 'rgba(249, 115, 22, 0.15)'
                                                        : open 
                                                            ? 'rgba(16,185,129,0.15)' 
                                                            : 'rgba(239,68,68,0.15)',
                                                    color: b.status === 'تحت الصيانة'
                                                        ? '#f97316'
                                                        : open 
                                                            ? 'var(--success)' 
                                                            : 'var(--error)'
                                                }}>
                                                    {b.status === 'تحت الصيانة'
                                                        ? (lang === 'ar' ? '🟠 تحت الصيانة' : '🟠 Maint.')
                                                        : open ? (lang === 'ar' ? '🟢 مفتوح' : '🟢 Open') : (lang === 'ar' ? '🔴 مغلق' : '🔴 Closed')}
                                                </span>
                                                <span style={{ fontSize: '11px', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <Clock size={11} /> {formatTime(b.workingHours.start, lang)}–{formatTime(b.workingHours.end, lang)}
                                                </span>
                                            </div>

                                            <p style={{ fontSize: '12px', margin: '0 0 6px', opacity: 0.8 }}>{b.address}</p>

                                            {/* #7 - Phone display */}
                                            {b.phone && (
                                                <p style={{ fontSize: '12px', margin: '0 0 8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', direction: 'ltr', justifyContent: lang === 'ar' ? 'flex-end' : 'flex-start' }}>
                                                    <Phone size={11} /> {b.phone}
                                                </p>
                                            )}

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                                                {b.categories?.map((cat, i) => (
                                                    <span key={i} style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                                        {getCategoryIcon(cat)} {cat}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* 3 action buttons including #1 Call */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                                <button onClick={() => handleNavigate(b)} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '8px 4px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                                    <Navigation size={11} /> {t.directions}
                                                </button>
                                                <a href={`https://wa.me/966${b.phone?.startsWith('0') ? b.phone.substring(1) : b.phone}`} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: 'white', textDecoration: 'none', padding: '8px 4px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                                    <MessageCircle size={11} /> {t.whatsapp}
                                                </a>
                                                {/* #1 - Call button */}
                                                <a href={`tel:${b.phone}`} style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', textDecoration: 'none', padding: '8px 4px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', border: '1px solid var(--success)' }}>
                                                    <Phone size={11} /> {lang === 'ar' ? 'اتصال' : 'Call'}
                                                </a>
                                            </div>

                                            {/* Details button that opens modal & Share button */}
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                                <button
                                                    onClick={() => setSelectedBranch(b)}
                                                    style={{ flex: 1.5, background: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)', border: '1px solid var(--primary-color)', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                                >
                                                    📋 {lang === 'ar' ? 'تفاصيل أكثر' : 'More Details'}
                                                </button>
                                                <button
                                                    onClick={() => handleShare(b)}
                                                    style={{ flex: 1, background: 'rgba(245,158,11,0.1)', color: 'var(--accent-orange)', border: '1px solid var(--accent-orange)', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                                >
                                                    <Share2 size={12} /> {lang === 'ar' ? 'مشاركة' : 'Share'}
                                                </button>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        });
                        })()}
                    </MapContainer>
                ) : (
                    // ============================================================
                    // LIST VIEW
                    // ============================================================
                    <div style={{ padding: '1rem', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {sortedBranches.length === 0 ? (
                            <EmptyState
                                message={lang === 'ar' ? 'لا توجد فروع مطابقة' : 'No matching branches'}
                                subMessage={lang === 'ar' ? 'جرب البحث بكلمات مختلفة أو تغيير التصفية' : 'Try different search terms or change filters'}
                            />
                        ) : sortedBranches.map(b => {
                            const open = isCurrentlyOpen(b);
                            const timeRem = getTimeRemaining(b, lang);
                            return (
                                <div key={b.id} className="glass branch-list-card" style={{ padding: '1.25rem', borderRadius: '15px', background: 'var(--navy-surface)', color: 'white', cursor: 'pointer' }}
                                    onClick={() => setSelectedBranch(b)}>
                                    {b.imageUrl && (
                                        <div style={{ height: '160px', width: '100%', marginBottom: '12px', borderRadius: '10px', overflow: 'hidden' }}>
                                            <img src={b.imageUrl} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start', gap: '8px' }}>
                                        <h3 style={{ margin: 0, flex: 1 }}>{b.name}</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '11px', whiteSpace: 'nowrap',
                                                background: b.status === 'تحت الصيانة'
                                                    ? 'rgba(249, 115, 22, 0.2)'
                                                    : open 
                                                        ? 'rgba(16,185,129,0.2)' 
                                                        : 'rgba(239,68,68,0.2)',
                                                color: b.status === 'تحت الصيانة'
                                                    ? '#f97316'
                                                    : open 
                                                        ? '#10b981' 
                                                        : '#ef4444'
                                            }}>
                                                {b.status === 'تحت الصيانة'
                                                    ? (lang === 'ar' ? '🟠 تحت الصيانة' : '🟠 Maint.')
                                                    : open ? (lang === 'ar' ? '🟢 مفتوح' : '🟢 Open') : (lang === 'ar' ? '🔴 مغلق' : '🔴 Closed')}
                                            </span>
                                            <div className={`congestion-badge ${getCongestionLevel(b.id).class}`}>
                                                <BarChart2 size={11} /> {getCongestionLevel(b.id).text}
                                            </div>
                                        </div>
                                    </div>

                                    <p style={{ opacity: 0.7, fontSize: '14px', marginBottom: '4px' }}>{b.address}</p>

                                    {/* #2 + #7 - Time remaining + phone */}
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                        {timeRem && (
                                            <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.6)' }}>
                                                <Clock size={12} /> {timeRem}
                                            </span>
                                        )}
                                        {/* #7 - Phone number */}
                                        {b.phone && (
                                            <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', direction: 'ltr', color: 'rgba(255,255,255,0.6)' }}>
                                                <Phone size={12} /> {b.phone}
                                            </span>
                                        )}
                                    </div>

                                    {b.managerName && (
                                        <p style={{ fontSize: '13px', marginBottom: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                                            👤 {t.manager_name}: {b.managerName}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                                        {b.categories?.map((cat, i) => (
                                            <span key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {getCategoryIcon(cat)} {cat}
                                            </span>
                                        ))}
                                    </div>

                                    {/* #12 - Improved mobile layout: 3 columns on larger, 1 column on tiny */}
                                    <div className="branch-action-grid">
                                        <button onClick={(e) => { e.stopPropagation(); setMapCenter([b.latitude, b.longitude]); setMapZoom(16); setViewMode('map'); }} style={{ background: 'var(--accent-orange)', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <MapPin size={16} /> {t.map_view}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleNavigate(b); }} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <Navigation size={16} /> {t.directions}
                                        </button>
                                        {/* #1 - Call button in list */}
                                        <a href={`tel:${b.phone}`} onClick={(e) => e.stopPropagation()} style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)', padding: '12px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none' }}>
                                            <Phone size={16} /> {lang === 'ar' ? 'اتصال' : 'Call'}
                                        </a>
                                        <a href={`https://wa.me/966${b.phone?.startsWith('0') ? b.phone.substring(1) : b.phone}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ background: '#25D366', color: 'white', padding: '12px', borderRadius: '10px', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none' }}>
                                            <MessageCircle size={16} /> {t.whatsapp}
                                        </a>
                                        <button onClick={(e) => { e.stopPropagation(); handleShare(b); }} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <Share2 size={16} /> {lang === 'ar' ? 'مشاركة' : 'Share'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Float Locate Me button */}
                <button onClick={handleLocateMe} className="locate-me-btn hover-scale tap-effect" style={{ position: 'fixed', zIndex: 2000, background: 'var(--accent-orange)', color: 'white', border: 'none', borderRadius: '35px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', left: '50%', transform: 'translateX(-50%)', bottom: 'env(safe-area-inset-bottom, 30px)', padding: '14px 32px', fontSize: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <Navigation size={20} /> {t.locate_me}
                </button>
            </div>

            {/* #4 - Branch Detail Modal */}
            {selectedBranch && (
                <BranchDetailModal
                    branch={selectedBranch}
                    lang={lang}
                    congestionLevel={getCongestionLevel(selectedBranch.id)}
                    onClose={() => setSelectedBranch(null)}
                    onNavigate={() => { handleNavigate(selectedBranch); setSelectedBranch(null); }}
                    onImageClick={(url) => setLightboxImage(url)}
                />
            )}

            {/* Image Lightbox Preview Overlay */}
            {lightboxImage && (
                <div 
                    onClick={() => setLightboxImage(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0, 0, 0, 0.95)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'zoom-out',
                        animation: 'fadeIn 0.2s ease'
                    }}
                >
                    <button 
                        onClick={() => setLightboxImage(null)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '20px',
                            zIndex: 100000
                        }}
                    >
                        ✕
                    </button>
                    <img 
                        src={lightboxImage} 
                        alt="Preview" 
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            objectFit: 'contain',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                        }}
                    />
                </div>
            )}

            <LocationLoader isActive={isLocatingLoc} lang={lang} />
        </div>
    );
};

export default ClientMap;
