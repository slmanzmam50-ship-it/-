const fs = require('fs');
const lines = fs.readFileSync('src/pages/CompanyDashboard.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes("activeTab === 'create'"));
console.log(lines.slice(start, start + 100).join('\n'));
