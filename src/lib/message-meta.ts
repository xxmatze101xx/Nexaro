/**
 * message-meta.ts
 *
 * Client-side Firestore operations for message metadata (snooze + pin).
 * Stored at: users/{uid}/message_meta/{messageId}
 *
 * Snooze: hides a message from the inbox until snoozedUntil timestamp passes.
 * Pin:    always sorts the message to the top of the inbox.
 */

import { db } from "./firebase";
import {
    collection,
    doc,
    onSnapshot,
    setDoc,
} from "firebase/firestore";

export interface MessageMeta {
    snoozedUntil?: string | null; // ISO-8601 timestamp or null = not snoozed
    pinned?: boolean;
}

/**
 * Subscribe to all message_meta documents for a user.
 * Returns an unsubscribe function.
 */
export function subscribeToMessageMeta(
    uid: string,
    callback: (meta: Record<string, MessageMeta>) => void,
): () => void {
    const ref = collection(db, "users", uid, "message_meta");
    return onSnapshot(
        ref,
        (snap) => {
            const meta: Record<string, MessageMeta> = {};
            snap.forEach((d) => {
                meta[d.id] = d.data() as MessageMeta;
            });
            callback(meta);
        },
        (err) => {
            console.warn("[message-meta] subscription error:", err.message);
        },
    );
}

/** Snooze a message until the given ISO timestamp. */
export async function snoozeMessage(
    uid: string,
    messageId: string,
    snoozedUntil: string,
): Promise<void> {
    const ref = doc(db, "users", uid, "message_meta", messageId);
    await setDoc(ref, { snoozedUntil }, { merge: true });
}

/** Clear snooze (makes the message visible again immediately). */
export async function unsnoozeMessage(
    uid: string,
    messageId: string,
): Promise<void> {
    const ref = doc(db, "users", uid, "message_meta", messageId);
    await setDoc(ref, { snoozedUntil: null }, { merge: true });
}

/** Set or clear the pinned flag for a message. */
export async function togglePin(
    uid: string,
    messageId: string,
    pinned: boolean,
): Promise<void> {
    const ref = doc(db, "users", uid, "message_meta", messageId);
    await setDoc(ref, { pinned }, { merge: true });
}

/** Compute snooze-until timestamps for the standard durations. */
export function snoozeUntil(
    duration: "1h" | "3h" | "tomorrow" | "next-week",
): string {
    const now = new Date();
    switch (duration) {
        case "1h": {
            return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        }
        case "3h": {
            return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
        }
        case "tomorrow": {
            const d = new Date(now);
            d.setDate(d.getDate() + 1);
            d.setHours(8, 0, 0, 0);
            return d.toISOString();
        }
        case "next-week": {
            const d = new Date(now);
            // Move to next Monday
            const day = d.getDay();
            const daysUntilMonday = day === 0 ? 1 : 8 - day;
            d.setDate(d.getDate() + daysUntilMonday);
            d.setHours(8, 0, 0, 0);
            return d.toISOString();
        }
    }
}
