import React, { useState, useEffect, useRef } from 'react';
import { Plus, Building2, Trash2, X, FileText, FileSpreadsheet, ArrowRight, MapPin, Upload, Share2 } from 'lucide-react';
import type { Branch, OperatingCompany } from '../types';
import { subscribeToOperatingCompanies, addOperatingCompany, updateOperatingCompany, deleteOperatingCompany, uploadImage } from '../services/storage';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; display: block;">
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
        iconSize: [36, 46],
        iconAnchor: [18, 46],
        popupAnchor: [0, -46]
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
    onBack: () => void;
    branches: Branch[];
    onAddNewBranch: (companyId: string) => void;
}

const OperatingCompaniesView: React.FC<Props> = ({ branches, onAddNewBranch, onBack }) => {
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
        return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-color)', direction: 'rtl' }}>
            {/* Sidebar */}
            <div className="custom-scrollbar" style={{
                width: '320px',
                background: 'var(--surface-color)',
                borderLeft: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                zIndex: 50,
                boxShadow: '-4px 0 20px rgba(0,0,0,0.05)',
                overflowY: 'auto'
            }}>
                <div style={{ padding: '24px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <button 
                        onClick={onBack}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '8px 0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 800,
                            color: 'var(--text-secondary)',
                            marginBottom: '24px',
                            transition: 'all 0.2s',
                            fontSize: '15px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-color)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                        <ArrowRight size={20} /> العودة للوحة التحكم
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', padding: '10px', borderRadius: '12px' }}>
                            <Building2 size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>إدارة الشركات</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input 
                            type="text" 
                            placeholder="اسم الشركة الجديدة..." 
                            value={newCompanyName}
                            onChange={e => setNewCompanyName(e.target.value)}
                            style={{
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)',
                                outline: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                fontWeight: 600
                            }}
                        />
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    background: newCompanyLogoFile ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                    color: newCompanyLogoFile ? '#10b981' : 'var(--text-secondary)',
                                    border: '1px dashed ' + (newCompanyLogoFile ? '#10b981' : 'var(--border-color)'),
                                    borderRadius: '12px',
                                    padding: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    flex: 1
                                }}
                                title="إرفاق شعار"
                            >
                                <Upload size={18} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/png, image/jpeg, image/webp"
                                onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                        setNewCompanyLogoFile(e.target.files[0]);
                                    }
                                }}
                            />
                            <button 
                                onClick={handleAddCompany}
                                disabled={!newCompanyName.trim() || isUploading}
                                style={{
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '0 24px',
                                    cursor: newCompanyName.trim() && !isUploading ? 'pointer' : 'not-allowed',
                                    opacity: newCompanyName.trim() && !isUploading ? 1 : 0.5,
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    fontWeight: 'bold',
                                    flex: 2
                                }}
                            >
                                {isUploading ? <div style={{width: 18, height: 18, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}} /> : <><Plus size={18} /> إضافة</>}
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {companies.map(comp => {
                        const isSelected = selectedCompanyId === comp.id;
                        return (
                            <div 
                                key={comp.id}
                                onClick={() => setSelectedCompanyId(comp.id)}
                                style={{
                                    padding: '16px',
                                    borderRadius: '16px',
                                    background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-color)',
                                    border: `2px solid ${isSelected ? 'var(--primary-color)' : 'transparent'}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'all 0.2s',
                                    gap: '12px'
                                }}
                                className="hover-scale"
                            >
                                {comp.logo ? (
                                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'white', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
                                        <img src={comp.logo} alt={comp.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    </div>
                                ) : (
                                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Building2 size={20} color="var(--primary-color)" />
                                    </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{comp.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={12} /> {comp.branchIds?.length || 0} فرع
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteCompany(comp.id, e)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: 'none',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        color: 'var(--error)',
                                        opacity: isSelected ? 1 : 0.4,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = isSelected ? '1' : '0.4'}
                                    title="حذف الشركة"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        );
                    })}
                    {companies.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-secondary)' }}>
                            لا توجد شركات حتى الآن.
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, height: '100%', position: 'relative' }}>
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
                    <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
                    {(selectedCompany ? companyBranchesList : branches).map(branch => {
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
                                    <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#666' }}>{branch.address}</p>
                                    <button 
                                        onClick={() => handleShare(branch)}
                                        style={{ width: '100%', background: 'var(--primary-color)', color: 'white', border: 'none', padding: '6px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                                    >
                                        <Share2 size={14} /> مشاركة
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                        );
                    })}
                    </MarkerClusterGroup>
                    <MapAutoCenter branches={selectedCompany ? companyBranchesList : branches} />
                </MapContainer>

                {/* Floating Sidebar for Selected Company */}
                {selectedCompany && (
                    <div className="glass animate-fade-in" style={{
                        position: 'absolute',
                        top: '20px',
                        bottom: '20px',
                        left: '20px',
                        width: '420px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '24px',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    {selectedCompany.logo && (
                                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'white', padding: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                            <img src={selectedCompany.logo} alt={selectedCompany.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </div>
                                    )}
                                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#1e293b' }}>
                                        {selectedCompany.name}
                                    </h2>
                                </div>
                                <button 
                                    onClick={() => setSelectedCompanyId(null)}
                                    style={{ background: 'rgba(0,0,0,0.05)', color: '#64748b', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#64748b'; }}
                                    title="إغلاق النافذة"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                                <button 
                                    onClick={handleExportExcel}
                                    style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                                >
                                    <FileSpreadsheet size={18} /> إكسل
                                </button>
                                <button 
                                    onClick={handleExportWord}
                                    style={{ flex: 1, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                                >
                                    <FileText size={18} /> وورد
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', background: 'rgba(0,0,0,0.04)', padding: '6px', borderRadius: '16px' }}>
                                <button 
                                    onClick={() => setActiveTab('linked')}
                                    style={{ flex: 1, background: activeTab === 'linked' ? 'white' : 'transparent', color: activeTab === 'linked' ? '#1e293b' : '#64748b', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'linked' ? '0 4px 8px rgba(0,0,0,0.06)' : 'none' }}
                                >
                                    الفروع ({companyBranchesList.length})
                                </button>
                                <button 
                                    onClick={() => setActiveTab('available')}
                                    style={{ flex: 1, background: activeTab === 'available' ? 'white' : 'transparent', color: activeTab === 'available' ? '#1e293b' : '#64748b', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'available' ? '0 4px 8px rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    إضافة المزيد
                                    {branchesToAdd.length > 0 && <span style={{ background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{branchesToAdd.length}</span>}
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }} className="custom-scrollbar">
                            {activeTab === 'linked' && (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {companyBranchesList.map(branch => (
                                        <div key={branch.id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b', marginBottom: '4px' }}>{branch.name}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{branch.city || extractCity(branch.address)}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handleShare(branch)}
                                                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    title="مشاركة"
                                                >
                                                    <Share2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleRemoveBranchFromCompany(branch.id)}
                                                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    title="إزالة الفرع من الشركة"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {companyBranchesList.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '14px' }}>
                                            لا توجد فروع مرتبطة حالياً.
                                        </div>
                                    )}
                                    
                                    <button 
                                        onClick={() => onAddNewBranch(selectedCompany.id)}
                                        style={{ marginTop: '8px', background: '#f8fafc', color: '#3b82f6', border: '1px dashed #cbd5e1', padding: '16px', borderRadius: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        <Plus size={18} /> إنشاء فرع جديد
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
                )}
            </div>
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
