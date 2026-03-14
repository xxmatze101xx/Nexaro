/**
 * sync/adapters/teams.ts
 * Microsoft Teams sync adapter — supports initial and incremental sync.
 *
 * Initial:     fetches the last 20 messages per chat (no cursor).
 * Incremental: passes since=<ISO cursor> to get only messages newer than last sync.
 *
 * Cursors are stored per chatId using the existing channelCursors field in SyncState,
 * keyed by chatId → latest createdDateTime ISO string seen.
 */

import { normalizeTeams } from "@/lib/normalizers/teams";
import type { UnifiedMessage } from "@/lib/normalizers/types";
import type { TeamsSyncCredentials, SyncMode, SyncResult, SyncState } from "../types";
import { rateLimitedFetch } from "../rate-limiter";

interface TeamsApiMessage {
    id: string;
    chatId: string;
    chatType: string;
    createdDateTime: string;
    senderName: string;
    body: string;
    replyToId: string | null;
}

interface TeamsApiResponse {
    messages?: TeamsApiMessage[];
    error?: string;
}

async function fetchTeamsMessages(
    idToken: string,
    since?: string,
): Promise<{ messages: TeamsApiMessage[]; error?: string }> {
    const url = new URL(
        "/api/microsoft/teams",
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
    );
    if (since) url.searchParams.set("since", since);

    const res = await rateLimitedFetch("teams", url.toString(), {
        headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!res.ok) {
        return { messages: [], error: `http_${res.status}` };
    }

    const data = (await res.json()) as TeamsApiResponse;
    return { messages: data.messages ?? [], error: data.error };
}

export async function syncTeams(
    creds: TeamsSyncCredentials,
    mode: SyncMode,
    state: SyncState | null,
): Promise<Omit<SyncResult, "service">> {
    const { idToken } = creds;

    // For incremental sync, find the global earliest cursor so we don't re-fetch
    // messages we already have. We use the most recent cursor across all chats.
    const existingCursors = state?.channelCursors ?? {};
    const cursors = { ...existingCursors };

    // Determine `since`: the latest timestamp we've seen across all chats.
    // For initial sync there's no cursor, so we fetch without a filter.
    const cursorValues = Object.values(cursors);
    const since =
        mode === "incremental" && cursorValues.length > 0
            ? cursorValues.reduce((latest, ts) => (ts > latest ? ts : latest))
            : undefined;

    const { messages: rawMessages, error } = await fetchTeamsMessages(idToken, since);

    if (error && rawMessages.length === 0) {
        return {
            added: 0,
            messages: [],
            nextState: { channelCursors: cursors },
            errors: [error],
        };
    }

    const messages: UnifiedMessage[] = [];

    for (const raw of rawMessages) {
        const unified = normalizeTeams({
            id: raw.id,
            createdDateTime: raw.createdDateTime,
            senderName: raw.senderName,
            body: raw.body,
            chatId: raw.chatId,
            chatType: raw.chatType,
            replyToId: raw.replyToId ?? undefined,
        });
        messages.push(unified);

        // Update per-chat cursor to the latest message time seen
        const existing = cursors[raw.chatId];
        if (!existing || raw.createdDateTime > existing) {
            cursors[raw.chatId] = raw.createdDateTime;
        }
    }

    return {
        added: messages.length,
        messages,
        nextState: { channelCursors: cursors },
        errors: error ? [error] : [],
    };
}
