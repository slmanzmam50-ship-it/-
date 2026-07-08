const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

code = code.replace(/import {([^}]+)} from 'lucide-react';/, (match, group1) => {
    if (!group1.includes('PlusCircle')) group1 += ', PlusCircle';
    return `import {${group1}} from 'lucide-react';`;
});

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log('Added PlusCircle import');
