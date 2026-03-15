/**
 * sync/adapters/outlook.ts
 * Outlook mail sync adapter — supports initial and incremental sync.
 *
 * Initial:     fetches up to 50 most recent inbox messages (no cursor).
 * Incremental: passes since=<ISO cursor> to fetch only messages newer than last sync.
 *
 * Cursor: lastSyncAt ISO timestamp stored in SyncState.
 */

import { normalizeOutlook } from "@/lib/normalizers/outlook";
import type { UnifiedMessage } from "@/lib/normalizers/types";
import type { OutlookSyncCredentials, SyncMode, SyncResult, SyncState } from "../types";
import { rateLimitedFetch } from "../rate-limiter";
import type { GraphMailMessage } from "@/app/api/microsoft/outlook/route";

interface OutlookApiResponse {
    messages?: GraphMailMessage[];
    error?: string;
}

async function fetchOutlookMessages(
    idToken: string,
    since?: string,
): Promise<{ messages: GraphMailMessage[]; error?: string }> {
    const url = new URL(
        "/api/microsoft/outlook",
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
    );
    if (since) url.searchParams.set("since", since);

    const res = await rateLimitedFetch("outlook", url.toString(), {
        headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!res.ok) {
        return { messages: [], error: `http_${res.status}` };
    }

    const data = (await res.json()) as OutlookApiResponse;
    return { messages: data.messages ?? [], error: data.error };
}

export async function syncOutlook(
    creds: OutlookSyncCredentials,
    mode: SyncMode,
    state: SyncState | null,
): Promise<Omit<SyncResult, "service">> {
    const { idToken } = creds;

    // For incremental sync, use the lastSyncAt cursor so we only fetch new mail
    const since = mode === "incremental" && state?.lastSyncAt ? state.lastSyncAt : undefined;

    const { messages: rawMessages, error } = await fetchOutlookMessages(idToken, since);

    if (error && rawMessages.length === 0) {
        return {
            added: 0,
            messages: [],
            nextState: {},
            errors: [error],
        };
    }

    const messages: UnifiedMessage[] = rawMessages.map(raw => normalizeOutlook(raw));

    return {
        added: messages.length,
        messages,
        nextState: {},
        errors: error ? [error] : [],
    };
}
