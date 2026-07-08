const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyDashboard.tsx', 'utf8');

// The error is because TS is configured to fail on unused locals.
// Let's just remove them.
code = code.replace(', updateServiceRequestStatus', '');
code = code.replace(', Ban', '');

fs.writeFileSync('src/pages/CompanyDashboard.tsx', code);
console.log('Fixed unused imports in CompanyDashboard');
