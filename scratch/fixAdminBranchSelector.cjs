const fs = require('fs');

// Fix AdminDashboard.tsx branch selector hidden part
let adminCode = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// The grep found:
// maxHeight: '200px', overflowY: 'auto',
// Let's replace any maxHeight: '200px' and maxHeight: '280px' that are alongside overflowY: 'auto'
adminCode = adminCode.replace(/maxHeight:\s*'200px',\s*overflowY:\s*'auto',/g, '');
adminCode = adminCode.replace(/maxHeight:\s*'280px',\s*overflowY:\s*'auto',/g, '');
adminCode = adminCode.replace(/maxHeight:\s*'240px',\s*overflowY:\s*'auto',/g, '');

fs.writeFileSync('src/pages/AdminDashboard.tsx', adminCode);
console.log('Fixed AdminDashboard branch selectors');

