import React, { useState, useEffect } from 'react';
import type { Branch, Category } from '../types';
import { X, Save, MapPin, Search as SearchIcon, ExternalLink, Navigation, Loader2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadImage } from '../services/storage';
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
        categories: ['صيانة عامة'],
        status: 'مفتوح',
        workingHours: { start: '08:00', end: '22:00' },
        address: '',
        phone: '',
        mapUrl: '',
        managerName: '',
    });
    const [mapInput, setMapInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (branch) {
            // Handle legacy data: ensure categories is an array
            const legacyBranch = branch as any;
            const categories = branch.categories || (legacyBranch.category ? [legacyBranch.category] : ['صيانة عامة']);
            setFormData({ ...branch, categories });
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;
        setIsSaving(true);
        try {
            let finalImageUrl = formData.imageUrl;
            if (imageFile) {
                toast.loading('جاري رفع الصورة...', { id: 'upload' });
                finalImageUrl = await uploadImage(imageFile, 'branches');
                toast.success('تم رفع الصورة بنجاح', { id: 'upload' });
            }

            const dataToSave = { ...formData, imageUrl: finalImageUrl };

            if (branch) {
                onSave({ ...dataToSave, id: branch.id } as Branch);
            } else {
                onSave(dataToSave as any); // Cast because Omit<Branch, 'id'> expects categories properly
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء حفظ الفرع. جرب لاحقاً.', { id: 'upload' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(15px)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <div className="glass branch-form-modal">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{branch ? 'تعديل فرع' : 'إضافة فرع جديد'}</h2>
                    <button onClick={onClose} style={{ background: 'var(--bg-color)', border: 'none', color: 'var(--text-secondary)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>اسم الفرع</label>
                        <input required type="text" name="name" value={formData.name} onChange={handleChange}
                            placeholder="مثال: فرع الرياض - حي الياسمين"
                            style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }} />
                    </div>

                    {/* Intelligent Location Selection */}
                    <div style={{ background: 'var(--bg-color)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <label style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                                <MapPin size={20} color="var(--primary-color)" />
                                موقع الفرع
                            </label>
                            {formData.mapUrl && (
                                <a href={formData.mapUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600 }}>
                                    <ExternalLink size={14} /> معاينة الرابط
                                </a>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1', minWidth: '200px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <div style={{ position: 'absolute', right: '12px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                                    <SearchIcon size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="ابحث بالعنوان أو الصق الرابط..." 
                                    value={mapInput} 
                                    onChange={(e) => setMapInput(e.target.value)}
                                    style={{ width: '100%', padding: '0.85rem 2.5rem 0.85rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', fontSize: '14px', outline: 'none' }} 
                                />
                            </div>
                            <div style={{ display: 'contents' } as any}>
                                <button 
                                    type="button" 
                                    onClick={() => handleExtractFromLink(false)} 
                                    disabled={isSearching}
                                    style={{ 
                                        padding: '0 1.25rem', background: 'var(--primary-color)', color: 'white', 
                                        border: 'none', borderRadius: '10px', cursor: 'pointer', 
                                        fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', minHeight: '45px',
                                        flex: 1
                                    }}
                                >
                                    {isSearching ? <Loader2 className="animate-spin" size={18} /> : 'تحديد'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleGetCurrentLocation}
                                    title="موقعي الحالي"
                                    style={{ 
                                        width: '45px', height: '45px', background: 'var(--bg-color)', color: 'var(--primary-color)', 
                                        border: '1px solid var(--primary-color)', borderRadius: '10px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <Navigation size={20} />
                                </button>
                            </div>
                        </div>

                        <div style={{ height: '220px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--border-color)', position: 'relative' }}>
                            <MapContainer 
                                center={[formData.latitude || 24.7136, formData.longitude || 46.6753]} 
                                zoom={13} 
                                maxZoom={20}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <ChangeView center={[formData.latitude || 24.7136, formData.longitude || 46.6753]} />
                                <TileLayer
                                    attribution='&copy; Google Maps'
                                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar"
                                    maxZoom={20}
                                />
                                <LocationMarker 
                                    position={[formData.latitude || 24.7136, formData.longitude || 46.6753]} 
                                    setPosition={(pos) => setFormData(prev => ({...prev, latitude: pos[0], longitude: pos[1]}))} 
                                />
                            </MapContainer>
                            <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(255,255,255,0.95)', color: 'var(--text-primary)', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
                                حرك الخريطة لتحديد الموقع بدقة
                            </div>
                        </div>

                        {/* Manual Entry Toggle */}
                        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                            <button 
                                type="button" 
                                onClick={() => setShowManual(!showManual)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                            >
                                {showManual ? 'إخفاء الإحداثيات' : 'أدخل الإحداثيات يدوياً'}
                            </button>
                            
                            {showManual && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px', fontWeight: 600 }}>خط العرض</label>
                                        <input type="number" step="any" name="latitude" value={formData.latitude} onChange={handleChange}
                                            style={{ width: '100%', padding: '0.5rem', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px', fontWeight: 600 }}>خط الطول</label>
                                        <input type="number" step="any" name="longitude" value={formData.longitude} onChange={handleChange}
                                            style={{ width: '100%', padding: '0.5rem', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>الأقسام</label>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                            gap: '0.5rem', 
                            background: 'var(--bg-color)', 
                            padding: '1rem', 
                            borderRadius: '12px', 
                            border: '1px solid var(--border-color)',
                            maxHeight: '140px',
                            overflowY: 'auto'
                        }}>
                            {categories.map(cat => (
                                <label key={cat.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    cursor: 'pointer', 
                                    fontSize: '13px',
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    background: formData.categories.includes(cat.name) ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                    transition: 'all 0.2s'
                                }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.categories.includes(cat.name)}
                                        onChange={(e) => {
                                            const newCats = e.target.checked 
                                                ? [...formData.categories, cat.name] 
                                                : formData.categories.filter(c => c !== cat.name);
                                            if (newCats.length === 0) {
                                                toast.error("يجب اختيار قسم واحد على الأقل");
                                                return;
                                            }
                                            setFormData({ ...formData, categories: newCats });
                                        }}
                                        style={{ cursor: 'pointer', accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                                    />
                                    {cat.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>الحالة</label>
                            <select name="status" value={formData.status} onChange={handleChange}
                                style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}>
                                <option value="مفتوح">مفتوح</option>
                                <option value="مغلق">مغلق</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>رقم الهاتف</label>
                            <input required type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                placeholder="05xxxxxxxx"
                                style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>وقت البدء</label>
                            <input required type="time" name="start" value={formData.workingHours.start} onChange={handleChange}
                                style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>وقت الإنتهاء</label>
                            <input required type="time" name="end" value={formData.workingHours.end} onChange={handleChange}
                                style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>العنوان بالتفصيل</label>
                        <input required type="text" name="address" value={formData.address} onChange={handleChange}
                            placeholder="اسم الشارع، الحي، المدينة"
                            style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>صورة الفرع (اختياري)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.85rem', borderRadius: '10px', border: '1px dashed var(--primary-color)', background: 'rgba(59, 130, 246, 0.05)', color: 'var(--primary-color)', flex: 1, justifyContent: 'center' }}>
                                <ImageIcon size={20} />
                                <span>{imageFile ? imageFile.name : (formData.imageUrl ? 'تغيير الصورة الحالية' : 'اختر صورة من جهازك')}</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setImageFile(e.target.files[0]);
                                        }
                                    }} 
                                />
                            </label>
                            {(imageFile || formData.imageUrl) && (
                                <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                    <img 
                                        src={imageFile ? URL.createObjectURL(imageFile) : formData.imageUrl} 
                                        alt="Preview" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>اسم المسؤول</label>
                        <input type="text" name="managerName" value={formData.managerName || ''} onChange={handleChange}
                            placeholder="أدخل اسم المسؤول عن الفرع"
                            style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }} />
                    </div>

                    <button type="submit" disabled={isSaving} style={{
                        marginTop: '0.8rem', padding: '1.1rem', background: 'var(--grad-primary)', color: 'white',
                        border: 'none', borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem', fontWeight: 800,
                        boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '1.05rem',
                        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        opacity: isSaving ? 0.7 : 1
                    }} className={isSaving ? '' : 'hover-scale'}>
                        {isSaving ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />} 
                        {isSaving ? 'جاري الحفظ...' : 'حفظ بيانات الفرع'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BranchForm;
