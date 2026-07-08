const fs = require('fs');
let code = fs.readFileSync('src/pages/BranchPanel.tsx', 'utf8');

// 1. Update the main actions container (4 buttons)
code = code.replace(
    `<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>`,
    `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>`
);

// Add justifyContent: 'center' to these 4 buttons if not already there
const btnStrs = [
    `onClick={handleCompleteRequest}`,
    `onClick={handleTransferRequest}`,
    `onClick={() => setShowPartialDialog(true)}`,
    `onClick={() => setShowRejectDialog(true)}`
];
btnStrs.forEach(btn => {
    // Find button start
    let idx = code.indexOf(btn);
    if (idx !== -1) {
        let styleIdx = code.indexOf('style={{', idx);
        if (styleIdx !== -1) {
            let nextLineIdx = code.indexOf('\n', styleIdx);
            code = code.substring(0, nextLineIdx) + `\n                                                        justifyContent: 'center',` + code.substring(nextLineIdx);
        }
    }
});

// 2. Update the Reject Dialog buttons
// It has 3 buttons. We replace the specific container for Reject Dialog
// Let's find handleRejectRequest to locate the container
let rejectIdx = code.indexOf('onClick={handleRejectRequest}');
if (rejectIdx !== -1) {
    let containerIdx = code.lastIndexOf(`<div style={{ display: 'flex', gap: '12px' }}>`, rejectIdx);
    if (containerIdx !== -1 && (rejectIdx - containerIdx) < 200) {
        code = code.substring(0, containerIdx) + 
               `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>` + 
               code.substring(containerIdx + 46);
               
        // The 3rd button is the "تراجع" button after handleTransferRequest
        let backBtnIdx = code.indexOf(`onClick={() => setShowRejectDialog(false)}`, rejectIdx);
        if (backBtnIdx !== -1) {
            let styleIdx = code.indexOf('style={{', backBtnIdx);
            if (styleIdx !== -1) {
                let nextLineIdx = code.indexOf('\n', styleIdx);
                code = code.substring(0, nextLineIdx) + `\n                                    gridColumn: '1 / -1',` + code.substring(nextLineIdx);
            }
        }
    }
}

// 3. Update the Partial Dialog buttons
// It has 2 buttons. We replace the specific container
let partialIdx = code.indexOf('onClick={handlePartialRequest}');
if (partialIdx !== -1) {
    let containerIdx = code.lastIndexOf(`<div style={{ display: 'flex', gap: '12px' }}>`, partialIdx);
    if (containerIdx !== -1 && (partialIdx - containerIdx) < 200) {
        code = code.substring(0, containerIdx) + 
               `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>` + 
               code.substring(containerIdx + 46);
    }
}

// 4. In case the user was referring to something in AdminDashboard, wait... they said "عند فتح الطلب", so BranchPanel makes sense.
// Also, let's check CompanyDashboard.tsx if the detailedRequest buttons need similar layout.
// In CompanyDashboard, detailedRequest buttons are already 1fr 1fr grid. I did that before.

fs.writeFileSync('src/pages/BranchPanel.tsx', code);
console.log('Updated BranchPanel button layouts to grid');
