import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import './NotificationsPage.css';

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { user } = useAuth();
    const { showNotification } = useNotification();

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const { data, error } = await (supabase
                .from('notifications') as any)
                .select(`
          *,
          processed,
          actor:actor_id(name, avatar_url)
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data || []);

            // Mark all as read
            if (data && data.some((n: any) => !n.is_read)) {
                await (supabase
                    .from('notifications') as any)
                    .update({ is_read: true })
                    .eq('user_id', user.id)
                    .eq('is_read', false);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchNotifications();
    }, [user]);

    const getNotificationText = (n: any) => {
        switch (n.type) {
            case 'like': return 'liked your post';
            case 'comment': return 'commented on your post';
            case 'tag': return 'tagged you in a post';
            case 'collab_request': return 'invited you to collaborate on a post';
            case 'collab_accept': return 'accepted your collaboration invitation';
            default: return 'sent you a notification';
        }
    };

    const handleCollabAction = async (notification: any, status: 'accepted' | 'rejected') => {
        if (!user) return;
        setActionLoading(notification.id);
        try {
            const { error: collabError } = await (supabase
                .from('post_collaborations') as any)
                .update({ status })
                .eq('post_id', notification.reference_id)
                .eq('collaborator_id', user.id);

            if (collabError) throw collabError;

            // Mark notification as processed
            await (supabase
                .from('notifications') as any)
                .update({
                    is_read: true,
                    processed: true
                })
                .eq('id', notification.id);

            setNotifications(prev => prev.map(n =>
                n.id === notification.id ? { ...n, is_read: true, processed: true } : n
            ));

            showNotification(`Collaboration ${status}! ✨`, 'success');
            fetchNotifications();
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="notifications-page animate-fadeIn">
            <div className="notifications-header">
                <h1>Notifications</h1>
            </div>

            {loading ? (
                <div className="flex justify-center p-xl">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="notifications-list card mt-lg">
                    {notifications.length === 0 ? (
                        <p className="empty-msg">No notifications yet.</p>
                    ) : (
                        notifications.map((n) => (
                            <div key={n.id} className={`notification-item ${n.is_read ? 'read' : 'unread'}`}>
                                <div className="actor-avatar">
                                    {n.actor?.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="notification-content">
                                    <p>
                                        <span className="font-semibold">{n.actor?.name}</span> {getNotificationText(n)}
                                    </p>
                                    <span className="text-xs text-tertiary">
                                        {new Date(n.created_at).toLocaleDateString()}
                                    </span>
                                    {n.type === 'collab_request' && n.processed !== true && (
                                        <div className="notification-actions mt-sm">
                                            <button
                                                className="btn-xs primary"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleCollabAction(n, 'accepted');
                                                }}
                                                disabled={actionLoading === n.id}
                                            >
                                                {actionLoading === n.id ? '...' : 'Accept'}
                                            </button>
                                            <button
                                                className="btn-xs outline"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleCollabAction(n, 'rejected');
                                                }}
                                                disabled={actionLoading === n.id}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {!n.is_read && <div className="unread-dot"></div>}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
