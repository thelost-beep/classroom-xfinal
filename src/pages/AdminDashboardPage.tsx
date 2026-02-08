import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './AdminDashboardPage.css';

const AdminDashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'confessions' | 'users' | 'reports' | 'app_reports'>('confessions');
    const [pendingConfessions, setPendingConfessions] = useState<any[]>([]);
    const [postReports, setPostReports] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [appReports, setAppReports] = useState<any[]>([]);
    const { profile } = useAuth();
    const { showNotification } = useNotification();

    // User Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<'student' | 'teacher' | 'admin'>('student');

    // Create User Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchMessage, setBatchMessage] = useState('');
    const [createEmail, setCreateEmail] = useState('');
    const [createPassword, setCreatePassword] = useState('Class10Memories!');
    const [createName, setCreateName] = useState('');
    const [createRole, setCreateRole] = useState<'student' | 'teacher' | 'admin'>('student');

    // Admin Broadcast State
    const [batchTitle, setBatchTitle] = useState('');
    const [targetRole, setTargetRole] = useState<'all' | 'student' | 'teacher'>('all');
    const [selectedSound, setSelectedSound] = useState('default');

    // Notification Templates
    const NOTIFICATION_TEMPLATES = [
        { id: 'assembly', title: 'Morning Assembly', content: 'Good morning students! Please gather in the main hall for assembly in 5 minutes. 🏫', sound: 'bell' },
        { id: 'lunch', title: 'Lunch Break', content: 'It\'s lunch time! Enjoy your meal and break. 🍎', sound: 'chime' },
        { id: 'exam', title: 'Exam Schedule Update', content: 'New exam schedule has been released. Please check your dashboard. 📝', sound: 'alert' },
        { id: 'holiday', title: 'School Holiday', content: 'School will be closed tomorrow. Enjoy your holiday! 🎉', sound: 'cheerful' },
        { id: 'bus', title: 'Bus Departure', content: 'School buses are departing in 10 minutes. Please hurry! 🚌', sound: 'horn' }
    ];

    const applyTemplate = (templateId: string) => {
        const template = NOTIFICATION_TEMPLATES.find(t => t.id === templateId);
        if (template) {
            setBatchTitle(template.title);
            setBatchMessage(template.content);
            setSelectedSound(template.sound);
        }
    };

    const testSound = (soundName: string) => {
        try {
            const audio = new Audio(`/sounds/${soundName}.mp3`);
            audio.play().catch(e => console.error('Audio test failed:', e));
        } catch (e) {
            console.error('Test sound error:', e);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [confessionsRes, usersRes, reportsRes, appReportsRes] = await Promise.all([
                supabase.from('confessions').select('*, profiles:user_id(name)').eq('status', 'pending'),
                supabase.from('profiles').select('*').order('name', { ascending: true }),
                supabase.from('post_reports').select('*, reporter:reporter_id(name), post:post_id(*, author:user_id(name))').eq('status', 'pending'),
                (supabase.from('app_reports') as any).select('*, profiles:user_id(name, email)').order('created_at', { ascending: false })
            ]);

            setPendingConfessions(confessionsRes.data || []);
            setUsers(usersRes.data || []);
            setPostReports(reportsRes.data || []);
            setAppReports(appReportsRes.data || []);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profile?.role === 'admin') fetchData();
    }, [profile]);

    const approveConfession = async (id: string) => {
        setActionLoading(true);
        try {
            const { error } = await (supabase.from('confessions') as any).update({ status: 'approved' }).eq('id', id);
            if (error) throw error;
            setPendingConfessions(prev => prev.filter(c => c.id !== id));
            showNotification('Confession approved!', 'success');
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally { setActionLoading(false); }
    };

    const rejectConfession = async (id: string) => {
        setActionLoading(true);
        try {
            const { error } = await (supabase.from('confessions') as any).update({ status: 'rejected' }).eq('id', id);
            if (error) throw error;
            setPendingConfessions(prev => prev.filter(c => c.id !== id));
            showNotification('Confession rejected.', 'info');
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally { setActionLoading(false); }
    };

    const dismissReport = async (id: string) => {
        setActionLoading(true);
        try {
            const { error } = await (supabase as any).rpc('admin_resolve_report', {
                report_id: id,
                resolution_action: 'dismiss'
            });

            if (error) throw error;
            setPostReports(prev => prev.filter(r => r.id !== id));
            showNotification('Report dismissed.', 'info');
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally { setActionLoading(false); }
    };

    const deleteReportedPost = async (reportId: string) => {
        if (!window.confirm('Are you sure? This will PERMANENTLY delete the post and all its comments/media. This action will be logged.')) return;
        setActionLoading(true);
        try {
            // Use RPC for transactional delete + audit log
            const { error } = await (supabase as any).rpc('admin_resolve_report', {
                report_id: reportId,
                resolution_action: 'delete_post'
            });

            if (error) throw error;

            setPostReports(prev => prev.filter(r => r.id !== reportId));
            showNotification('Post deleted and action logged.', 'success');
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally { setActionLoading(false); }
    };

    const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
        setActionLoading(true);
        try {
            const { error } = await (supabase
                .from('app_reports') as any)
                .update({ status: newStatus })
                .eq('id', reportId);

            if (error) throw error;

            setAppReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
            showNotification(`Report updated to ${newStatus}!`, 'success');
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const { error } = await (supabase as any).rpc('admin_create_user', {
                user_email: createEmail,
                user_password: createPassword,
                user_name: createName,
                user_role: createRole
            });
            if (error) throw error;
            showNotification('User created successfully! ✨', 'success');
            setShowCreateModal(false);
            setCreateEmail('');
            setCreateName('');
            fetchData();
        } catch (error: any) {
            showNotification(`Error creating user: ${error.message}`, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setActionLoading(true);
        try {
            const { error } = await (supabase as any).rpc('admin_update_user', {
                target_user_id: editingUser.id,
                new_email: newEmail,
                new_role: newRole,
                new_name: newName
            });
            if (error) throw error;
            showNotification('User updated successfully! ✅', 'success');
            setShowEditModal(false);
            fetchData();
        } catch (error: any) {
            showNotification(`Error updating user: ${error.message}`, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBatchNotify = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const { error } = await (supabase.from('admin_broadcasts') as any).insert({
                admin_id: profile?.id,
                title: batchTitle,
                content: batchMessage,
                target_role: targetRole,
                sound: selectedSound
            });

            if (error) throw error;

            showNotification(`Broadcast "${batchTitle}" sent to all ${targetRole}s! 🚀`, 'success');
            setBatchTitle('');
            setBatchMessage('');
            setSelectedSound('default');
            setTargetRole('all');
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setNewEmail(user.email);
        setNewName(user.name);
        setNewRole(user.role);
        setShowEditModal(true);
    };

    if (profile?.role !== 'admin') {
        return (
            <div className="container p-xl text-center">
                <h2>Access Denied</h2>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    if (loading) return <LoadingSpinner fullPage message="Loading Admin Dashboard..." />;

    return (
        <div className="admin-dashboard animate-fadeIn">
            <div className="admin-header">
                <h1>Admin Dashboard</h1>
                <div className="admin-tabs">
                    <button className={`tab-btn ${activeTab === 'confessions' ? 'active' : ''}`} onClick={() => setActiveTab('confessions')}>
                        Confessions ({pendingConfessions.length})
                    </button>
                    <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
                        Reports ({postReports.length})
                    </button>
                    <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                        Users ({users.length})
                    </button>
                    <button className={`tab-btn ${activeTab === 'app_reports' ? 'active' : ''}`} onClick={() => setActiveTab('app_reports')}>
                        App Feedback ({appReports.filter(r => r.status === 'pending').length})
                    </button>
                </div>
            </div>

            <div className="admin-content">
                {activeTab === 'confessions' ? (
                    <section className="moderation-queue card">
                        <h3>Pending Confessions</h3>
                        <div className="queue-list mt-md">
                            {pendingConfessions.length === 0 ? (
                                <p className="text-tertiary">No pending confessions.</p>
                            ) : (
                                pendingConfessions.map((c) => (
                                    <div key={c.id} className="p-md mb-md border-bottom flex justify-between items-center">
                                        <div className="max-w-xl">
                                            <span className="text-xs text-secondary">From: {c.profiles?.name || 'Anonymous'}</span>
                                            <p className="mt-xs">"{c.content}"</p>
                                        </div>
                                        <div className="flex gap-sm">
                                            <button onClick={() => approveConfession(c.id)} className="btn btn-primary btn-sm" disabled={actionLoading}>Approve</button>
                                            <button onClick={() => rejectConfession(c.id)} className="btn btn-secondary btn-sm" disabled={actionLoading}>Reject</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                ) : activeTab === 'reports' ? (
                    <section className="moderation-queue card">
                        <h3>Reported Posts</h3>
                        <div className="queue-list mt-md">
                            {postReports.length === 0 ? (
                                <p className="text-tertiary">No pending reports.</p>
                            ) : (
                                postReports.map((r) => (
                                    <div key={r.id} className="p-md mb-md border-bottom flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-sm mb-xs">
                                                <span className="text-xs font-bold text-error uppercase">⚠️ Reported</span>
                                                <span className="text-xs text-secondary">By: {r.reporter?.name}</span>
                                            </div>
                                            <p className="font-semibold text-sm mb-xs">Reason: "{r.reason}"</p>
                                            <div className="p-sm bg-bg-tertiary rounded-md border text-sm italic text-secondary">
                                                <span className="font-bold text-xs not-italic text-primary block mb-1">Post Content (by {r.post?.author?.name}):</span>
                                                "{r.post?.content?.substring(0, 150)}{r.post?.content?.length > 150 ? '...' : ''}"
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-sm ml-md">
                                            <button onClick={() => deleteReportedPost(r.id)} className="btn btn-primary btn-sm" disabled={actionLoading}>Delete Post</button>
                                            <button onClick={() => dismissReport(r.id)} className="btn btn-secondary btn-sm" disabled={actionLoading}>Dismiss</button>
                                            <button onClick={() => window.open(`/post/${r.post_id}`, '_blank')} className="btn btn-secondary btn-sm text-xs">View Full Post</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                ) : activeTab === 'app_reports' ? (
                    <section className="moderation-queue card">
                        <div className="flex justify-between items-center mb-md">
                            <h3>Bugs & Suggestions</h3>
                            <button className="btn btn-secondary btn-sm" onClick={fetchData}>Refresh</button>
                        </div>
                        <div className="reports-list">
                            {appReports.length === 0 ? (
                                <p className="text-tertiary">No feedback received yet.</p>
                            ) : (
                                <div className="user-table-wrapper">
                                    <table className="user-table">
                                        <thead>
                                            <tr>
                                                <th>Received</th>
                                                <th>User</th>
                                                <th>Type</th>
                                                <th>Title</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {appReports.map((r) => (
                                                <tr key={r.id}>
                                                    <td className="text-xs text-secondary">
                                                        {new Date(r.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold">{r.profiles?.name}</span>
                                                            <span className="text-xs text-tertiary">{r.profiles?.email}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${r.type === 'bug' ? 'badge-error' : 'badge-primary'}`}>
                                                            {r.type}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-xs">
                                                        <div className="font-medium">{r.title}</div>
                                                        <div className="text-xs text-tertiary truncate" title={r.description}>{r.description}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`role-badge ${r.status}`}>
                                                            {r.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="input py-1 text-xs"
                                                            value={r.status}
                                                            onChange={(e) => handleUpdateReportStatus(r.id, e.target.value)}
                                                            disabled={actionLoading}
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="under_review">Reviewing</option>
                                                            <option value="resolved">Resolved</option>
                                                            <option value="dismissed">Dismissed</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>
                ) : (
                    <div className="card">
                        <div className="flex justify-between items-center mb-lg">
                            <h3>User Management</h3>
                            <div className="flex gap-sm">
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowBatchModal(true)}>📢 Batch Notify</button>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>+ Add User</button>
                            </div>
                        </div>
                        <div className="user-table-wrapper">
                            <table className="user-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td className="font-semibold">{u.name}</td>
                                            <td className="text-secondary">{u.email}</td>
                                            <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                                            <td>
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(u)}>Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="modal-overlay">
                    <div className="modal-content card animate-scaleIn">
                        <h3>Edit User</h3>
                        <form onSubmit={handleUpdateUser} className="mt-md">
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" className="input" value={newName} onChange={e => setNewName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" className="input" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select className="input" value={newRole} onChange={e => setNewRole(e.target.value as any)}>
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={actionLoading}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content card animate-scaleIn">
                        <h3>Create New User</h3>
                        <form onSubmit={handleCreateUser} className="mt-md">
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" className="input" value={createName} onChange={e => setCreateName(e.target.value)} required placeholder="Full Name" />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" className="input" value={createEmail} onChange={e => setCreateEmail(e.target.value)} required placeholder="email@example.com" />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input type="text" className="input" value={createPassword} onChange={e => setCreatePassword(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select className="input" value={createRole} onChange={e => setCreateRole(e.target.value as any)}>
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={actionLoading}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Batch Notification Modal */}
            {showBatchModal && (
                <div className="modal-overlay">
                    <div className="modal-content card animate-scaleIn">
                        <h3>Send Admin Broadcast</h3>
                        <p className="text-secondary text-sm mb-md">This will be visible to targeted users on their home feed and notification hub.</p>
                        <form onSubmit={handleBatchNotify}>
                            <div className="form-group">
                                <label>Broadcast Title</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={batchTitle}
                                    onChange={e => setBatchTitle(e.target.value)}
                                    required
                                    placeholder="e.g., Annual Sports Day 2026"
                                />
                            </div>

                            <div className="form-group">
                                <label>Nostalgic Template Gallery</label>
                                <div className="template-grid mt-sm">
                                    {NOTIFICATION_TEMPLATES.map(t => (
                                        <div
                                            key={t.id}
                                            className={`template-card ${batchTitle === t.title ? 'active' : ''}`}
                                            onClick={() => applyTemplate(t.id)}
                                        >
                                            <span className="template-icon">
                                                {t.id === 'assembly' && '🔔'}
                                                {t.id === 'lunch' && '🍎'}
                                                {t.id === 'exam' && '📝'}
                                                {t.id === 'holiday' && '🎉'}
                                                {t.id === 'bus' && '🚌'}
                                            </span>
                                            <span className="template-name">{t.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Target Audience</label>
                                <select className="input" value={targetRole} onChange={e => setTargetRole(e.target.value as any)}>
                                    <option value="all">Everyone</option>
                                    <option value="student">Students Only</option>
                                    <option value="teacher">Teachers Only</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Message Content</label>
                                <textarea
                                    className="input textarea"
                                    value={batchMessage}
                                    onChange={e => setBatchMessage(e.target.value)}
                                    required
                                    placeholder="Type your announcement..."
                                    rows={4}
                                />
                            </div>

                            <div className="form-group">
                                <label className="flex justify-between">
                                    <span>Notification Sound</span>
                                    <button
                                        type="button"
                                        className="text-primary text-xs font-bold"
                                        onClick={() => testSound(selectedSound)}
                                    >
                                        🔊 Test Sound
                                    </button>
                                </label>
                                <select className="input" value={selectedSound} onChange={e => setSelectedSound(e.target.value)}>
                                    <option value="default">Default Notification</option>
                                    <option value="bell">🔔 School Bell</option>
                                    <option value="chime">✨ Chime</option>
                                    <option value="alert">⚠️ Alert</option>
                                    <option value="cheerful">🎉 Cheerful</option>
                                    <option value="horn">🚌 Bus Horn</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={actionLoading}>🚀 Post Broadcast</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboardPage;
