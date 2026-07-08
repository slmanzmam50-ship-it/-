const fs = require('fs');
const lines = fs.readFileSync('src/pages/BranchPanel.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('handleUpdateStatus(selectedRequest.id, \'completed\')'));
if (start !== -1) {
    console.log(lines.slice(start - 20, start + 30).join('\n'));
} else {
    console.log("Not found.");
}
