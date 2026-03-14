/**
 * normalizers/slack.ts
 * Converts a raw Slack API message into a UnifiedMessage.
 */

import { type UnifiedMessage } from "./types";

// ── Raw Slack API message shape ────────────────────────────────────────────────

export interface SlackRawMessage {
    /** Unix timestamp string (e.g. "1741906800.123456") */
    ts: string;
    /** Slack user ID of the author */
    user?: string;
    /** Pre-resolved display name (supply after users.info lookup) */
    sender_name?: string;
    /** Plain-text message body */
    text?: string;
    /** Thread root timestamp — equals ts for top-level messages */
    thread_ts?: string;
    /** Channel the message belongs to */
    channel_id?: string;
    channel_name?: string;
}

// ── Normalizer ─────────────────────────────────────────────────────────────────

/**
 * Converts a raw Slack API message into the standard UnifiedMessage format.
 *
 * @param raw  Raw message object from conversations.history (or DM history).
 */
export function normalizeSlack(raw: SlackRawMessage): UnifiedMessage {
    const id = `slack_${raw.channel_id ?? "dm"}_${raw.ts}`;

    let timestamp: string;
    try {
        timestamp = new Date(parseFloat(raw.ts) * 1000).toISOString();
    } catch {
        timestamp = new Date().toISOString();
    }

    const channelLabel = raw.channel_name ? `#${raw.channel_name}` : raw.channel_id ? `#${raw.channel_id}` : "Slack";

    return {
        id,
        source: "slack",
        sender: raw.sender_name ?? raw.user ?? "Unknown",
        timestamp,
        threadId: raw.thread_ts ?? raw.ts,
        preview: (raw.text ?? "").trim(),
        metadata: {
            subject: channelLabel,
            external_id: id,
            channelId: raw.channel_id,
            channelName: raw.channel_name,
            status: "unread",
        },
    };
}
