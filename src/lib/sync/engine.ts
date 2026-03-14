/**
 * sync/engine.ts
 * SyncEngine — orchestrates sync for each integration with retry + state management.
 *
 * Retry policy: exponential backoff, max 3 attempts (500ms → 1s → 2s).
 * On permanent failure: error is stored in SyncState for visibility.
 */

import { getSyncState, saveSyncState } from "./state";
import { syncGmail } from "./adapters/gmail";
import { syncSlack } from "./adapters/slack";
import type {
    GmailSyncCredentials,
    SlackSyncCredentials,
    SyncMode,
    SyncResult,
    SyncState,
} from "./types";

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 500;

async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = MAX_RETRIES,
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries) {
                await new Promise(resolve =>
                    setTimeout(resolve, BACKOFF_BASE_MS * Math.pow(2, attempt)),
                );
            }
        }
    }
    throw lastError;
}

export class SyncEngine {
    /**
     * Sync Gmail for one account.
     * Automatically chooses initial vs incremental based on stored historyId.
     */
    async syncGmail(uid: string, creds: GmailSyncCredentials): Promise<SyncResult> {
        const state = await getSyncState(uid, "gmail");
        const mode: SyncMode = state?.historyId ? "incremental" : "initial";

        await saveSyncState(uid, { service: "gmail", status: "syncing" });

        try {
            const result = await withRetry(() => syncGmail(creds, mode, state));

            await saveSyncState(uid, {
                service: "gmail",
                status: "idle",
                lastSyncAt: new Date().toISOString(),
                errorCount: 0,
                lastError: null,
                ...result.nextState,
            });

            return { service: "gmail", ...result };
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            const errorCount = (state?.errorCount ?? 0) + 1;

            await saveSyncState(uid, {
                service: "gmail",
                status: "error",
                errorCount,
                lastError: errorMsg,
            });

            return {
                service: "gmail",
                added: 0,
                messages: [],
                nextState: {},
                errors: [errorMsg],
            };
        }
    }

    /**
     * Sync Slack for all connected channels.
     * Automatically chooses initial vs incremental based on stored channelCursors.
     */
    async syncSlack(uid: string, creds: SlackSyncCredentials): Promise<SyncResult> {
        const state = await getSyncState(uid, "slack");
        const hasCursors = Object.keys(state?.channelCursors ?? {}).length > 0;
        const mode: SyncMode = hasCursors ? "incremental" : "initial";

        await saveSyncState(uid, { service: "slack", status: "syncing" });

        try {
            const result = await withRetry(() => syncSlack(creds, mode, state));

            await saveSyncState(uid, {
                service: "slack",
                status: "idle",
                lastSyncAt: new Date().toISOString(),
                errorCount: 0,
                lastError: null,
                ...result.nextState,
            });

            return { service: "slack", ...result };
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            const errorCount = (state?.errorCount ?? 0) + 1;

            await saveSyncState(uid, {
                service: "slack",
                status: "error",
                errorCount,
                lastError: errorMsg,
            });

            return {
                service: "slack",
                added: 0,
                messages: [],
                nextState: {},
                errors: [errorMsg],
            };
        }
    }

    /**
     * Read the current sync state for a service without triggering a sync.
     */
    async getState(uid: string, service: "gmail" | "slack"): Promise<SyncState | null> {
        return getSyncState(uid, service);
    }
}

/** Singleton instance — import this instead of creating a new SyncEngine. */
export const syncEngine = new SyncEngine();
