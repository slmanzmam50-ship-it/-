const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyDashboard.tsx', 'utf8');

// Find the block we injected previously and replace it
const oldBlockStart = `{(detailedRequest.status === 'active' || detailedRequest.status === 'transferred') && (
                                <button
                                    onClick={async () => {
                                        if (window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {`;

const startIdx = code.indexOf(oldBlockStart);
if (startIdx === -1) {
    console.error("Could not find the block to replace.");
    process.exit(1);
}

// Find the end of the delete button
const endString = `حذف الطلب
                            </button>`;
const endIdx = code.indexOf(endString, startIdx);
if (endIdx === -1) {
    console.error("Could not find the end of the block.");
    process.exit(1);
}

const fullOldBlock = code.substring(startIdx, endIdx + endString.length);

const newBlock = `
                            <button
                                onClick={async () => {
                                    if (window.confirm('هل أنت متأكد من إلغاء وحذف هذا الطلب نهائياً؟')) {
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
                                    gridColumn: '1 / -1',
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
                                إلغاء وحذف الطلب
                            </button>
`.trim();

code = code.replace(fullOldBlock, newBlock);

fs.writeFileSync('src/pages/CompanyDashboard.tsx', code);
console.log("Successfully replaced buttons.");
