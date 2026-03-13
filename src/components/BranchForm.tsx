import React, { useState, useEffect } from 'react';
import type { Branch, Category } from '../types';
import { X, Save, MapPin, Search as SearchIcon, ExternalLink, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const customIcon = L.divIcon({
    className: 'custom-dot-marker',
    html: `<div style="width: 20px; height: 20px; background: var(--primary-color); border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const ChangeView = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    map.flyTo(center, map.getZoom());
    return null;
};

const LocationMarker = ({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) => {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });
    return <Marker position={position} icon={customIcon} />;
};

interface BranchFormProps {
    branch?: Branch;
    onSave: (branch: Omit<Branch, 'id'> | Branch) => void;
    onClose: () => void;
    categories: Category[];
}

const BranchForm: React.FC<BranchFormProps> = ({ branch, onSave, onClose, categories }) => {
    const [formData, setFormData] = useState<Omit<Branch, 'id'>>({
        name: '',
        latitude: 24.7136,
        longitude: 46.6753,
        category: 'صيانة عامة',
        status: 'مفتوح',
        workingHours: { start: '08:00', end: '22:00' },
        address: '',
        phone: '',
        mapUrl: '',
    });
    const [mapInput, setMapInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showManual, setShowManual] = useState(false);

    useEffect(() => {
        if (branch) {
            setFormData(branch);
        }
    }, [branch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'start' || name === 'end') {
            setFormData({ ...formData, workingHours: { ...formData.workingHours, [name]: value } });
        } else {
            setFormData({ ...formData, [name]: name === 'latitude' || name === 'longitude' ? parseFloat(value) : value });
        }
    };

    const handleSearchAddress = async () => {
        if (!mapInput.trim()) return;
        setIsSearching(true);
        try {
            // Use OpenStreetMap Nominatim API (Free, no key required for low volume)
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapInput)}`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const first = data[0];
                setFormData(prev => ({ ...prev, latitude: parseFloat(first.lat), longitude: parseFloat(first.lon) }));
                toast.success(`تم العثور على الموقع: ${first.display_name.split(',')[0]} ✅`);
            } else {
                toast.error("لم نتمكن من العثور على هذا العنوان.");
            }
        } catch (error) {
            toast.error("خطأ في الاتصال بخدمة البحث.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleExtractFromLink = (silent: boolean = false) => {
        const input = mapInput.trim();
        if (!input) return;

        // 1. Check for shortened links (goo.gl, maps.app.goo.gl)
        if (input.includes("goo.gl") || input.includes("maps.app.goo.gl")) {
            setFormData(prev => ({ ...prev, mapUrl: input }));
            if (!silent) {
                toast.success("تم حفظ الرابط! يرجى النقر على 'تحديد' أو البحث باسم المكان لإيجاده على الخريطة.");
                handleSearchAddress();
            }
            return;
        }

        // 2. Extract coordinates from URL or text
        let lat: number | null = null;
        let lng: number | null = null;

        // Pattern A: @lat,lng (standard Google Maps URL)
        const matchAt = input.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (matchAt) {
            lat = parseFloat(matchAt[1]);
            lng = parseFloat(matchAt[2]);
        } 
        // Pattern B: search?q=lat,lng or query=lat,lng or dir/lat,lng
        else {
            const matchQuery = input.match(/[?&/](?:q|query|loc|place|dir|ll|cbll|addr)=?(-?\d+\.\d+)[,\s/|;]+(-?\d+\.\d+)/);
            if (matchQuery) {
                lat = parseFloat(matchQuery[1]);
                lng = parseFloat(matchQuery[2]);
            }
            // Pattern C: plain coordinates "lat, lng" (very flexible)
            else {
                const matchPlain = input.match(/^[\s]*(-?\d+\.\d+)[,\s/|;]+(-?\d+\.\d+)[\s]*$/);
                if (matchPlain) {
                    lat = parseFloat(matchPlain[1]);
                    lng = parseFloat(matchPlain[2]);
                }
            }
        }

        if (lat !== null && lng !== null) {
            setFormData(prev => ({ 
                ...prev, 
                latitude: lat as number, 
                longitude: lng as number,
                mapUrl: input.startsWith('http') ? input : prev.mapUrl 
            }));
            if (!silent) toast.success("تم تحديد الموقع تلقائياً! ✅");
            return;
        }

        // If nothing matches and NOT silent, trigger address search
        if (!silent) handleSearchAddress();
    };

    // Automatic trigger on paste or change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mapInput.trim().length > 10) { // Only check if enough content to be a link/coords
                handleExtractFromLink(true); // Run silently
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [mapInput]);

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("متصفحك لا يدعم خاصية تحديد الموقع.");
            return;
        }
        toast.loading("جاري جلب موقعك الحالي...", { id: 'geo' });
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({ ...prev, latitude: position.coords.latitude, longitude: position.coords.longitude }));
                toast.success("تم تحديد موقعك الحالي بنجاح! ✅", { id: 'geo' });
            },
            () => {
                toast.error("فشلنا في الحصول على موقعك. تأكد من تفعيل الـ GPS والسماح للمتصفح.", { id: 'geo' });
            },
            { enableHighAccuracy: true }
        );
    };

    const validateForm = (): boolean => {
        // Validation 1: Phone number (Saudi format starting with 05 and length 10 digits)
        const phoneRegex = /^05\d{8}$/;
        if (!phoneRegex.test(formData.phone)) {
            toast.error('رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام.');
            return false;
        }

        // Validation 2: Time Logic (end time > start time) strictly for same day assumption
        const start = new Date(`1970-01-01T${formData.workingHours.start}:00Z`);
        const end = new Date(`1970-01-01T${formData.workingHours.end}:00Z`);

        // Handle midnight cases or crossed days if necessary, but generally we prevent end <= start
        // unless they are 24-hours, but this is a simple check:
        if (end <= start && formData.workingHours.end !== '00:00') {
            toast.error('وقت الإنتهاء يجب أن يكون بعد وقت البدء.');
            return false;
        }

        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            if (branch) {
                onSave({ ...formData, id: branch.id } as Branch);
            } else {
                onSave(formData);
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء حفظ الفرع. جرب لاحقاً.');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div className="glass" style={{
                background: 'var(--surface-color)', padding: '2.5rem', borderRadius: 'var(--radius-xl)',
                width: '100%', maxWidth: '550px', maxHeight: '92vh', overflowY: 'auto',
                boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>{branch ? 'تعديل فرع' : 'إضافة فرع جديد'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>اسم الفرع</label>
                        <input required type="text" name="name" value={formData.name} onChange={handleChange}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
                    </div>

                    {/* Intelligent Location Selection */}
                    <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={20} color="var(--primary-color)" />
                                تحديد موقع الفرع (ذكي)
                            </label>
                            {formData.mapUrl && (
                                <a href={formData.mapUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600 }}>
                                    <ExternalLink size={12} /> معاينة الرابط المحفوظ
                                </a>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <div style={{ position: 'absolute', right: '12px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                                    <SearchIcon size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="ابحث بالاسم أو الصق الرابط/الإحداثيات مباشرة" 
                                    value={mapInput} 
                                    onChange={(e) => setMapInput(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '14px' }} 
                                />
                            </div>
                            <button 
                                type="button" 
                                onClick={() => handleExtractFromLink(false)} 
                                disabled={isSearching}
                                style={{ 
                                    padding: '0 1.2rem', background: 'var(--primary-color)', color: 'white', 
                                    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', 
                                    fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap',
                                    transition: 'all 0.2s', opacity: isSearching ? 0.7 : 1
                                }}
                            >
                                {isSearching ? 'جاري التحقق..' : 'تحديد'}
                            </button>
                            <button 
                                type="button" 
                                onClick={handleGetCurrentLocation}
                                title="استخدم موقعي الحالي"
                                style={{ 
                                    padding: '0 0.75rem', background: 'var(--bg-color)', color: 'var(--primary-color)', 
                                    border: '1px solid var(--primary-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer'
                                }}
                            >
                                <Navigation size={20} />
                            </button>
                        </div>

                        <div style={{ height: '240px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid var(--border-color)', position: 'relative' }}>
                            <MapContainer 
                                center={[formData.latitude || 24.7136, formData.longitude || 46.6753]} 
                                zoom={13} 
                                style={{ height: '100%', width: '100%' }}
                            >
                                <ChangeView center={[formData.latitude || 24.7136, formData.longitude || 46.6753]} />
                                <TileLayer
                                    attribution='&copy; Google Maps'
                                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar"
                                />
                                <LocationMarker 
                                    position={[formData.latitude || 24.7136, formData.longitude || 46.6753]} 
                                    setPosition={(pos) => setFormData(prev => ({...prev, latitude: pos[0], longitude: pos[1]}))} 
                                />
                            </MapContainer>
                            <div style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(255,255,255,0.9)', color: 'black', padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
                                👈 حرك الخريطة أو اضغط لتغيير الموقع بدقة
                            </div>
                        </div>

                        {/* Manual Entry Toggle */}
                        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                            <button 
                                type="button" 
                                onClick={() => setShowManual(!showManual)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                            >
                                {showManual ? 'إخفاء الإحداثيات اليدوية' : 'أدخل الإحداثيات يدوياً (للمتقدمين)'}
                            </button>
                            
                            {showManual && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>خط العرض</label>
                                        <input type="number" step="any" name="latitude" value={formData.latitude} onChange={handleChange}
                                            style={{ width: '100%', padding: '0.4rem', fontSize: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>خط الطول</label>
                                        <input type="number" step="any" name="longitude" value={formData.longitude} onChange={handleChange}
                                            style={{ width: '100%', padding: '0.4rem', fontSize: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>التصنيف</label>
                            <select name="category" value={formData.category} onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>الحالة</label>
                            <select name="status" value={formData.status} onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                                <option value="مفتوح">مفتوح</option>
                                <option value="مغلق">مغلق</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>وقت البدء</label>
                            <input required type="time" name="start" value={formData.workingHours.start} onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>وقت الإنتهاء</label>
                            <input required type="time" name="end" value={formData.workingHours.end} onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>رقم الهاتف</label>
                        <input required type="text" name="phone" value={formData.phone} onChange={handleChange}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>العنوان التفصيلي</label>
                        <input required type="text" name="address" value={formData.address} onChange={handleChange}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
                    </div>

                    <button type="submit" style={{
                        marginTop: '1rem', padding: '0.75rem', background: 'var(--primary-color)', color: 'white',
                        border: 'none', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 700
                    }}>
                        <Save size={20} /> حفظ الفرع
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BranchForm;
