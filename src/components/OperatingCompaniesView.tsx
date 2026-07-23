import React, { useState, useEffect, useRef } from 'react';
import { Plus, Building2, Trash2, X, FileText, FileSpreadsheet, ArrowRight, MapPin, Upload } from 'lucide-react';
import type { Branch, OperatingCompany } from '../types';
import { subscribeToOperatingCompanies, addOperatingCompany, updateOperatingCompany, deleteOperatingCompany, uploadImage } from '../services/storage';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix typical React Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createBranchIcon = (branch: Branch, isOpen: boolean) => {
    const statusColor = branch.status === 'تحت الصيانة' ? '#f97316' : (isOpen ? '#10b981' : '#ef4444');
    
    const placeholderSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; display: block;">
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
        iconAnchor: [23, 56],
        popupAnchor: [0, -56]
    });
};

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
            return nowMins >= startMins || nowMins < endMins;
        }
        return nowMins >= startMins && nowMins < endMins;
    } catch {
        return branch.status === 'مفتوح';
    }
};

const MapAutoCenter: React.FC<{ branches: Branch[] }> = ({ branches }) => {
    const map = useMap();
    useEffect(() => {
        if (branches.length > 0) {
            const lats = branches.map(b => b.latitude).filter(l => !isNaN(l) && l !== 0);
            const lngs = branches.map(b => b.longitude).filter(l => !isNaN(l) && l !== 0);
            if (lats.length > 0 && lngs.length > 0) {
                const minLat = Math.min(...lats);
                const maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs);
                const maxLng = Math.max(...lngs);
                
                const bounds = L.latLngBounds(
                    [minLat - 0.05, minLng - 0.05],
                    [maxLat + 0.05, maxLng + 0.05]
                );
                
                setTimeout(() => {
                    map.invalidateSize();
                    map.fitBounds(bounds, { animate: true, duration: 1, padding: [50, 50] });
                }, 100);
            }
        }
    }, [branches, map]);
    return null;
};

interface Props {
    branches: Branch[];
    onAddNewBranch: (companyId: string) => void;
}

const OperatingCompaniesView: React.FC<Props> = ({ branches, onAddNewBranch }) => {
    const [companies, setCompanies] = useState<OperatingCompany[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyLogoFile, setNewCompanyLogoFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [branchesToAdd, setBranchesToAdd] = useState<string[]>([]);

    const [activeTab, setActiveTab] = useState<'linked' | 'available'>('linked');
    const [branchSearch, setBranchSearch] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = subscribeToOperatingCompanies(setCompanies);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (selectedCompanyId) {
            setActiveTab('linked');
            setBranchesToAdd([]);
            setBranchSearch('');
        }
    }, [selectedCompanyId]);

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    
    const availableBranches = branches.filter(b => !(selectedCompany?.branchIds || []).includes(b.id));
    const filteredAvailableBranches = availableBranches.filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()) || b.address.toLowerCase().includes(branchSearch.toLowerCase()));

    const handleAddCompany = async () => {
        if (!newCompanyName.trim()) return;
        setIsUploading(true);
        try {
            let logoUrl = '';
            if (newCompanyLogoFile) {
                toast.loading('جاري رفع الشعار...', { id: 'logoUpload' });
                logoUrl = await uploadImage(newCompanyLogoFile, 'companies');
                toast.success('تم رفع الشعار بنجاح', { id: 'logoUpload' });
            }

            await addOperatingCompany({ name: newCompanyName.trim(), branchIds: [], logo: logoUrl });
            setNewCompanyName('');
            setNewCompanyLogoFile(null);
            toast.success('تمت إضافة الشركة بنجاح');
        } catch (e) {
            console.error(e);
            toast.error('حدث خطأ أثناء إضافة الشركة');
        } finally {
            setIsUploading(false);
            toast.dismiss('logoUpload');
        }
    };

    const handleDeleteCompany = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('هل أنت متأكد من حذف هذه الشركة التشغيلية؟ لن يتم حذف الفروع بل سيتم إزالة ارتباطها فقط.')) {
            try {
                await deleteOperatingCompany(id);
                if (selectedCompanyId === id) setSelectedCompanyId(null);
                toast.success('تم الحذف بنجاح');
            } catch (error) {
                toast.error('حدث خطأ أثناء الحذف');
            }
        }
    };

    const handleAddBranchesToCompany = async () => {
        if (!selectedCompany || branchesToAdd.length === 0) return;

        try {
            await updateOperatingCompany({
                ...selectedCompany,
                branchIds: [...(selectedCompany.branchIds || []), ...branchesToAdd]
            });
            setBranchesToAdd([]);
            setActiveTab('linked');
            toast.success('تم ربط الفروع بالشركة بنجاح');
        } catch (e) {
            toast.error('حدث خطأ أثناء الربط');
        }
    };

    const handleRemoveBranchFromCompany = async (branchId: string) => {
        if (!selectedCompany) return;
        if (window.confirm('هل أنت متأكد من إزالة هذا الفرع من الشركة؟ لن يتم حذفه من النظام الكلي.')) {
            try {
                await updateOperatingCompany({
                    ...selectedCompany,
                    branchIds: (selectedCompany.branchIds || []).filter(id => id !== branchId)
                });
                toast.success('تم إزالة الفرع من الشركة');
            } catch (e) {
                toast.error('حدث خطأ أثناء الإزالة');
            }
        }
    };

    const handleExportExcel = () => {
        if (!selectedCompany || !selectedCompany.branchIds) {
            toast.error('لا توجد فروع لتصديرها');
            return;
        }
        
        let companyBranches = selectedCompany.branchIds.map(id => branches.find(b => b.id === id)).filter(Boolean) as Branch[];
        if (companyBranches.length === 0) {
            toast.error('لا توجد فروع لتصديرها');
            return;
        }

        companyBranches = companyBranches.sort((a, b) => (a.city || '').localeCompare(b.city || '', 'ar'));

        const data = companyBranches.map((b, index) => ({
            'م': index + 1,
            'المدينة': b.city || 'أخرى',
            'اسم الفرع': b.name,
            'اسم المستلم': b.managerName || 'غير محدد',
            'رقم الهاتف': b.phone || 'غير محدد',
            'العنوان': b.address,
            'موقع الفرع': `https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}`
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!dir'] = 'rtl';
        ws['!cols'] = [{wch: 5}, {wch: 15}, {wch: 30}, {wch: 25}, {wch: 15}, {wch: 50}, {wch: 60}];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "الفروع");
        
        XLSX.writeFile(wb, `فروع_${selectedCompany.name}.xlsx`);
        toast.success('تم تصدير ملف إكسل بنجاح');
    };

    const handleExportWord = () => {
        if (!selectedCompany || !selectedCompany.branchIds) {
            toast.error('لا توجد فروع لتصديرها');
            return;
        }
        
        let companyBranches = selectedCompany.branchIds.map(id => branches.find(b => b.id === id)).filter(Boolean) as Branch[];
        if (companyBranches.length === 0) {
            toast.error('لا توجد فروع لتصديرها');
            return;
        }

        companyBranches = companyBranches.sort((a, b) => (a.city || '').localeCompare(b.city || '', 'ar'));

        const htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset="utf-8">
                <title>فروع ${selectedCompany.name}</title>
                <style>
                    body { font-family: 'Arial', sans-serif; direction: rtl; }
                    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                    th, td { border: 1px solid #000; padding: 10px; text-align: right; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    h1 { color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
                    a { color: #2563eb; text-decoration: none; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>قائمة الفروع التابعة لشركة: ${selectedCompany.name}</h1>
                <p>إجمالي عدد الفروع: <strong>${companyBranches.length}</strong></p>
                <table>
                    <tr>
                        <th>م</th>
                        <th>المدينة</th>
                        <th>اسم الفرع</th>
                        <th>اسم المستلم</th>
                        <th>رقم الهاتف</th>
                        <th>العنوان</th>
                        <th>موقع الفرع</th>
                    </tr>
                    ${companyBranches.map((b, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${b.city || 'أخرى'}</td>
                            <td>${b.name}</td>
                            <td>${b.managerName || 'غير محدد'}</td>
                            <td dir="ltr" style="text-align: right;">${b.phone || 'غير محدد'}</td>
                            <td>${b.address}</td>
                            <td><a href="https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}">عرض في خرائط قوقل</a></td>
                        </tr>
                    `).join('')}
                </table>
                <div class="footer">تم التصدير من نظام إدارة الفروع</div>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', htmlContent], {
            type: 'application/msword'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `فروع_${selectedCompany.name}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('تم تصدير ملف وورد بنجاح');
    };

    const companyBranchesList = selectedCompany?.branchIds?.map(id => branches.find(b => b.id === id)).filter(Boolean) as Branch[] || [];

    return (
        <div style={{
            background: 'var(--surface-color)',
            borderRadius: '24px',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            direction: 'rtl'
        }}>
            {!selectedCompany ? (
                // ==========================================
                // GRID VIEW - ALL COMPANIES
                // ==========================================
                <div style={{ padding: '40px', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', marginTop: '20px', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                            <h2 style={{ margin: '0 0 8px', fontSize: '2.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '16px' }}>
                                    <Building2 size={36} color="var(--primary-color)" />
                                </div>
                                إدارة الشركات التشغيلية
                            </h2>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                                اختر شركة لعرض خريطة فروعها، أو قم بإضافة شركة جديدة.
                            </p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '600px' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input 
                                    type="text" 
                                    placeholder="اسم الشركة الجديدة..." 
                                    value={newCompanyName}
                                    onChange={e => setNewCompanyName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '16px 20px',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-color)',
                                        color: 'var(--text-primary)',
                                        fontSize: '15px',
                                        transition: 'all 0.2s',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCompany()}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setNewCompanyLogoFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            background: newCompanyLogoFile ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-color)',
                                            color: newCompanyLogoFile ? 'var(--success)' : 'var(--text-secondary)',
                                            border: '1px dashed var(--border-color)',
                                            padding: '8px 16px',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Upload size={16} />
                                        {newCompanyLogoFile ? 'تم اختيار الشعار' : 'إرفاق شعار (اختياري)'}
                                    </button>
                                    {newCompanyLogoFile && (
                                        <button 
                                            onClick={() => setNewCompanyLogoFile(null)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={handleAddCompany}
                                disabled={!newCompanyName.trim() || isUploading}
                                style={{
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '16px',
                                    padding: '0 32px',
                                    height: '56px',
                                    cursor: newCompanyName.trim() && !isUploading ? 'pointer' : 'not-allowed',
                                    opacity: newCompanyName.trim() && !isUploading ? 1 : 0.5,
                                    transition: 'all 0.2s',
                                    boxShadow: newCompanyName.trim() ? '0 8px 16px rgba(59, 130, 246, 0.3)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: 'bold',
                                    alignSelf: 'flex-start'
                                }}
                            >
                                {isUploading ? 'جاري...' : <><Plus size={20} /> إضافة</>}
                            </button>
                        </div>
                    </div>

                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                        gap: '24px',
                        paddingBottom: '40px'
                    }}>
                        {companies.map(comp => (
                            <div 
                                key={comp.id}
                                onClick={() => setSelectedCompanyId(comp.id)}
                                style={{
                                    padding: '24px',
                                    borderRadius: '20px',
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                className="hover-scale company-card"
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(59, 130, 246, 0.15)';
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                    {comp.logo ? (
                                        <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'white', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                            <img src={comp.logo} alt={comp.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        </div>
                                    ) : (
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '16px' }}>
                                            <Building2 size={28} color="var(--primary-color)" />
                                        </div>
                                    )}
                                    <button 
                                        onClick={(e) => handleDeleteCompany(comp.id, e)}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: 'none',
                                            padding: '8px',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            color: 'var(--error)',
                                            transition: 'all 0.2s',
                                            opacity: 0.7
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                                        title="حذف الشركة"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <h3 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800 }}>{comp.name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    <MapPin size={16} />
                                    {comp.branchIds?.length || 0} فروع مرتبطة
                                </div>
                                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontWeight: 700, fontSize: '14px' }}>
                                    استعراض الفروع <ArrowRight size={16} />
                                </div>
                            </div>
                        ))}
                        {companies.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
                                <Building2 size={64} style={{ opacity: 0.2, marginBottom: '24px' }} />
                                <h3 style={{ margin: '0 0 12px', fontSize: '1.5rem', color: 'var(--text-primary)' }}>لا توجد شركات مسجلة</h3>
                                <p style={{ fontSize: '15px', margin: 0 }}>قم بإضافة شركة جديدة من الحقل بالأعلى لتبدأ بتنظيم فروعك.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // ==========================================
                // DETAILS VIEW - MAP & BRANCHES
                // ==========================================
                <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', borderRadius: '24px', overflow: 'hidden' }}>
                    
                    {/* Map Background Layer */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                        <MapContainer 
                            center={[24.7136, 46.6753]} 
                            zoom={5} 
                            style={{ height: '100%', width: '100%', background: '#1e293b', zIndex: 1 }}
                            zoomControl={false}
                        >
                            <TileLayer
                                attribution='&copy; Google Maps'
                                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar"
                            />
                            {companyBranchesList.map(branch => {
                                const isOpen = isCurrentlyOpen(branch);
                                return (
                                <Marker 
                                    key={branch.id} 
                                    position={[branch.latitude || 24.7136, branch.longitude || 46.6753]}
                                    icon={createBranchIcon(branch, isOpen)}
                                >
                                    <Popup>
                                        <div style={{ padding: '8px', textAlign: 'right', direction: 'rtl' }}>
                                            <h4 style={{ margin: '0 0 4px', fontWeight: 800 }}>{branch.name}</h4>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{branch.address}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                                );
                            })}
                            <MapAutoCenter branches={companyBranchesList} />
                        </MapContainer>
                    </div>

                    {/* Floating Sidebar (Right Side) */}
                    <div className="glass" style={{
                        width: '450px',
                        height: 'calc(100% - 40px)',
                        margin: '20px 20px 20px 0',
                        background: 'rgba(255, 255, 255, 0.92)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '24px',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        overflow: 'hidden'
                    }}>
                        {/* Header inside sidebar */}
                        <div style={{ padding: '32px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                            <button 
                                onClick={() => setSelectedCompanyId(null)}
                                style={{
                                    background: 'rgba(0,0,0,0.04)',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: 700,
                                    color: 'var(--text-secondary)',
                                    marginBottom: '24px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            >
                                <ArrowRight size={18} /> رجوع للشركات
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                {selectedCompany.logo && (
                                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'white', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                        <img src={selectedCompany.logo} alt={selectedCompany.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                )}
                                <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#1e293b' }}>
                                    {selectedCompany.name}
                                </h2>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                                <button 
                                    onClick={handleExportExcel}
                                    style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                                >
                                    <FileSpreadsheet size={18} /> إكسل
                                </button>
                                <button 
                                    onClick={handleExportWord}
                                    style={{ flex: 1, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                                >
                                    <FileText size={18} /> وورد
                                </button>
                            </div>

                            {/* Tabs for branches */}
                            <div style={{ display: 'flex', gap: '16px', background: 'rgba(0,0,0,0.04)', padding: '6px', borderRadius: '16px' }}>
                                <button 
                                    onClick={() => setActiveTab('linked')}
                                    style={{ flex: 1, background: activeTab === 'linked' ? 'white' : 'transparent', color: activeTab === 'linked' ? '#1e293b' : '#64748b', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'linked' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}
                                >
                                    الفروع ({companyBranchesList.length})
                                </button>
                                <button 
                                    onClick={() => setActiveTab('available')}
                                    style={{ flex: 1, background: activeTab === 'available' ? 'white' : 'transparent', color: activeTab === 'available' ? '#1e293b' : '#64748b', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'available' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    ربط المزيد
                                    {branchesToAdd.length > 0 && <span style={{ background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>{branchesToAdd.length}</span>}
                                </button>
                            </div>
                        </div>

                        {/* Sidebar Content Scroll Area */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} className="custom-scrollbar">
                            {activeTab === 'linked' && (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {companyBranchesList.map(branch => (
                                        <div key={branch.id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b', marginBottom: '4px' }}>{branch.name}</div>
                                                <div style={{ fontSize: '13px', color: '#64748b' }}>{branch.city || extractCity(branch.address)}</div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveBranchFromCompany(branch.id)}
                                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                title="إزالة الفرع من الشركة"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {companyBranchesList.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                                            لا توجد فروع مرتبطة حالياً.
                                        </div>
                                    )}
                                    
                                    <button 
                                        onClick={() => onAddNewBranch(selectedCompany.id)}
                                        style={{ marginTop: '16px', background: '#f8fafc', color: '#3b82f6', border: '1px dashed #cbd5e1', padding: '16px', borderRadius: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        <Plus size={18} /> إنشاء فرع جديد بالخريطة
                                    </button>
                                </div>
                            )}

                            {activeTab === 'available' && (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <input 
                                            type="text" 
                                            placeholder="ابحث بالاسم أو المدينة..." 
                                            value={branchSearch}
                                            onChange={e => setBranchSearch(e.target.value)}
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'white', color: '#1e293b', outline: 'none' }}
                                        />
                                        <button 
                                            onClick={handleAddBranchesToCompany}
                                            disabled={branchesToAdd.length === 0}
                                            style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, cursor: branchesToAdd.length > 0 ? 'pointer' : 'not-allowed', opacity: branchesToAdd.length > 0 ? 1 : 0.5, transition: 'all 0.2s' }}
                                        >
                                            تأكيد الربط ({branchesToAdd.length})
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                        {filteredAvailableBranches.map(b => {
                                            const isSelected = branchesToAdd.includes(b.id);
                                            return (
                                                <div 
                                                    key={b.id} 
                                                    onClick={() => {
                                                        if (isSelected) setBranchesToAdd(branchesToAdd.filter(id => id !== b.id));
                                                        else setBranchesToAdd([...branchesToAdd, b.id]);
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', cursor: 'pointer', borderRadius: '12px', border: `2px solid ${isSelected ? '#3b82f6' : 'rgba(0,0,0,0.05)'}`, background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'white', transition: 'all 0.2s' }}
                                                >
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`, background: isSelected ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {isSelected && <svg width="12" height="8" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 5L5 8.5L12.5 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{b.name}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{b.city || extractCity(b.address)}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {filteredAvailableBranches.length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '14px' }}>
                                                لا توجد فروع مطابقة.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

// Helper inside the component or outside
const extractCity = (address: string): string => {
    if (!address) return "أخرى";
    const cities = ["الرياض", "جدة", "مكة", "المدينة", "الدمام", "الخبر", "الظهران", "القطيف", "الجبيل", "الأحساء", "الطائف", "ينبع", "تبوك", "بريدة", "حائل", "أبها", "جازان"];
    for (const city of cities) {
        if (address.includes(city)) return city;
    }
    return "أخرى";
};

export default OperatingCompaniesView;
