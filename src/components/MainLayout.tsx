import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import NotificationHub from './NotificationHub';
import {
    Home,
    Search,
    PlusSquare,
    MessageCircle,
    User as UserIcon,
    Settings,
    Shield,
    LogOut,
    Bell
} from 'lucide-react';
import './MainLayout.css';

const MainLayout: React.FC = () => {
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Check if current page should be full screen on mobile (hide nav/header)
    const isFullScreenPage = /^\/chat\/.+/.test(location.pathname) || /^\/post\/.+/.test(location.pathname);

    useEffect(() => {
        if (!user) return;

        const fetchUnreadCount = async () => {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (!error) setUnreadCount(count || 0);
        };

        fetchUnreadCount();

        const channel = supabase.channel('notification-count')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchUnreadCount())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const navLinks = [
        { to: '/', icon: <Home size={24} />, label: 'Home' },
        { to: '/explore', icon: <Search size={24} />, label: 'Explore' },
        { to: '/create-post', icon: <PlusSquare size={24} />, label: 'Create', special: true },
        { to: '/chat', icon: <MessageCircle size={24} />, label: 'Chat' },
        { to: `/profile/${user?.id}`, icon: <UserIcon size={24} />, label: 'Profile' },
    ];

    return (
        <div className={`main-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Desktop Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    {!isCollapsed && <h1 className="logo-text">ClassroomX</h1>}
                    <button
                        className="sidebar-toggle"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        {isCollapsed ? <PlusSquare size={20} style={{ transform: 'rotate(45deg)' }} /> : <PlusSquare size={20} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navLinks.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${item.special ? 'create-btn' : ''}`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {!isCollapsed && <span className="nav-label">{item.label}</span>}
                        </NavLink>
                    ))}

                    <div className="nav-group">
                        <button
                            onClick={() => setIsHubOpen(true)}
                            className="nav-item hub-trigger"
                            title={isCollapsed ? "Notifications" : undefined}
                        >
                            <span className="nav-icon relative">
                                <Bell size={22} />
                                {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
                            </span>
                            {!isCollapsed && <span className="nav-label">Notifications</span>}
                        </button>
                        <NavLink
                            to="/settings"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            title={isCollapsed ? "Settings" : undefined}
                        >
                            <span className="nav-icon"><Settings size={22} /></span>
                            {!isCollapsed && <span className="nav-label">Settings</span>}
                        </NavLink>
                        {profile?.role === 'admin' && (
                            <NavLink
                                to="/admin"
                                className={({ isActive }) => `nav-item admin-nav ${isActive ? 'active' : ''}`}
                                title={isCollapsed ? "Admin" : undefined}
                            >
                                <span className="nav-icon"><Shield size={22} /></span>
                                {!isCollapsed && <span className="nav-label">Admin</span>}
                            </NavLink>
                        )}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.name} className="avatar-img" />
                            ) : (
                                profile?.name?.[0]?.toUpperCase() || 'U'
                            )}
                        </div>
                        <div className="user-info">
                            {!isCollapsed && <span className="user-name">{profile?.name.split(' ')[0]}</span>}
                            <button onClick={handleSignOut} className="sign-out-btn" title="Logout">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <main className={`main-content ${isFullScreenPage ? 'fullscreen' : ''}`}>
                {!isFullScreenPage && (
                    <header className="mobile-header">
                        <h1 className="logo-text">ClassroomX</h1>
                        <div className="header-actions">
                            <button onClick={() => setIsHubOpen(true)} className="header-icon-btn relative">
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="unread-badge-mobile">{unreadCount}</span>}
                            </button>
                            {profile?.role === 'admin' && (
                                <NavLink to="/admin" className="header-icon-btn"><Shield size={20} /></NavLink>
                            )}
                            <NavLink to="/settings" className="header-icon-btn"><Settings size={20} /></NavLink>
                        </div>
                    </header>
                )}

                <div className={`content-inner ${isFullScreenPage ? 'fullscreen-mode' : ''}`}>
                    <Outlet />
                </div>

                {/* Bottom Navigation */}
                {!isFullScreenPage && (
                    <nav className="mobile-bottom-nav">
                        {navLinks.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === '/'}
                                className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''} ${item.special ? 'create-btn-mobile' : ''}`}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-text">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                )}
            </main>

            <NotificationHub
                isOpen={isHubOpen}
                onClose={() => setIsHubOpen(false)}
            />
        </div>
    );
};

export default MainLayout;
