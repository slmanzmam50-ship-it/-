const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyDashboard.tsx', 'utf8');

// 1. Add lucide icons
code = code.replace(/import {([^}]+)} from 'lucide-react';/, (match, group1) => {
    if (!group1.includes('Trash2')) group1 += ', Trash2';
    if (!group1.includes('Ban')) group1 += ', Ban';
    return `import {${group1}} from 'lucide-react';`;
});

// 2. Add storage imports
code = code.replace(/import {([^}]+)} from '\.\.\/services\/storage';/, (match, group1) => {
    if (!group1.includes('deleteServiceRequest')) group1 += ', deleteServiceRequest';
    if (!group1.includes('updateServiceRequestStatus')) group1 += ', updateServiceRequestStatus';
    return `import {${group1}} from '../services/storage';`;
});

// 3. Change container to grid
code = code.replace(
    `<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>`,
    `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>`
);

// 4. Make the close button take full width (gridColumn: '1 / -1')
// The close button is the one with text "إغلاق النافذة" or similar?
// Let's find the button that sets detailedRequest to null and has background: 'rgba(239, 68, 68, 0.08)'
code = code.replace(
    /onClick=\{\(\) => setDetailedRequest\(null\)\}\s*style=\{\{\s*width: '100%',/,
    `onClick={() => setDetailedRequest(null)}
                                style={{
                                    gridColumn: '1 / -1',
                                    width: '100%',`
);

// 5. Add Cancel and Delete buttons
const cancelAndDeleteButtons = `
                            {(detailedRequest.status === 'active' || detailedRequest.status === 'transferred') && (
                                <button
                                    onClick={async () => {
                                        if (window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
                                            try {
                                                await updateServiceRequestStatus(detailedRequest.id, 'rejected', 'ملغى من قبل الشركة');
                                                toast.success('تم إلغاء الطلب بنجاح');
                                                setDetailedRequest(null);
                                            } catch(err) {
                                                toast.error('حدث خطأ أثناء الإلغاء');
                                            }
                                        }
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        border: '1.5px solid rgba(239, 68, 68, 0.3)',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    className="hover-scale tap-effect"
                                >
                                    <Ban size={16} />
                                    إلغاء الطلب
                                </button>
                            )}
                            <button
                                onClick={async () => {
                                    if (window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) {
                                        try {
                                            await deleteServiceRequest(detailedRequest.id);
                                            toast.success('تم حذف الطلب بنجاح');
                                            setDetailedRequest(null);
                                        } catch(err) {
                                            toast.error('حدث خطأ أثناء الحذف');
                                        }
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
                                }}
                                className="hover-scale tap-effect"
                            >
                                <Trash2 size={16} />
                                حذف الطلب
                            </button>
`;

code = code.replace(
    /\{detailedRequest\.status === 'partial' && \(/,
    cancelAndDeleteButtons + "\n                            {detailedRequest.status === 'partial' && ("
);

// If some buttons span 1 / -1
// like handleRepeatRequest, maybe they look better full width? Let's keep them as grid items. 
// But the ReRoute button and Partial button might look weird if odd count. Let's make all conditional buttons span 2 cols?
// Actually, it's fine.

fs.writeFileSync('src/pages/CompanyDashboard.tsx', code);
console.log('CompanyDashboard.tsx updated');
