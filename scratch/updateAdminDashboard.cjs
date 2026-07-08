const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Find the branches table header and add username/password columns
code = code.replace(
    /<th style=\{\{\s*textAlign: 'right',\s*padding: '16px',\s*fontSize: '14px',\s*color: 'var\(--text-secondary\)'\s*\}\}>الإجراءات<\/th>/,
    `<th style={{ textAlign: 'right', padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>اسم المستخدم</th>
                                            <th style={{ textAlign: 'right', padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>كلمة المرور</th>
                                            <th style={{ textAlign: 'right', padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>الإجراءات</th>`
);

// Find the branches table body row and add username/password data cells
code = code.replace(
    /<\/div>\s*<\/td>\s*<td style=\{\{\s*padding: '16px'\s*\}\}>\s*<div style=\{\{\s*display: 'flex',/,
    `</div>
                                            </td>
                                            <td style={{ padding: '16px', fontFamily: 'monospace', color: 'var(--primary-color)', fontWeight: 600 }}>{b.username || '-'}</td>
                                            <td style={{ padding: '16px', fontFamily: 'monospace' }}>{b.password || '-'}</td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex',`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log('AdminDashboard.tsx updated');
