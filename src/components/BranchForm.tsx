import React, { useState, useEffect } from 'react';
import type { Branch, Category } from '../types';
import { X, Save, MapPin } from 'lucide-react';
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
    });
    const [mapLink, setMapLink] = useState('');

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

    const handleExtractLocation = async () => {
        if (!mapLink.trim()) {
            toast.error("يرجى إدخال الرابط أولاً");
            return;
        }

        let linkToProcess = mapLink;

        // If it's a short maps link, try to expand it via CORS proxy
        if (linkToProcess.includes('goo.gl') || linkToProcess.includes('maps.app.goo.gl')) {
            toast.loading("جاري فك الرابط المختصر واستخراج الموقع...", { id: 'extract-loc' });
            try {
                const response = await fetch(`https://api.codetabs.com/v1/proxy?quest=${linkToProcess}`);
                const text = await response.text();
                // The proxy returns Google's redirect page which has the full URL in the <title> tag
                const titleMatch = text.match(/<title>(.*?)<\/title>/);
                if (titleMatch && titleMatch[1]) {
                    linkToProcess = titleMatch[1]; // The extracted long URL
                } else {
                    // Fallback to searching the whole html text
                    linkToProcess = text;
                }
            } catch (error) {
                console.error("Error expanding short link", error);
                toast.error("فشلنا في فك الرابط المختصر. يرجى لصق الرابط الطويل من المتصفح مباشرة.", { id: 'extract-loc' });
                return;
            }
        }

        // Try finding @lat,lng (format in long Google Maps URLs)
        const matchAt = linkToProcess.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (matchAt) {
            setFormData(prev => ({...prev, latitude: parseFloat(matchAt[1]), longitude: parseFloat(matchAt[2]) }));
            toast.success("تم سحب الإحداثيات بنجاح", { id: 'extract-loc' });
            setMapLink('');
            return;
        }

        // Formats like /place/.../24.7136,46.6753
        const matchPlace = linkToProcess.match(/place\/.*?(-?\d+\.\d+)[,\/]+(-?\d+\.\d+)/);
        if (matchPlace) {
            setFormData(prev => ({...prev, latitude: parseFloat(matchPlace[1]), longitude: parseFloat(matchPlace[2]) }));
            toast.success("تم سحب الإحداثيات بنجاح", { id: 'extract-loc' });
            setMapLink('');
            return;
        }

        // Try finding plain coordinates lat, lng typed directly by user
        const matchComma = linkToProcess.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
        if (matchComma) {
             setFormData(prev => ({...prev, latitude: parseFloat(matchComma[1]), longitude: parseFloat(matchComma[2]) }));
             toast.success("تم سحب الإحداثيات بنجاح", { id: 'extract-loc' });
             setMapLink('');
             return;
        }

        toast.error("لم نتمكن من استخراج الإحداثيات. تأكد أنه رابط خرائط جوجل صحيح.", { id: 'extract-loc' });
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
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div className="glass" style={{
                background: 'var(--surface-color)', padding: '2rem', borderRadius: 'var(--radius-lg)',
                width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'
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

                    {/* Mini Map & Link Picker */}
                    <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <MapPin size={18} style={{ verticalAlign: 'middle', marginLeft: '4px', color: 'var(--primary-color)' }} />
                            تحديد موقع الفرع الاستراتيجي
                        </label>
                        
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                            <input 
                                type="text" 
                                placeholder="لصق رابط (Google Maps) أو إحداثيات (مثال: 24.71, 46.67)" 
                                value={mapLink} 
                                onChange={(e) => setMapLink(e.target.value)}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', direction: 'ltr', textAlign: 'left' }} 
                            />
                            <button type="button" onClick={handleExtractLocation} style={{ padding: '0 1.5rem', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}>
                                تحديد
                            </button>
                        </div>

                        <div style={{ height: '220px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', zIndex: 0, position: 'relative', border: '2px solid var(--border-color)' }}>
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
                            <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, background: 'rgba(255,255,255,0.95)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none', boxShadow: 'var(--shadow-sm)' }}>
                                👆 اضغط على الخريطة لاختيار نقطة دقيقة
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>خط العرض (Latitude)</label>
                                <input required type="number" step="any" name="latitude" value={formData.latitude} onChange={handleChange}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>خط الطول (Longitude)</label>
                                <input required type="number" step="any" name="longitude" value={formData.longitude} onChange={handleChange}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }} />
                            </div>
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
