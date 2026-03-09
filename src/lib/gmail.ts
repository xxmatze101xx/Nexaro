import { getGmailRefreshToken } from "./user";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const DB_NAME = "nexaro_gmail_cache";
const STORE_NAME = "emails";

// ── Types ──────────────────────────────────────────────────────────────────

interface GmailHeader {
    name: string;
    value: string;
}

interface GmailPayloadPart {
    mimeType: string;
    body?: { data?: string };
    parts?: GmailPayloadPart[];
}

export interface GmailMessage {
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

// ── Firestore score sync ───────────────────────────────────────────────────

/**
 * Subscribes to real-time importance_score updates for Gmail messages in
 * Firestore (written by the Python pipeline).
 *
 * Returns a map of { external_id → importance_score } so the dashboard can
 * overlay Python-generated scores on top of client-side Gmail heuristics.
 *
 * @returns Unsubscribe function.
 */
export function subscribeToGmailScores(
    onUpdate: (scores: Record<string, number>) => void
): () => void {
    const q = query(collection(db, "messages"), where("source", "==", "gmail"));
    return onSnapshot(q, (snapshot) => {
        const scores: Record<string, number> = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data() as { external_id?: string; importance_score?: number };
            if (data.external_id && typeof data.importance_score === "number") {
                scores[data.external_id] = data.importance_score;
            }
        });
        onUpdate(scores);
    });
}

// ── IndexedDB cache ────────────────────────────────────────────────────────

function initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveEmailsToCache(emails: GmailMessage[]): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        emails.forEach(email => store.put(email));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function getCachedEmails(): Promise<GmailMessage[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as GmailMessage[]);
        request.onerror = () => reject(request.error);
    });
}

export async function clearEmailCache(): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ── Auth token management ──────────────────────────────────────────────────

/**
 * Returns a valid access token for the given Gmail account,
 * refreshing via our API route if the cached token is expired.
 */
export async function getValidAccessToken(uid: string, email: string): Promise<string | null> {
    if (typeof window === "undefined") return null;

    const currentToken = localStorage.getItem(`gmail_access_token_${email}`);
    const expiryStr = localStorage.getItem(`gmail_token_expiry_${email}`);

    if (currentToken && expiryStr) {
        const expiryTime = parseInt(expiryStr, 10);
        // 5-minute buffer before actual expiry
        if (Date.now() < expiryTime - 5 * 60 * 1000) {
            return currentToken;
        }
    }

    const { token: refreshToken } = await getGmailRefreshToken(uid, email);
    if (!refreshToken) return null;

    try {
        const res = await fetch("/api/gmail/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!res.ok) {
            console.error("Failed to refresh Gmail token", await res.text());
            return null;
        }

        const data = (await res.json()) as { access_token?: string; expires_in?: number };
        if (data.access_token) {
            localStorage.setItem(`gmail_access_token_${email}`, data.access_token);
            localStorage.setItem(
                `gmail_token_expiry_${email}`,
                (Date.now() + (data.expires_in ?? 3599) * 1000).toString()
            );
            return data.access_token;
        }
    } catch (e) {
        console.error("Error refreshing Gmail token", e);
    }
    return null;
}

// ── Fetch & cache emails ───────────────────────────────────────────────────

export async function fetchRecentEmailsAndCache(
    uid: string,
    email: string,
    maxResults = 20
): Promise<GmailMessage[] | null> {
    const accessToken = await getValidAccessToken(uid, email);
    if (!accessToken) return null;

    try {
        const listRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!listRes.ok) {
            console.error("Error fetching message list", await listRes.text());
            return null;
        }

        const listData = (await listRes.json()) as { messages?: { id: string }[] };
        const messagesToFetch = listData.messages ?? [];

        const detailedEmails = await Promise.all(
            messagesToFetch.map(async (msg) => {
                const msgRes = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                return msgRes.ok ? ((await msgRes.json()) as GmailMessage) : null;
            })
        );

        const validEmails: GmailMessage[] = detailedEmails
            .filter((e): e is GmailMessage => e !== null)
            .map(e => ({ ...e, _accountId: email }));

        if (validEmails.length > 0) {
            await saveEmailsToCache(validEmails);
        }

        return validEmails;
    } catch (error) {
        console.error("Error fetching emails from Gmail API", error);
        return null;
    }
}

// ── Message parsing ────────────────────────────────────────────────────────

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

/**
 * Parses a raw Gmail API message into Nexaro's internal Message format.
 */
export function parseGmailToNexaroMessage(gmailMsg: GmailMessage, accountEmail?: string) {
    const actualAccountEmail = accountEmail ?? gmailMsg._accountId ?? "Unknown";
    const headers = gmailMsg.payload?.headers ?? [];

    const header = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

    const subject = header("subject") || "(Kein Betreff)";
    const rawSender = header("from") || "Unbekannt";
    const rfcMessageId = header("message-id").trim();

    let sender = rawSender;
    let senderEmail = "";
    const match = rawSender.match(/(.*?)<(.*?)>/);
    if (match) {
        sender = match[1].replace(/"/g, "").trim() || match[2];
        senderEmail = match[2].trim();
    } else if (rawSender.includes("@")) {
        senderEmail = rawSender.trim();
    }

    const snippet = gmailMsg.snippet ?? "";
    const htmlData = gmailMsg.payload ? findHtmlPart(gmailMsg.payload as GmailPayloadPart) : null;
    const htmlContent = htmlData ? decodeBase64URL(htmlData) : null;

    let importance = 3.0;
    if (gmailMsg.labelIds?.includes("IMPORTANT")) importance = 7.5;
    if (gmailMsg.labelIds?.includes("STARRED")) importance = 9.0;

    return {
        id: gmailMsg.id,
        source: "gmail" as const,
        accountId: actualAccountEmail,
        external_id: gmailMsg.id,
        threadId: gmailMsg.threadId ?? "",
        rfcMessageId,
        sender,
        senderEmail,
        subject,
        content: snippet,
        htmlContent,
        timestamp: header("date")
            ? new Date(header("date")).toISOString()
            : new Date().toISOString(),
        importance_score: importance,
        status: (gmailMsg.labelIds?.includes("UNREAD") ? "unread" : "read") as
            | "unread"
            | "read",
        ai_draft_response: null as string | null,
        labels: gmailMsg.labelIds ?? [],
    };
}

// ── Send email ─────────────────────────────────────────────────────────────

/**
 * Sends an email (or reply) via the Gmail API.
 *
 * For replies, pass:
 *  - inReplyTo / references: the RFC Message-ID header of the original email
 *    (e.g. "<xxxx@mail.gmail.com>"), NOT the Gmail message ID.
 *  - threadId: the Gmail threadId so Gmail places the reply in the same thread.
 */
export async function sendEmail(
    uid: string,
    accountEmail: string,
    to: string,
    subject: string,
    body: string,
    inReplyTo?: string,
    references?: string,
    threadId?: string
): Promise<unknown> {
    const accessToken = await getValidAccessToken(uid, accountEmail);
    if (!accessToken)
        throw new Error(
            "Kein Zugriff auf Gmail. Bitte verbinde dein Konto in den Einstellungen erneut."
        );

    const emailLines: string[] = [];
    emailLines.push(`To: ${to}`);
    emailLines.push('Content-Type: text/plain; charset="UTF-8"');
    emailLines.push("MIME-Version: 1.0");
    if (inReplyTo) emailLines.push(`In-Reply-To: ${inReplyTo}`);
    if (references) emailLines.push(`References: ${references}`);
    const base64Subject = btoa(unescape(encodeURIComponent(subject)));
    emailLines.push(`Subject: =?utf-8?B?${base64Subject}?=`);
    emailLines.push("");
    emailLines.push(body);

    const raw = emailLines.join("\r\n");
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(raw)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    const requestBody: Record<string, string> = { raw: base64EncodedEmail };
    if (threadId) requestBody.threadId = threadId;

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Error sending email", errText);
        throw new Error("Fehler beim Senden der E-Mail.");
    }
    return res.json();
}

// ── Archive email ──────────────────────────────────────────────────────────

/**
 * Archives an email by removing it from INBOX.
 * Mirrors the change in the local IndexedDB cache.
 */
export async function archiveEmail(
    uid: string,
    accountEmail: string,
    messageId: string
): Promise<unknown> {
    const accessToken = await getValidAccessToken(uid, accountEmail);
    if (!accessToken) throw new Error("Kein Zugriff auf Gmail.");

    const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ removeLabelIds: ["INBOX"] }),
        }
    );

    if (!res.ok) {
        console.error("Error archiving email", await res.text());
        throw new Error("Fehler beim Archivieren der E-Mail.");
    }

    // Update local cache
    try {
        const cached = await getCachedEmails();
        const email = cached.find(e => e.id === messageId);
        if (email) {
            email.labelIds = (email.labelIds ?? []).filter(id => id !== "INBOX");
            const db = await initDB();
            db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(email);
        }
    } catch (e) {
        console.error("Failed to update cache after archive", e);
    }

    return res.json();
}

// ── Mark read / unread ─────────────────────────────────────────────────────

/**
 * Marks an email as read or unread via the Gmail API.
 * Mirrors the change in the local IndexedDB cache.
 */
export async function markEmailStatus(
    uid: string,
    accountEmail: string,
    messageId: string,
    status: "read" | "unread"
): Promise<unknown> {
    const accessToken = await getValidAccessToken(uid, accountEmail);
    if (!accessToken) throw new Error("Kein Zugriff auf Gmail.");

    const addLabelIds = status === "unread" ? ["UNREAD"] : [];
    const removeLabelIds = status === "read" ? ["UNREAD"] : [];

    const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ addLabelIds, removeLabelIds }),
        }
    );

    if (!res.ok) {
        console.error("Error modifying email labels", await res.text());
        throw new Error("Fehler beim Ändern des E-Mail Status.");
    }

    // Update local cache
    try {
        const cached = await getCachedEmails();
        const email = cached.find(e => e.id === messageId);
        if (email) {
            if (status === "read") {
                email.labelIds = (email.labelIds ?? []).filter(id => id !== "UNREAD");
            } else {
                if (!email.labelIds?.includes("UNREAD")) {
                    email.labelIds = [...(email.labelIds ?? []), "UNREAD"];
                }
            }
            const db = await initDB();
            db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(email);
        }
    } catch (e) {
        console.error("Failed to update cache", e);
    }

    return res.json();
}

// ── Fetch emails by folder/label with pagination ───────────────────────────

/**
 * Fetches a page of emails for a specific folder/label.
 * Pass folder=null to fetch all mail (like fetchRecentEmailsAndCache).
 * Returns messages and the nextPageToken for subsequent pages.
 */
export async function fetchEmailsPage(
    uid: string,
    accountEmail: string,
    folder: 'INBOX' | 'SENT' | 'STARRED' | 'TRASH' | 'ARCHIVE' | null,
    maxResults = 20,
    pageToken?: string
): Promise<{ messages: GmailMessage[]; nextPageToken: string | null } | null> {
    const accessToken = await getValidAccessToken(uid, accountEmail);
    if (!accessToken) return null;

    try {
        const params = new URLSearchParams({ maxResults: String(maxResults) });
        if (folder === 'INBOX') params.set('labelIds', 'INBOX');
        else if (folder === 'SENT') params.set('labelIds', 'SENT');
        else if (folder === 'STARRED') params.set('labelIds', 'STARRED');
        else if (folder === 'TRASH') params.set('labelIds', 'TRASH');
        else if (folder === 'ARCHIVE') params.set('q', '-in:inbox -in:trash -in:spam');
        if (pageToken) params.set('pageToken', pageToken);

        const listRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!listRes.ok) {
            console.error('Error fetching emails page', await listRes.text());
            return null;
        }

        const listData = (await listRes.json()) as {
            messages?: { id: string }[];
            nextPageToken?: string;
        };

        const messagesToFetch = listData.messages ?? [];
        const nextToken = listData.nextPageToken ?? null;

        const detailedEmails = await Promise.all(
            messagesToFetch.map(async (msg) => {
                const msgRes = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                return msgRes.ok ? ((await msgRes.json()) as GmailMessage) : null;
            })
        );

        const messages: GmailMessage[] = detailedEmails
            .filter((e): e is GmailMessage => e !== null)
            .map((e) => ({ ...e, _accountId: accountEmail }));

        return { messages, nextPageToken: nextToken };
    } catch (error) {
        console.error('Error fetching emails page', error);
        return null;
    }
}

// ── Toggle starred label ────────────────────────────────────────────────────

/**
 * Stars or unstars an email via the Gmail API.
 * Mirrors the change in the local IndexedDB cache.
 */
export async function starEmail(
    uid: string,
    accountEmail: string,
    messageId: string,
    starred: boolean
): Promise<unknown> {
    const accessToken = await getValidAccessToken(uid, accountEmail);
    if (!accessToken) throw new Error('Kein Zugriff auf Gmail.');

    const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(
                starred
                    ? { addLabelIds: ['STARRED'] }
                    : { removeLabelIds: ['STARRED'] }
            ),
        }
    );

    if (!res.ok) {
        console.error('Error starring email', await res.text());
        throw new Error('Fehler beim Markieren der E-Mail.');
    }

    try {
        const cached = await getCachedEmails();
        const email = cached.find((e) => e.id === messageId);
        if (email) {
            if (starred) {
                if (!email.labelIds?.includes('STARRED')) {
                    email.labelIds = [...(email.labelIds ?? []), 'STARRED'];
                }
            } else {
                email.labelIds = (email.labelIds ?? []).filter((id) => id !== 'STARRED');
            }
            const dbConn = await initDB();
            dbConn.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(email);
        }
    } catch (e) {
        console.error('Failed to update cache after star', e);
    }

    return res.json();
}

// ── Move to Trash ────────────────────────────────────────────────────────────

/**
 * Moves an email to Gmail Trash.
 * Mirrors the change in the local IndexedDB cache.
 */
export async function trashEmail(
    uid: string,
    accountEmail: string,
    messageId: string
): Promise<unknown> {
    const accessToken = await getValidAccessToken(uid, accountEmail);
    if (!accessToken) throw new Error('Kein Zugriff auf Gmail.');

    const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (!res.ok) {
        console.error('Error trashing email', await res.text());
        throw new Error('Fehler beim Löschen der E-Mail.');
    }

    try {
        const cached = await getCachedEmails();
        const email = cached.find((e) => e.id === messageId);
        if (email) {
            email.labelIds = [
                ...(email.labelIds ?? []).filter((id) => id !== 'INBOX'),
                'TRASH',
            ];
            const dbConn = await initDB();
            dbConn.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(email);
        }
    } catch (e) {
        console.error('Failed to update cache after trash', e);
    }

    return res.json();
}

// ── Unarchive (move back to Inbox) ─────────────────────────────────────────

/**
 * Unarchives an email by adding the INBOX label back.
 * Mirrors the change in the local IndexedDB cache.
 */
export async function unarchiveEmail(
    uid: string,
    accountEmail: string,
    messageId: string
): Promise<unknown> {
    const accessToken = await getValidAccessToken(uid, accountEmail);
    if (!accessToken) throw new Error('Kein Zugriff auf Gmail.');

    const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ addLabelIds: ['INBOX'] }),
        }
    );

    if (!res.ok) {
        console.error('Error unarchiving email', await res.text());
        throw new Error('Fehler beim Verschieben in die Inbox.');
    }

    try {
        const cached = await getCachedEmails();
        const email = cached.find((e) => e.id === messageId);
        if (email) {
            if (!email.labelIds?.includes('INBOX')) {
                email.labelIds = [...(email.labelIds ?? []), 'INBOX'];
            }
            const dbConn = await initDB();
            dbConn.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(email);
        }
    } catch (e) {
        console.error('Failed to update cache after unarchive', e);
    }

    return res.json();
}
