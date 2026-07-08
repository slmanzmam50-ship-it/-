const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyDashboard.tsx', 'utf8');

// 1. Revert the Branch Selector Grid
// We look for "{/* Branch Selector Chip Grid */}" and the next line
const branchSelectorComment = "{/* Branch Selector Chip Grid */}";
const branchSelectorIdx = code.indexOf(branchSelectorComment);
if (branchSelectorIdx !== -1) {
    const start = code.indexOf('<div', branchSelectorIdx);
    const end = code.indexOf('>', start);
    const divTag = code.substring(start, end + 1);
    console.log("Found Branch Selector div: " + divTag);
    
    if (divTag.includes('gridTemplateColumns')) {
        const newDivTag = `<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>`;
        code = code.substring(0, start) + newDivTag + code.substring(end + 1);
        console.log("Reverted Branch Selector div");
    }
}

// 2. Make the buttons container a grid
// The buttons container is right after the detailedRequest info block
const infoBlockEnd = `                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '14.5px' }}>تاريخ الإنشاء:</span>
                                <span style={{ fontSize: '12.5px' }}>{new Date(detailedRequest.createdAt).toLocaleString('ar-SA')}</span>
                            </div>
                        </div>`;

const infoBlockIdx = code.indexOf(infoBlockEnd);
if (infoBlockIdx !== -1) {
    const buttonsContainerStart = code.indexOf('<div', infoBlockIdx + infoBlockEnd.length);
    const buttonsContainerEnd = code.indexOf('>', buttonsContainerStart);
    const buttonsDivTag = code.substring(buttonsContainerStart, buttonsContainerEnd + 1);
    console.log("Found Buttons container div: " + buttonsDivTag);
    
    if (buttonsDivTag.includes('flexDirection')) {
        const newDivTag = `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>`;
        code = code.substring(0, buttonsContainerStart) + newDivTag + code.substring(buttonsContainerEnd + 1);
        console.log("Changed Buttons container to grid");
    }
}

fs.writeFileSync('src/pages/CompanyDashboard.tsx', code);
