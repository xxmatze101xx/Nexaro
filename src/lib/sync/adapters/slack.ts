/**
 * sync/adapters/slack.ts
 * Slack sync adapter — supports initial and incremental sync per channel.
 *
 * Initial:     fetches last 50 messages per channel, records latest ts as cursor.
 * Incremental: passes oldest=<cursor ts> to get only messages newer than last sync.
 */

import { normalizeSlack } from "@/lib/normalizers";
import type { UnifiedMessage } from "@/lib/normalizers/types";
import type { SlackSyncCredentials, SyncMode, SyncResult, SyncState } from "../types";
import { rateLimitedFetch } from "../rate-limiter";

interface SlackApiMessage {
    ts: string;
    user?: string;
    userName?: string;
    text?: string;
}

interface SlackMessagesResponse {
    messages?: SlackApiMessage[];
    error?: string;
}

async function fetchChannelMessages(
    idToken: string,
    channelId: string,
    oldest?: string,
): Promise<{ messages: SlackApiMessage[]; error?: string }> {
    const url = new URL("/api/slack/messages", typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    url.searchParams.set("channel", channelId);
    if (oldest) url.searchParams.set("oldest", oldest);

    const res = await rateLimitedFetch("slack", url.toString(), {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
        return { messages: [], error: `http_${res.status}` };
    }
    const data = await res.json() as SlackMessagesResponse;
    return { messages: data.messages ?? [], error: data.error };
}

export async function syncSlack(
    creds: SlackSyncCredentials,
    mode: SyncMode,
    state: SyncState | null,
): Promise<Omit<SyncResult, "service">> {
    const { idToken, channelIds } = creds;
    const messages: UnifiedMessage[] = [];
    const errors: string[] = [];
    const channelCursors: Record<string, string> = {
        ...(state?.channelCursors ?? {}),
    };

    for (const channelId of channelIds) {
        const cursor = mode === "incremental" ? channelCursors[channelId] : undefined;

        const { messages: rawMessages, error } = await fetchChannelMessages(idToken, channelId, cursor);

        if (error) {
            errors.push(`channel_${channelId}: ${error}`);
            continue;
        }

        for (const raw of rawMessages) {
            const unified = normalizeSlack({
                ts: raw.ts,
                user: raw.user,
                sender_name: raw.userName,
                text: raw.text,
                channel_id: channelId,
            });
            messages.push(unified);

            // Update cursor to the latest ts seen for this channel
            const existingCursor = channelCursors[channelId];
            if (!existingCursor || parseFloat(raw.ts) > parseFloat(existingCursor)) {
                channelCursors[channelId] = raw.ts;
            }
        }
    }

    const nextState: Partial<SyncState> = { channelCursors };
    return { added: messages.length, messages, nextState, errors };
}
