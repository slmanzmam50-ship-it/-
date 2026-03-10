import React, { useState, useEffect } from 'react';
import { getBranches, addBranch, updateBranch, deleteBranch } from '../services/storage';
import type { Branch } from '../types';
import BranchForm from '../components/BranchForm';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | undefined>(undefined);

    useEffect(() => {
        setBranches(getBranches());
    }, []);

    const handleSaveBranch = (branchData: Omit<Branch, 'id'> | Branch) => {
        if ('id' in branchData) {
            updateBranch(branchData as Branch);
        } else {
            addBranch(branchData);
        }
        setBranches(getBranches());
        setIsFormOpen(false);
        setEditingBranch(undefined);
    };

    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
            deleteBranch(id);
            setBranches(getBranches());
        }
    };

    const openNewForm = () => {
        setEditingBranch(undefined);
        setIsFormOpen(true);
    };

    const totalBranches = branches.length;
    const openBranches = branches.filter(b => b.status === 'مفتوح').length;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>لوحة إدارة الفروع</h1>
                <button
                    onClick={openNewForm}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'var(--primary-color)', color: 'white',
                        padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)',
                        border: 'none', fontWeight: 700
                    }}
                >
                    <Plus size={20} /> إضافة فرع جديد
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)' }}>إجمالي الفروع</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{totalBranches}</p>
                </div>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)' }}>الفروع المفتوحة حالياً</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--success)' }}>{openBranches}</p>
                </div>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)' }}>الفروع المغلقة</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--error)' }}>{totalBranches - openBranches}</p>
                </div>
            </div>

            <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                                <th style={{ padding: '1rem' }}>الاسم</th>
                                <th style={{ padding: '1rem' }}>التصنيف</th>
                                <th style={{ padding: '1rem' }}>الحالة</th>
                                <th style={{ padding: '1rem' }}>أوقات العمل</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branches.map(branch => (
                                <tr key={branch.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{branch.name}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{branch.category}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600,
                                            background: branch.status === 'مفتوح' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: branch.status === 'مفتوح' ? 'var(--success)' : 'var(--error)'
                                        }}>
                                            {branch.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{branch.workingHours.start} - {branch.workingHours.end}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <button onClick={() => handleEdit(branch)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', marginRight: '10px' }} title="تعديل">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(branch.id)} style={{ background: 'none', border: 'none', color: 'var(--error)' }} title="حذف">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {branches.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        لا توجد فروع مضافة حالياً.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isFormOpen && (
                <BranchForm
                    branch={editingBranch}
                    onSave={handleSaveBranch}
                    onClose={() => setIsFormOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
