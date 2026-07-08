const fs = require('fs');

// 1. Fix CompanyDashboard.tsx
let companyCode = fs.readFileSync('src/pages/CompanyDashboard.tsx', 'utf8');

// Fix Branch selector hidden part (remove maxHeight and overflowY)
companyCode = companyCode.replace(/maxHeight:\s*'280px',\s*overflowY:\s*'auto',/g, '');

// Fix detailedRequest buttons to be a grid
let detailedReqIdx = companyCode.indexOf('📋 تفاصيل طلب الخدمة');
if (detailedReqIdx !== -1) {
    let btnsContainerIdx = companyCode.indexOf(`<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>`, detailedReqIdx);
    if (btnsContainerIdx !== -1) {
        let newContainer = `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>`;
        companyCode = companyCode.substring(0, btnsContainerIdx) + newContainer + companyCode.substring(btnsContainerIdx + 71);
    }
}

// Make sure the last button (Delete) in CompanyDashboard detailedRequest is spanning 2 columns
// It already has gridColumn: '1 / -1' from previous edits!

fs.writeFileSync('src/pages/CompanyDashboard.tsx', companyCode);
console.log('Fixed CompanyDashboard');

// 2. Fix AdminDashboard.tsx detailedRequest buttons
let adminCode = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
let adminDetailedReqIdx = adminCode.indexOf('📋 تفاصيل طلب الخدمة');
if (adminDetailedReqIdx !== -1) {
    let adminBtnsContainerIdx = adminCode.indexOf(`<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>`, adminDetailedReqIdx);
    if (adminBtnsContainerIdx !== -1) {
        let adminNewContainer = `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>`;
        adminCode = adminCode.substring(0, adminBtnsContainerIdx) + adminNewContainer + adminCode.substring(adminBtnsContainerIdx + 71);
        
        // Ensure "إغلاق النافذة" button spans full width since there might be an odd number of buttons
        let closeBtnIdx = adminCode.indexOf(`setDetailedRequest(null)`, adminBtnsContainerIdx);
        if (closeBtnIdx !== -1) {
            let styleIdx = adminCode.indexOf('style={{', closeBtnIdx);
            if (styleIdx !== -1) {
                // Insert gridColumn: '1 / -1' if not already present
                let nextLine = adminCode.indexOf('\n', styleIdx);
                if (!adminCode.substring(styleIdx, styleIdx + 100).includes('gridColumn')) {
                    adminCode = adminCode.substring(0, nextLine) + `\n                                    gridColumn: '1 / -1',` + adminCode.substring(nextLine);
                }
            }
        }
    }
}

fs.writeFileSync('src/pages/AdminDashboard.tsx', adminCode);
console.log('Fixed AdminDashboard');

