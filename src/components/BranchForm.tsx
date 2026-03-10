import React, { useState, useEffect } from 'react';
import type { Branch } from '../types';
import { X, Save } from 'lucide-react';

interface BranchFormProps {
    branch?: Branch;
    onSave: (branch: Omit<Branch, 'id'> | Branch) => void;
    onClose: () => void;
}

const BranchForm: React.FC<BranchFormProps> = ({ branch, onSave, onClose }) => {
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (branch) {
            onSave({ ...formData, id: branch.id } as Branch);
        } else {
            onSave(formData);
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>خط العرض (Latitude)</label>
                            <input required type="number" step="any" name="latitude" value={formData.latitude} onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>خط الطول (Longitude)</label>
                            <input required type="number" step="any" name="longitude" value={formData.longitude} onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>التصنيف</label>
                            <select name="category" value={formData.category} onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                                <option value="صيانة عامة">صيانة عامة</option>
                                <option value="غيار زيت">غيار زيت</option>
                                <option value="إطارات">إطارات</option>
                                <option value="فحص شامل">فحص شامل</option>
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
