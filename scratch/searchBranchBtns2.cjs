const fs = require('fs');
const lines = fs.readFileSync('src/pages/BranchPanel.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('تأكيد اكتمال الطلب'));
if (start !== -1) {
    console.log(lines.slice(start - 20, start + 50).join('\n'));
} else {
    console.log("Not found.");
}
