const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyDashboard.tsx', 'utf8');

// The branch selector should be a flex column, not actions-grid
code = code.replace(
    /\{\/\* Branch Selector Chip Grid \*\/\}\s*<div className="actions-grid">/g,
    `{/* Branch Selector Chip Grid */}\n                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>`
);

fs.writeFileSync('src/pages/CompanyDashboard.tsx', code);
console.log("Restored Branch Selector container in CompanyDashboard.tsx");
