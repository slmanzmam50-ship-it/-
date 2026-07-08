const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const tabsStart = `        <div className="admin-container">
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>`;

const newButton = `        <div className="admin-container">
            <button 
                onClick={() => setIsAdminCreatingRequest(true)}
                style={{ 
                    width: '100%',
                    background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)', 
                    color: 'white', 
                    padding: '16px', 
                    borderRadius: '16px', 
                    border: 'none', 
                    fontWeight: 800, 
                    fontSize: '18px',
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '1.5rem',
                    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)'
                }}
                className="hover-scale tap-effect"
            >
                <PlusCircle size={24} />
                <span>إنشاء طلب جديد لأي شركة</span>
            </button>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>`;

code = code.replace(tabsStart, newButton);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log('Added big create request button to AdminDashboard');
