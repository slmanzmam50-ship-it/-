const fs = require('fs');

function enlarge(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace width: '76px' -> width: '86px'
    content = content.replace(/width: '76px'/g, "width: '86px'");
    
    // Replace height: '76px' -> height: '86px'
    content = content.replace(/height: '76px'/g, "height: '86px'");
    
    // Replace fontSize: '13px' -> fontSize: '14.5px'
    content = content.replace(/fontSize: '13px'/g, "fontSize: '14.5px'");

    // Replace size={42} -> size={46}
    content = content.replace(/size=\{42\}/g, "size={46}");

    fs.writeFileSync(filePath, content);
    console.log(filePath + ' updated');
}

enlarge('src/pages/CompanyDashboard.tsx');
enlarge('src/pages/BranchPanel.tsx');
enlarge('src/pages/AdminDashboard.tsx');
