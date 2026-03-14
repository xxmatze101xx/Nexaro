/**
 * normalizers/gmail.ts
 * Converts a raw Gmail API message into a UnifiedMessage.
 */

import { type UnifiedMessage } from "./types";

// ── Raw Gmail API types ────────────────────────────────────────────────────────

export interface GmailHeader {
    name: string;
    value: string;
}

export interface GmailPayloadPart {
    mimeType: string;
    body?: { data?: string };
    parts?: GmailPayloadPart[];
}

export interface GmailRawInput {
    id: string;
    threadId: string;
    labelIds?: string[];
    snippet?: string;
    payload?: {
        headers?: GmailHeader[];
        mimeType?: string;
        body?: { data?: string };
        parts?: GmailPayloadPart[];
    };
    _accountId?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function findHtmlPart(part: GmailPayloadPart): string | null {
    if (!part) return null;
    if (part.mimeType === "text/html" && part.body?.data) {
        return part.body.data;
    }
    if (part.parts && Array.isArray(part.parts)) {
        for (const subPart of part.parts) {
            const html = findHtmlPart(subPart);
            if (html) return html;
        }
    }
    return null;
}

function decodeBase64URL(base64UrlStr: string): string {
    if (!base64UrlStr) return "";
    try {
        const base64 = base64UrlStr.replace(/-/g, "+").replace(/_/g, "/");
        return decodeURIComponent(escape(atob(base64)));
    } catch (e) {
        console.error("Failed to decode email body", e);
        return "";
    }
}

// ── Normalizer ─────────────────────────────────────────────────────────────────

/**
 * Converts a raw Gmail API message into the standard UnifiedMessage format.
 *
 * @param raw           Raw Gmail API message object.
 * @param accountEmail  The Gmail account the message belongs to.
 */
export function normalizeGmail(raw: GmailRawInput, accountEmail?: string): UnifiedMessage {
    const actualAccountEmail = accountEmail ?? raw._accountId ?? "Unknown";
    const headers = raw.payload?.headers ?? [];

    const header = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

    const subject = header("subject") || "(Kein Betreff)";
    const rawSender = header("from") || "Unbekannt";
    const rfcMessageId = header("message-id").trim();

    let senderName = rawSender;
    let senderEmail = "";
    const match = rawSender.match(/(.*?)<(.*?)>/);
    if (match) {
        senderName = match[1].replace(/"/g, "").trim() || match[2];
        senderEmail = match[2].trim();
    } else if (rawSender.includes("@")) {
        senderEmail = rawSender.trim();
    }

    const snippet = raw.snippet ?? "";
    const htmlData = raw.payload
        ? findHtmlPart(raw.payload as GmailPayloadPart)
        : null;
    const htmlContent = htmlData ? decodeBase64URL(htmlData) : null;

    // Heuristic importance score (0–10). Python pipeline overwrites via Firestore overlay.
    let importance = 3.0;
    if (raw.labelIds?.includes("IMPORTANT")) importance = 7.5;
    if (raw.labelIds?.includes("STARRED")) importance = 9.0;
    if (importance === 3.0) {
        const subj = subject.toLowerCase();
        const from = senderEmail.toLowerCase();
        if (/urgent|wichtig|asap|dringend|frist|deadline/.test(subj)) importance = 6.0;
        else if (/invoice|rechnung|vertrag|contract|payment|zahlung/.test(subj)) importance = 5.5;
        else if (/newsletter|unsubscribe|promo|sale|angebot/.test(subj + " " + from)) importance = 1.5;
        else if (/meeting|termin|kalender|calendar|einladung|invite/.test(subj)) importance = 5.0;
        else {
            const hash = raw.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
            importance = Math.max(1.0, 3.0 + ((hash % 11) - 5) * 0.2);
        }
    }

    const timestamp = header("date")
        ? new Date(header("date")).toISOString()
        : new Date().toISOString();

    return {
        id: raw.id,
        source: "gmail",
        sender: senderName,
        timestamp,
        threadId: raw.threadId ?? "",
        preview: snippet,
        metadata: {
            subject,
            senderEmail,
            htmlContent,
            accountId: actualAccountEmail,
            labels: raw.labelIds ?? [],
            rfcMessageId,
            importance_score: importance,
            ai_draft_response: null,
            external_id: raw.id,
            status: raw.labelIds?.includes("UNREAD") ? "unread" : "read",
        },
    };
}
