const fs = require('fs');
const lines = fs.readFileSync('src/pages/CompanyDashboard.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('multiple') && l.includes('targetBranchIds'));
console.log(lines.slice(start - 20, start + 30).join('\n'));
