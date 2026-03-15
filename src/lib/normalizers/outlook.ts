/**
 * normalizers/outlook.ts
 * Converts a raw Microsoft Graph API mail message into a UnifiedMessage.
 */

import { type UnifiedMessage } from "./types";

// ── Raw Outlook Graph API message shape ─────────────────────────────────────────

export interface OutlookRawMessage {
    /** Graph mail message ID */
    id: string;
    /** ISO-8601 received timestamp */
    receivedDateTime: string;
    /** Email subject */
    subject?: string | null;
    /** Plain-text body preview (first 255 chars from Graph API) */
    bodyPreview?: string | null;
    /** Conversation/thread identifier */
    conversationId?: string | null;
    /** Whether the message has been read */
    isRead?: boolean;
    /** Sender info */
    from?: {
        emailAddress?: {
            name?: string;
            address?: string;
        };
    };
}

// ── Normalizer ───────────────────────────────────────────────────────────────────

/**
 * Converts a raw Outlook Graph API mail message into the standard UnifiedMessage format.
 */
export function normalizeOutlook(raw: OutlookRawMessage): UnifiedMessage {
    const id = `outlook_${raw.id}`;

    let timestamp: string;
    try {
        timestamp = new Date(raw.receivedDateTime).toISOString();
    } catch {
        timestamp = new Date().toISOString();
    }

    const senderName = raw.from?.emailAddress?.name ?? raw.from?.emailAddress?.address ?? "Unknown";
    const senderEmail = raw.from?.emailAddress?.address;
    const subject = raw.subject ?? "(No subject)";

    return {
        id,
        source: "outlook",
        sender: senderName,
        timestamp,
        threadId: raw.conversationId ?? raw.id,
        preview: (raw.bodyPreview ?? "").trim().slice(0, 500),
        metadata: {
            subject,
            senderEmail,
            external_id: id,
            status: raw.isRead ? "read" : "unread",
        },
    };
}
