import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import '../components/Notification.css';

type NotificationType = 'success' | 'error' | 'info' | 'broadcast';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType, sound?: string) => void;
    requestPushPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// VAPID Public Key - You can generate your own using 'web-push generate-vapid-keys'
// This is a placeholder; for production, use a persistent one.
const VAPID_PUBLIC_KEY = 'BJ4_7Xf8A9_Z_5fT_p_5f_q_5f_8_A_9_Z_5fT_p_5f_q_5f_8_A';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { user } = useAuth();

    const showNotification = useCallback((message: string, type: NotificationType = 'info', sound: string = 'default') => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications((prev) => [...prev, { id, message, type }]);

        // Play Sound
        try {
            const audioPath = sound && sound !== 'default' ? `/sounds/${sound}.mp3` : '/sounds/notification.mp3';
            const audio = new Audio(audioPath);
            audio.play().catch(e => console.log('Audio playback failed (interaction required?):', e));
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }

        // Auto-dismiss after 6 seconds for premium feel (longer to read bold text)
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 6000);
    }, []);

    const subscribeUserToPush = async () => {
        if (!('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.ready;

            // Check if subscription already exists
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: VAPID_PUBLIC_KEY
                });
            }

            if (subscription && user) {
                const subJSON = subscription.toJSON();
                const { error } = await (supabase
                    .from('push_subscriptions') as any)
                    .upsert({
                        user_id: user.id,
                        endpoint: subJSON.endpoint,
                        p256dh: subJSON.keys?.p256dh,
                        auth: subJSON.keys?.auth
                    }, { onConflict: 'endpoint' });

                if (error) throw error;
                console.log('Push subscription saved to Supabase');
            }
        } catch (error) {
            console.error('Error subscribing to push:', error);
        }
    };

    const requestPushPermission = async () => {
        if (!('Notification' in window)) return;

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            await subscribeUserToPush();
        }
    };

    // Auto-request push on login/mount if default
    useEffect(() => {
        if (user && 'Notification' in window && Notification.permission === 'granted') {
            subscribeUserToPush();
        }
    }, [user]);

    // Global real-time listener for high-priority alerts
    useEffect(() => {
        if (!user) return;

        console.log('Subscribing to notifications for user:', user.id);
        const channel = supabase
            .channel('global-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload: any) => {
                    console.log('Received notification event:', payload);
                    const { type, content, sound } = payload.new;

                    // Trigger Toast with Sound
                    showNotification(content, type === 'broadcast' ? 'broadcast' : 'success', sound);

                    // ALSO Trigger Native System Notification (When app is open)
                    if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                        navigator.serviceWorker.ready.then(registration => {
                            registration.showNotification("ClassroomX Alert", {
                                body: content,
                                icon: '/pwa-192x192.png',
                                badge: '/pwa-192x192.png',
                                vibrate: [200, 100, 200] as any,
                                data: { url: window.location.origin }
                            } as any);
                        }).catch(err => console.error('SW not ready for local notification:', err));
                    }
                }
            )
            .subscribe((status) => {
                console.log('Supabase notification subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, showNotification]);

    return (
        <NotificationContext.Provider value={{ showNotification, requestPushPermission }}>
            {children}
            {/* Debug Push Button (Only visible if permission is default) */}
            {user && 'Notification' in window && Notification.permission === 'default' && (
                <div style={{ position: 'fixed', bottom: '100px', right: '20px', zIndex: 10000 }}>
                    <button
                        onClick={requestPushPermission}
                        style={{ background: '#3498db', color: 'white', padding: '10px 20px', borderRadius: '30px', border: 'none', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
                    >
                        Enable Device Notifications 🔔
                    </button>
                </div>
            )}
            <div className="notification-container">
                {notifications.map((n) => (
                    <div key={n.id} className={`notification-toast ${n.type} animate-slideUp`}>
                        <div className="notification-icon">
                            {n.type === 'success' && '✅'}
                            {n.type === 'error' && '❌'}
                            {n.type === 'info' && 'ℹ️'}
                            {n.type === 'broadcast' && '📢'}
                        </div>
                        <p className="notification-message">{n.message}</p>
                        <button className="notification-close" onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}>✕</button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
