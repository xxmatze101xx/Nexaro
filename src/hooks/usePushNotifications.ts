"use client";

/**
 * usePushNotifications
 *
 * Requests browser notification permission, registers the FCM service worker,
 * and stores the FCM token in Firestore (users/{uid}/fcm_tokens/{tokenKey}).
 *
 * Required env vars:
 *   NEXT_PUBLIC_FIREBASE_VAPID_KEY — from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
 *
 * The service worker (public/firebase-messaging-sw.js) receives the Firebase
 * config via postMessage and handles background push notifications.
 */

import { useEffect, useCallback } from "react";
import type { User } from "firebase/auth";
import { db, app } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export function usePushNotifications(user: User | null): void {
    const register = useCallback(async () => {
        if (!user) return;
        if (typeof window === "undefined") return;
        if (!("Notification" in window)) return;
        if (!("serviceWorker" in navigator)) return;

        // Only request if not already granted/denied
        if (Notification.permission === "denied") return;

        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") return;

            // Register the FCM service worker
            const reg = await navigator.serviceWorker.register(
                "/firebase-messaging-sw.js",
                { scope: "/" },
            );
            await navigator.serviceWorker.ready;

            // Send Firebase config to the service worker so it can initialise FCM
            const config = app.options;
            const sw = reg.active ?? reg.installing ?? reg.waiting;
            sw?.postMessage({ type: "FIREBASE_CONFIG", config });

            // Dynamically import Firebase Messaging (client-only)
            const { getMessaging, getToken, onMessage } = await import(
                "firebase/messaging"
            );
            const messaging = getMessaging(app);

            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.warn(
                    "[push] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set. Push notifications will not work.",
                );
                return;
            }

            const token = await getToken(messaging, {
                vapidKey,
                serviceWorkerRegistration: reg,
            });

            if (!token) {
                console.warn("[push] No FCM token received.");
                return;
            }

            // Store token client-side in Firestore
            // Use the last 64 chars as the document ID to stay within Firestore key limits
            const tokenKey = token.length > 64 ? token.slice(-64) : token;
            await setDoc(
                doc(db, "users", user.uid, "fcm_tokens", tokenKey),
                { token, updatedAt: new Date().toISOString() },
            );

            // Handle foreground messages (tab is open and focused)
            onMessage(messaging, (payload) => {
                const title = payload.notification?.title ?? "Nexaro";
                const body = payload.notification?.body;
                if (Notification.permission === "granted") {
                    new Notification(title, {
                        body,
                        icon: "/logo.png",
                    });
                }
            });
        } catch (err) {
            console.warn(
                "[push] registration failed:",
                err instanceof Error ? err.message : String(err),
            );
        }
    }, [user]);

    useEffect(() => {
        register();
    }, [register]);
}
