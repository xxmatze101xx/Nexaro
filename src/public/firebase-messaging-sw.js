/* eslint-disable */
/**
 * firebase-messaging-sw.js
 *
 * Firebase Cloud Messaging service worker.
 * Receives Firebase config from the main thread via postMessage,
 * then handles background push notifications.
 *
 * Registration: the usePushNotifications hook handles registration and
 * sends the config via postMessage({ type: 'FIREBASE_CONFIG', config }).
 */

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

let messaging = null;

// Receive Firebase config from the main thread after registration.
self.addEventListener("message", (event) => {
    if (event.data?.type === "FIREBASE_CONFIG" && !messaging) {
        try {
            firebase.initializeApp(event.data.config);
            messaging = firebase.messaging();

            messaging.onBackgroundMessage((payload) => {
                const title = payload.notification?.title ?? "Nexaro";
                const body = payload.notification?.body ?? "Neue Nachricht";
                const icon = payload.notification?.icon ?? "/logo.png";

                self.registration.showNotification(title, {
                    body,
                    icon,
                    badge: "/logo.png",
                    tag: payload.data?.messageId ?? "nexaro-notification",
                    data: payload.data,
                });
            });
        } catch (err) {
            console.error("[nexaro-sw] Firebase init failed:", err);
        }
    }
});

// Handle notification click — open or focus the Nexaro tab.
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((windowClients) => {
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin) && "focus" in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow("/");
                }
            }),
    );
});
