const fs = require('fs');
const lines = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('<h1>بوابة الإدارة</h1>'));
if (start !== -1) {
    console.log(lines.slice(start - 10, start + 10).join('\n'));
} else {
    console.log("Not found.");
}
