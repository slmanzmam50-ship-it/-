const fs = require('fs');
const lines = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes("إنشاء طلب جديد"));
if(start !== -1) {
    console.log("Found انشاء طلب جديد at line " + start);
    console.log(lines.slice(start - 10, start + 10).join('\n'));
} else {
    console.log("إنشاء طلب جديد not found in AdminDashboard.tsx");
}
