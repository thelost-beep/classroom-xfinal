import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Heart, MessageCircle, UserPlus, AtSign, X, Check, Sparkles, Send } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import './NotificationHub.css';

interface SocialNotification {
    id: string;
    type: 'like' | 'comment' | 'mention' | 'tag' | 'broadcast' | 'bf_request' | 'bf_accept' | 'collab_request' | 'collab_accept';
    content: string;
    is_read: boolean;
    created_at: string;
    actor_id: string;
    profiles: {
        name: string;
        avatar_url: string | null;
    };
    post_id?: string;
    reference_id?: string;
    processed?: boolean;
}

const NotificationHub: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState<SocialNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { showNotification } = useNotification();

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select(`
                    *,
                    profiles:actor_id (name, avatar_url)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }

        if (!user) return;

        // Real-time subscription
        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    // Fetch actor details for the new notification
                    supabase
                        .from('profiles')
                        .select('name, avatar_url')
                        .eq('id', payload.new.actor_id)
                        .single()
                        .then(({ data }) => {
                            const newNotification: SocialNotification = {
                                ...payload.new,
                                profiles: data || { name: 'System', avatar_url: null }
                            } as any;
                            setNotifications(prev => [newNotification, ...prev].slice(0, 20));
                        });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, user]);

    const handleCollabAction = async (e: React.MouseEvent, notification: any, status: 'accepted' | 'rejected') => {
        e.stopPropagation();
        if (!user) return;
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
                .update({ is_read: true, processed: true })
                .eq('id', notification.id);

            setNotifications(prev => prev.map(n =>
                n.id === notification.id ? { ...n, is_read: true, processed: true } : n
            ));

            showNotification(`Collaboration ${status}! ✨`, 'success');
        } catch (error: any) {
            showNotification(error.message, 'error');
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await (supabase
                .from('notifications') as any)
                .update({ is_read: true })
                .eq('id', id);

            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllRead = async () => {
        if (!user) return;
        try {
            await (supabase
                .from('notifications') as any)
                .update({ is_read: true })
                .eq('user_id', user.id);

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    if (!isOpen) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'like': return <Heart size={16} className="nt-icon like" fill="currentColor" />;
            case 'comment': return <MessageCircle size={16} className="nt-icon comment" />;
            case 'mention': return <AtSign size={16} className="nt-icon mention" />;
            case 'tag':
            case 'bf_request': return <UserPlus size={16} className="nt-icon bf" />;
            case 'bf_accept': return <Heart size={16} className="nt-icon bf" fill="currentColor" />;
            case 'broadcast': return <Sparkles size={16} className="nt-icon broadcast" />;
            case 'collab_request': return <Send size={16} className="nt-icon mention" />;
            case 'collab_accept': return <Check size={16} className="nt-icon comment" />;
            default: return <Bell size={16} />;
        }
    };

    return (
        <div className="notification-hub-overlay" onClick={onClose}>
            <div className="notification-hub-panel shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="hub-header">
                    <h3>Notifications</h3>
                    <div className="hub-actions">
                        <button onClick={markAllRead} title="Mark all as read"><Check size={20} /></button>
                        <button onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                <div className="hub-body">
                    {loading ? (
                        <div className="hub-loading">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="hub-empty">
                            <Bell size={48} />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className={`notification-item ${n.is_read ? 'read' : 'unread'}`} onClick={() => markAsRead(n.id)}>
                                <div className="nt-avatar">
                                    {n.profiles?.avatar_url ? (
                                        <img src={n.profiles.avatar_url} alt={n.profiles.name} />
                                    ) : (
                                        <div className="avatar-placeholder">{n.profiles?.name?.[0].toUpperCase()}</div>
                                    )}
                                    <div className="nt-type-badge">{getIcon(n.type)}</div>
                                </div>
                                <div className="nt-content">
                                    <p>
                                        <span className="nt-user">{n.profiles?.name}</span> {
                                            n.type === 'like' ? 'liked your post' :
                                                n.type === 'comment' ? 'commented on your post' :
                                                    n.type === 'mention' ? 'mentioned you' :
                                                        n.type === 'tag' ? 'tagged you in a post' :
                                                            n.type === 'collab_request' ? 'invited you to collaborate on a post!' :
                                                                n.type === 'collab_accept' ? 'accepted your collaboration invitation' :
                                                                    n.type === 'bf_request' ? 'sent you a bestie request!' :
                                                                        n.content || 'sent a notification'
                                        }
                                    </p>
                                    <span className="nt-time">
                                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {n.type === 'collab_request' && (n as any).processed !== true && (
                                        <div className="nt-actions">
                                            <button className="nt-btn primary" onClick={(e) => handleCollabAction(e, n, 'accepted')}>Accept</button>
                                            <button className="nt-btn outline" onClick={(e) => handleCollabAction(e, n, 'rejected')}>Reject</button>
                                        </div>
                                    )}
                                </div>
                                {!n.is_read && <div className="unread-dot"></div>}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationHub;
