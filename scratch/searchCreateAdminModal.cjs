const fs = require('fs');
const lines = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('isAdminCreatingRequest && ('));
if (start !== -1) {
    console.log(lines.slice(start, start + 30).join('\n'));
} else {
    console.log("Not found.");
}
