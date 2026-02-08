import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import '../components/Notification.css';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType, sound?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

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

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 4000);
    }, []);

    // Request browser notification permissions
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

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
                    showNotification(content, type === 'broadcast' ? 'info' : 'success', sound);

                    // Trigger Native Browser Notification via Service Worker (PWA Standard)
                    if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                        navigator.serviceWorker.ready.then(registration => {
                            try {
                                registration.showNotification("ClassroomX Alert", {
                                    body: content,
                                    icon: '/pwa-192x192.png', // Use PWA icon
                                    badge: '/pwa-192x192.png',
                                    tag: 'admin-broadcast',
                                    // @ts-ignore - Standard PWA properties
                                    renotify: true,
                                    requireInteraction: type === 'broadcast',
                                    vibrate: [200, 100, 200, 100, 200],
                                    data: { url: window.location.origin }
                                } as any);
                            } catch (e) {
                                console.error('SW Notification failed, falling back to window.Notification', e);
                                // Fallback
                                new window.Notification("ClassroomX Alert", {
                                    body: content,
                                    icon: '/pwa-192x192.png',
                                    // @ts-ignore
                                    vibrate: [200, 100, 200]
                                } as any);
                            }
                        });
                    } else if ('Notification' in window && Notification.permission === 'granted') {
                        new window.Notification("ClassroomX Alert", {
                            body: content,
                            icon: '/pwa-192x192.png',
                            // @ts-ignore
                            vibrate: [200, 100, 200]
                        } as any);
                    } else {
                        console.log('Skipping native notification. Permission:', Notification.permission);
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
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="notification-container">
                {notifications.map((n) => (
                    <div key={n.id} className={`notification-toast ${n.type} animate-slideUp`}>
                        <span className="notification-icon">
                            {n.type === 'success' && '✅'}
                            {n.type === 'error' && '❌'}
                            {n.type === 'info' && 'ℹ️'}
                        </span>
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
