const fs = require('fs');
const lines = fs.readFileSync('src/pages/CompanyDashboard.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('مشاركة عبر الواتساب'));
if (start !== -1) {
    console.log(lines.slice(start - 20, start + 120).join('\n'));
} else {
    console.log("Not found.");
}
