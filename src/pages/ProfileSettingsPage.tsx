import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { compressImage } from '../utils/imageCompression';
import {
    User,
    Lock,
    Shield,
    Camera,
    AtSign,
    Phone,
    Calendar,
    MapPin,
    Briefcase,
    Save,
    LogOut,
    Eye,
    EyeOff,
    CheckCircle2,
    Sparkles,
    Image as ImageIcon,
    Bug,
    LifeBuoy
} from 'lucide-react';
import './ProfileSettingsPage.css';

const ProfileSettingsPage: React.FC = () => {
    const { user, profile, updateProfile, updatePassword, signOut } = useAuth();
    const { showNotification } = useNotification();
    const { theme, setTheme } = useTheme();

    // Form States
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [hometown, setHometown] = useState('');
    const [dreamJob, setDreamJob] = useState('');
    const [dob, setDob] = useState('');
    const [currentStatus, setCurrentStatus] = useState('');

    // Social & Privacy States
    const [privacy, setPrivacy] = useState<any>({
        show_email: true,
        show_phone: false,
        show_birthday: true,
        show_socials: true
    });
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<'info' | 'socials' | 'account' | 'support'>('info');

    // Report States
    const [reportType, setReportType] = useState<'bug' | 'suggestion'>('bug');
    const [reportTitle, setReportTitle] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);

    const fetchSettings = async () => {
        if (!user) return;
        const { data, error } = await (supabase
            .from('user_settings') as any)
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (data && !error) {
            setTheme(data.theme as any || 'light');
            setNotificationsEnabled(data.notifications_enabled !== false);
            document.documentElement.setAttribute('data-theme', data.theme || 'light');
        }
    };


    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            setBio(profile.bio || '');
            setHometown(profile.hometown || '');
            setDreamJob(profile.dream_job || '');
            setDob(profile.dob || '');
            setCurrentStatus((profile as any).current_status || '');
            setPrivacy(profile.privacy_settings || {
                show_email: true,
                show_phone: false,
                show_birthday: true,
                show_socials: true
            });
            setPrivacy(profile.privacy_settings || {
                show_email: true,
                show_phone: false,
                show_birthday: true,
                show_socials: true
            });
            fetchSettings();
        }
    }, [profile]);

    const handleUpdateSettings = async (updates: any) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('user_settings')
                .upsert({ user_id: user.id, ...updates });
            if (error) throw error;
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await updateProfile({
                name,
                bio,
                hometown,
                dream_job: dreamJob,
                dob,
                current_status: currentStatus,
                privacy_settings: privacy
            } as any);
            if (error) throw error;
            showNotification('Profile updated successfully! ✨', 'success');
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setLoading(true);
        try {
            // Compress avatar before upload
            const compressedFile = await compressImage(file, 400, 0.7); // Small size for avatars

            const fileExt = compressedFile.name.split('.').pop();
            const filePath = `${user.id}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await (supabase.storage as any)
                .from('avatars')
                .upload(filePath, compressedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = (supabase.storage as any)
                .from('avatars')
                .getPublicUrl(filePath);

            await updateProfile({ avatar_url: publicUrl });
            showNotification('Avatar updated! 📸', 'success');
        } catch (error: any) {
            showNotification(`Upload failed: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setLoading(true);
        try {
            // Compress banner before upload
            const compressedFile = await compressImage(file, 1500, 0.82);

            const fileExt = compressedFile.name.split('.').pop();
            const filePath = `${user.id}/banner-${Math.random()}.${fileExt}`;

            const { error: uploadError } = await (supabase.storage as any)
                .from('avatars')
                .upload(filePath, compressedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = (supabase.storage as any)
                .from('avatars')
                .getPublicUrl(filePath);

            await updateProfile({ banner_url: publicUrl });
            showNotification('Banner updated! 🎨', 'success');
        } catch (error: any) {
            showNotification(`Banner upload failed: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setReportSubmitting(true);
        try {
            const { error } = await (supabase
                .from('app_reports') as any)
                .insert({
                    user_id: user.id,
                    type: reportType,
                    title: reportTitle,
                    description: reportDescription,
                    status: 'pending'
                });

            if (error) throw error;

            showNotification('Thank you! Your report has been submitted. 💌', 'success');
            setReportTitle('');
            setReportDescription('');
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setReportSubmitting(false);
        }
    };

    return (
        <div className="settings-page animate-fadeInUp">
            <div className="settings-header">
                <h1>Settings</h1>
                <p className="text-secondary">Personalize your ClassroomX experience.</p>
            </div>

            <div className="settings-container">
                <div className="settings-tabs">
                    <button className={`settings-tab-btn ${activeSection === 'info' ? 'active' : ''}`} onClick={() => setActiveSection('info')}>
                        <User size={18} /> Profile
                    </button>
                    <button className={`settings-tab-btn ${activeSection === 'socials' ? 'active' : ''}`} onClick={() => setActiveSection('socials')}>
                        <Shield size={18} /> Social & Privacy
                    </button>
                    <button className={`settings-tab-btn ${activeSection === 'account' ? 'active' : ''}`} onClick={() => setActiveSection('account')}>
                        <Lock size={18} /> Security
                    </button>
                    <button className={`settings-tab-btn ${activeSection === 'support' ? 'active' : ''}`} onClick={() => setActiveSection('support')}>
                        <LifeBuoy size={18} /> Support
                    </button>
                </div>

                <div className="settings-content card">
                    {activeSection === 'info' && (
                        <div className="settings-section">
                            <div className="section-title">
                                <User size={20} className="text-primary" />
                                <h3>Basic Information</h3>
                            </div>

                            <div className="settings-card">
                                <h3 className="section-title">Visual Identity</h3>

                                <div className="profile-images-settings">
                                    <div className="banner-settings">
                                        <div className="banner-preview-container">
                                            {profile?.banner_url ? (
                                                <img src={profile.banner_url} alt="Profile Banner" className="banner-preview" />
                                            ) : (
                                                <div className="banner-placeholder">
                                                    <ImageIcon size={32} />
                                                    <span>No banner set</span>
                                                </div>
                                            )}
                                            <label className="banner-upload-btn">
                                                <Camera size={20} />
                                                <span>Change Banner</span>
                                                <input type="file" hidden accept="image/*" onChange={handleBannerUpload} disabled={loading} />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="avatar-settings mt-xl">
                                        <div className="avatar-preview-container">
                                            <div className="avatar-preview squircle">
                                                {profile?.avatar_url ? (
                                                    <img src={profile.avatar_url} alt={profile.name} />
                                                ) : (
                                                    <span>{profile?.name?.[0]?.toUpperCase()}</span>
                                                )}
                                                <label className="avatar-upload-overlay">
                                                    <Camera size={24} />
                                                    <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={loading} />
                                                </label>
                                            </div>
                                            <div className="avatar-info">
                                                <h4>Profile Picture</h4>
                                                <p>Upload a high-quality squircle avatar</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="settings-form">
                                <div className="form-grid mt-xl">
                                    <div className="form-group">
                                        <label><User size={14} /> Full Name</label>
                                        <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <label><AtSign size={14} /> Email Address</label>
                                        <input type="email" className="input" value={user?.email} disabled title="Email cannot be changed" />
                                    </div>
                                    <div className="form-group">
                                        <label><MapPin size={14} /> Hometown</label>
                                        <input type="text" className="input" value={hometown} onChange={e => setHometown(e.target.value)} placeholder="Where are you from?" />
                                    </div>
                                    <div className="form-group">
                                        <label><Briefcase size={14} /> Dream Job</label>
                                        <input type="text" className="input" value={dreamJob} onChange={e => setDreamJob(e.target.value)} placeholder="What's your goal?" />
                                    </div>
                                    <div className="form-group">
                                        <label><Calendar size={14} /> Date of Birth</label>
                                        <input type="date" className="input" value={dob} onChange={e => setDob(e.target.value)} />
                                    </div>
                                    <div className="form-group full-width">
                                        <label><MapPin size={14} /> Right Now (Current Status)</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={currentStatus}
                                            onChange={e => setCurrentStatus(e.target.value)}
                                            placeholder="What are you doing today? (e.g., Drinking tea ☕)"
                                        />
                                    </div>
                                </div>

                                <div className="form-group mt-md">
                                    <label>Bio</label>
                                    <textarea className="input textarea" value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." />
                                </div>

                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeSection === 'socials' && (
                        <div className="settings-section">
                            <div className="mb-xl">
                                <div className="section-title">
                                    <CheckCircle2 size={20} className="text-secondary" />
                                    <h3>Besties Management</h3>
                                </div>
                                <p className="text-sm text-tertiary mb-md">Manage your closest connections on ClassroomX.</p>

                                <div className="bf-info-card">
                                    <Sparkles size={24} className="text-primary" />
                                    <div>
                                        <h4>Unlocking Bestie Perks</h4>
                                        <p>Go to your classmates' profiles to send them a Bestie request. Once they accept, they'll appear here and be able to see your private memories.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-xl pt-xl border-top">
                                <div className="section-title">
                                    <Shield size={20} className="text-primary" />
                                    <h3>Privacy & Display</h3>
                                </div>
                                <div className="privacy-toggles">
                                    <label className="toggle-item">
                                        <div className="toggle-label">
                                            <AtSign size={16} />
                                            <span>Show Email on Profile</span>
                                        </div>
                                        <input type="checkbox" checked={privacy.show_email} onChange={e => setPrivacy({ ...privacy, show_email: e.target.checked })} />
                                    </label>
                                    <label className="toggle-item">
                                        <div className="toggle-label">
                                            <Phone size={16} />
                                            <span>Show Phone on Profile</span>
                                        </div>
                                        <input type="checkbox" checked={privacy.show_phone} onChange={e => setPrivacy({ ...privacy, show_phone: e.target.checked })} />
                                    </label>
                                    <label className="toggle-item">
                                        <div className="toggle-label">
                                            <Calendar size={16} />
                                            <span>Show Birthday on Profile</span>
                                        </div>
                                        <input type="checkbox" checked={privacy.show_birthday} onChange={e => setPrivacy({ ...privacy, show_birthday: e.target.checked })} />
                                    </label>
                                </div>

                                <h3 className="mt-xl text-lg mb-md">App Preferences</h3>
                                <div className="privacy-toggles">
                                    <label className="toggle-item">
                                        <span>Dark Mode Appearance</span>
                                        <input
                                            type="checkbox"
                                            checked={theme === 'dark'}
                                            onChange={e => setTheme(e.target.checked ? 'dark' : 'light')}
                                        />
                                    </label>
                                    <label className="toggle-item">
                                        <span>Push Notifications</span>
                                        <input
                                            type="checkbox"
                                            checked={notificationsEnabled}
                                            onChange={e => {
                                                setNotificationsEnabled(e.target.checked);
                                                handleUpdateSettings({ notifications_enabled: e.target.checked });
                                            }}
                                        />
                                    </label>
                                </div>
                                <button onClick={handleUpdateProfile} className="btn btn-primary mt-lg" disabled={loading}>
                                    <Save size={18} /> Save Settings
                                </button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'account' && (
                        <div className="settings-section">
                            <div className="security-banner">
                                <Lock size={40} className="security-icon" />
                                <div className="security-text">
                                    <h3>Security Center</h3>
                                    <p>Keep your account safe by updating your password regularly.</p>
                                </div>
                            </div>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (newPassword !== confirmPassword) return showNotification('Passwords do not match', 'error');
                                setLoading(true);
                                const { error } = await updatePassword(newPassword);
                                setLoading(false);
                                if (!error) {
                                    showNotification('Password updated successfully! 🔐', 'success');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                } else {
                                    showNotification(error.message, 'error');
                                }
                            }} className="security-form">
                                <div className="form-group">
                                    <label>New Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showPass ? "text" : "password"}
                                            className="input"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            placeholder="Min. 6 characters"
                                        />
                                        <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        className="input"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="Repeat new password"
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                                    {loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>

                            <div className="danger-zone">
                                <h3>Danger Zone</h3>
                                <p>Once you logout, you'll need your credentials to get back in.</p>
                                <button onClick={() => signOut()} className="btn btn-secondary w-full text-error border-error-hover mt-md">
                                    <LogOut size={18} /> Logout from ClassroomX
                                </button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'support' && (
                        <div className="settings-section">
                            <div className="support-banner">
                                <LifeBuoy size={40} className="security-icon" />
                                <div className="security-text">
                                    <h3>Help & Feedback</h3>
                                    <p>Found a bug or have an idea? We'd love to hear from you!</p>
                                </div>
                            </div>

                            <div className="support-grid mt-lg">
                                <div className="support-info-card">
                                    <div className="flex items-center gap-sm mb-sm text-primary">
                                        <Bug size={20} />
                                        <h4 className="font-bold">Report a Bug</h4>
                                    </div>
                                    <p className="text-sm text-secondary">Is something not working as expected? Tell us what happened and we'll fix it.</p>
                                </div>
                                <div className="support-info-card">
                                    <div className="flex items-center gap-sm mb-sm text-secondary">
                                        <Sparkles size={20} />
                                        <h4 className="font-bold">Suggestion</h4>
                                    </div>
                                    <p className="text-sm text-secondary">Have a dream feature? We base our updates on your nostalgic ideas.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmitReport} className="report-form mt-xl">
                                <div className="form-group">
                                    <label>Feedback Type</label>
                                    <div className="report-type-selector">
                                        <button
                                            type="button"
                                            className={`type-btn ${reportType === 'bug' ? 'active bug' : ''}`}
                                            onClick={() => setReportType('bug')}
                                        >
                                            <Bug size={16} /> Bug Report
                                        </button>
                                        <button
                                            type="button"
                                            className={`type-btn ${reportType === 'suggestion' ? 'active suggestion' : ''}`}
                                            onClick={() => setReportType('suggestion')}
                                        >
                                            <Sparkles size={16} /> Suggestion
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Title</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder={reportType === 'bug' ? "What went wrong?" : "What's your idea?"}
                                        value={reportTitle}
                                        onChange={e => setReportTitle(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Detailed Description</label>
                                    <textarea
                                        className="input textarea"
                                        rows={4}
                                        placeholder={reportType === 'bug' ? "Steps to reproduce, what you expected vs what happened..." : "Describe your suggestion in detail..."}
                                        value={reportDescription}
                                        onChange={e => setReportDescription(e.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary w-full" disabled={reportSubmitting}>
                                    {reportSubmitting ? 'Sending...' : 'Submit Feedback'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileSettingsPage;
