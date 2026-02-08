/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push Received.');
    console.log(`[Service Worker] Push had this data: "${event.data?.text()}"`);

    let data = { title: 'ClassroomX', body: 'New notification!', icon: '/pwa-192x192.png' };

    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.warn('Push data was not JSON:', event.data?.text());
        if (event.data) {
            data.body = event.data.text();
        }
    }

    const title = data.title || 'ClassroomX';
    const options: NotificationOptions = {
        body: data.body,
        icon: data.icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200, 100, 200],
        data: {
            url: self.location.origin
        },
        actions: [
            { action: 'open', title: 'Open App' }
        ]
    };

    event.waitUntil(self.registration.showNotification(title, options as any));
});

self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return self.clients.openWindow('/');
        })
    );
});
