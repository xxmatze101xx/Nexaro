/**
 * sync/state.ts
 * Firestore CRUD for SyncState.
 * Stores sync cursors at: users/{uid}/sync/{service}
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SyncState, SyncService } from "./types";

/**
 * Reads the persisted sync state for a service.
 * Returns null if no sync has ever run for this service.
 */
export async function getSyncState(
    uid: string,
    service: SyncService,
): Promise<SyncState | null> {
    if (!uid) return null;
    try {
        const ref = doc(db, "users", uid, "sync", service);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return snap.data() as SyncState;
    } catch (e: unknown) {
        console.warn(`[sync/state] getSyncState failed (${service}):`, e instanceof Error ? e.message : String(e));
        return null;
    }
}

/**
 * Persists partial sync state (merge semantics — only provided fields are updated).
 */
export async function saveSyncState(
    uid: string,
    state: Partial<SyncState> & { service: SyncService },
): Promise<void> {
    if (!uid) return;
    try {
        const ref = doc(db, "users", uid, "sync", state.service);
        await setDoc(ref, { ...state, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e: unknown) {
        console.warn(`[sync/state] saveSyncState failed (${state.service}):`, e instanceof Error ? e.message : String(e));
    }
}
