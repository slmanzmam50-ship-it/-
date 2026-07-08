const fs = require('fs');

// 1. Add CSS class to index.css
let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('.actions-grid')) {
    css += `\n
.actions-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 12px !important;
    width: 100% !important;
    margin-top: 12px !important;
}
.actions-grid > * {
    width: 100% !important;
    margin: 0 !important;
    grid-column: auto !important;
}
.actions-grid > *:last-child:nth-child(odd) {
    grid-column: 1 / -1 !important;
}
\n`;
    fs.writeFileSync('src/index.css', css);
    console.log("Added .actions-grid to index.css");
}

function applyGridClass(file) {
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');
    
    // Replace the hardcoded grid style with the className
    code = code.replace(/<div style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr 1fr',\s*gap:\s*'(10px|12px)'(?:,\s*marginTop:\s*'8px')?\s*\}\}>/g, '<div className="actions-grid">');
    
    // Also catch flex columns that might still exist!
    code = code.replace(/<div style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*'10px'\s*\}\}>/g, '<div className="actions-grid">');

    // Remove any hardcoded gridColumn from the delete button, since CSS will handle it!
    code = code.replace(/gridColumn:\s*'1 \/ -1',\s*/g, '');

    fs.writeFileSync(file, code);
    console.log("Applied to " + file);
}

applyGridClass('src/pages/CompanyDashboard.tsx');
applyGridClass('src/pages/AdminDashboard.tsx');
applyGridClass('src/pages/BranchPanel.tsx');

