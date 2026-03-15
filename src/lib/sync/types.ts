/**
 * sync/types.ts
 * Core types for the Nexaro Integration Sync Engine.
 */

import type { UnifiedMessage } from "@/lib/normalizers/types";

export type SyncMode = "initial" | "incremental";
export type SyncStatus = "idle" | "syncing" | "error";
export type SyncService = "gmail" | "slack" | "teams" | "outlook";

/**
 * Persisted to Firestore: users/{uid}/sync/{service}
 * Tracks the cursor position for incremental sync so sessions can resume.
 */
export interface SyncState {
    service: SyncService;
    status: SyncStatus;
    /** ISO-8601 timestamp of last successful sync */
    lastSyncAt: string | null;
    errorCount: number;
    lastError: string | null;
    /** Gmail only: last known history ID — used with history.list for incremental sync */
    historyId?: string;
    /** Gmail only: true when a Pub/Sub push watch is active (reduces polling to 10 min fallback) */
    pushActive?: boolean;
    /** Gmail only: ISO-8601 expiration of the current Gmail push watch (watches expire every 7 days) */
    watchExpiration?: string;
    /** Gmail only: ISO-8601 timestamp of the last Pub/Sub push notification received — triggers immediate client sync */
    lastPushAt?: string;
    /** Slack/Teams only: map of channelId/chatId → latest message ts — used as cursor */
    channelCursors?: Record<string, string>;
}

export interface SyncResult {
    service: SyncService;
    added: number;
    messages: UnifiedMessage[];
    nextState: Partial<SyncState>;
    errors: string[];
}

export interface GmailSyncCredentials {
    uid: string;
    email: string;
    /** Firebase ID token — required for server-side Firestore token management */
    idToken: string;
}

export interface SlackSyncCredentials {
    uid: string;
    idToken: string;
    channelIds: string[];
    /** Optional map of channelId → display name, used to populate message subjects */
    channelNames?: Record<string, string>;
}

export interface TeamsSyncCredentials {
    uid: string;
    /** Firebase ID token used to authenticate the /api/microsoft/teams proxy */
    idToken: string;
}

export interface OutlookSyncCredentials {
    uid: string;
    /** Firebase ID token used to authenticate the /api/microsoft/outlook proxy */
    idToken: string;
}
