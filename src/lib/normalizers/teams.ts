/**
 * normalizers/teams.ts
 * Converts a raw Microsoft Teams Graph API message into a UnifiedMessage.
 */

import { type UnifiedMessage } from "./types";

// ── Raw Teams Graph API message shape ──────────────────────────────────────────

export interface TeamsRawMessage {
    /** Graph message ID */
    id: string;
    /** ISO-8601 timestamp from Graph API */
    createdDateTime: string;
    /** Pre-resolved display name of the sender */
    senderName?: string;
    /** Plain-text body content (HTML stripped server-side) */
    body: string;
    /** Chat ID this message belongs to */
    chatId: string;
    /** Chat type: "oneOnOne" | "group" */
    chatType?: string;
    /** If reply, the ID of the parent message */
    replyToId?: string;
}

// ── Normalizer ──────────────────────────────────────────────────────────────────

/**
 * Converts a raw Teams Graph API message into the standard UnifiedMessage format.
 */
export function normalizeTeams(raw: TeamsRawMessage): UnifiedMessage {
    const id = `teams_${raw.chatId}_${raw.id}`;

    let timestamp: string;
    try {
        timestamp = new Date(raw.createdDateTime).toISOString();
    } catch {
        timestamp = new Date().toISOString();
    }

    const chatLabel =
        raw.chatType === "oneOnOne"
            ? "Teams DM"
            : raw.chatType === "group"
              ? "Teams Group"
              : "Teams";

    return {
        id,
        source: "teams",
        sender: raw.senderName ?? "Unknown",
        timestamp,
        // Thread root: if it's a reply, point to parent; otherwise this message is the root
        threadId: raw.replyToId ?? raw.id,
        preview: raw.body.slice(0, 500),
        metadata: {
            subject: chatLabel,
            external_id: id,
            accountId: raw.chatId,
            status: "unread",
        },
    };
}
