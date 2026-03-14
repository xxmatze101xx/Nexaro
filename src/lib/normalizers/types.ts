/**
 * normalizers/types.ts
 * Core schema for the Nexaro unified message format.
 * All integration adapters must produce a UnifiedMessage.
 */

export type MessageSource =
    | "gmail"
    | "slack"
    | "gcal"
    | "outlook"
    | "teams"
    | "proton"
    | "apple";

export type MessageStatus = "unread" | "read" | "replied" | "archived";

/**
 * Source-agnostic metadata bag.
 * Fields are optional — each adapter populates what it has.
 */
export interface UnifiedMessageMetadata {
    subject?: string;
    senderEmail?: string;
    htmlContent?: string | null;
    accountId?: string;
    labels?: string[];
    rfcMessageId?: string;
    importance_score?: number;
    ai_draft_response?: string | null;
    external_id?: string;
    status?: MessageStatus;
    // Slack-specific
    channelId?: string;
    channelName?: string;
}

/**
 * UnifiedMessage — the standard internal format every integration normalizes into.
 *
 * Fields:
 *  id        – stable unique ID (source-prefixed where needed)
 *  source    – which integration this came from
 *  sender    – display name of the sender
 *  timestamp – ISO-8601 string
 *  threadId  – thread / conversation identifier
 *  preview   – plain-text preview of the message body
 *  metadata  – all additional source-specific fields
 */
export interface UnifiedMessage {
    id: string;
    source: MessageSource;
    sender: string;
    timestamp: string;
    threadId: string;
    preview: string;
    metadata: UnifiedMessageMetadata;
}
