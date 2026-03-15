import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { normalizeGmail } from "@/lib/normalizers";
import type { UnifiedMessage } from "@/lib/normalizers/types";

/**
 * POST /api/gmail/webhook?secret=<GMAIL_PUBSUB_SECRET>
 *
 * Receives Google Cloud Pub/Sub push notifications from Gmail.
 * Each notification contains a base64-encoded JSON body:
 *   { emailAddress: string, historyId: number }
 *
 * On receipt:
 * 1. Verifies the secret token in the query string
 * 2. Decodes and parses the Pub/Sub message
 * 3. Looks up uid from emailIndex/{encodedEmail} in Firestore
 * 4. Gets the Gmail refresh token from users/{uid}/private/gmail
 * 5. Exchanges refresh token for access token
 * 6. Calls Gmail history.list to fetch new messages
 * 7. Stores messages in Firestore messages collection (same as sync engine)
 *
 * NOTE: Always returns 200 so Pub/Sub does not re-deliver the message.
 *
 * Required env vars:
 *   GMAIL_PUBSUB_SECRET  — shared secret added to the push subscription URL
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

const GMAIL_PUBSUB_SECRET = process.env.GMAIL_PUBSUB_SECRET ?? "";
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

interface PubSubBody {
    message?: {
        data?: string;
        messageId?: string;
    };
}

interface GmailPushData {
    emailAddress: string;
    historyId: number;
}

interface GmailHistoryRecord {
    messagesAdded?: Array<{ message: { id: string } }>;
}
interface GmailHistoryResponse {
    history?: GmailHistoryRecord[];
    historyId?: string;
}

function encodeEmail(email: string): string {
    return email.replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

/** Look up uid from the email index (unauthenticated read via API key). */
async function getUidByEmail(email: string): Promise<string | null> {
    const docId = encodeEmail(email);
    const res = await fetch(
        `${FIRESTORE_BASE}/emailIndex/${docId}?key=${FIREBASE_API_KEY}`,
    );
    if (!res.ok) return null;
    const doc = (await res.json()) as { fields?: { uid?: { stringValue?: string } } };
    return doc.fields?.uid?.stringValue ?? null;
}

/** Get Gmail refresh token from Firestore using the API key (server-to-server read). */
async function getRefreshToken(uid: string, email: string): Promise<string | null> {
    const res = await fetch(
        `${FIRESTORE_BASE}/users/${uid}/private/gmail?key=${FIREBASE_API_KEY}`,
    );
    if (!res.ok) return null;
    const doc = (await res.json()) as {
        fields?: {
            accounts?: {
                arrayValue?: {
                    values?: Array<{
                        mapValue?: {
                            fields?: Record<string, { stringValue?: string }>;
                        };
                    }>;
                };
            };
        };
    };
    const accounts = doc.fields?.accounts?.arrayValue?.values ?? [];
    for (const entry of accounts) {
        const fields = entry.mapValue?.fields ?? {};
        if (fields.email?.stringValue === email) {
            return fields.refresh_token?.stringValue ?? null;
        }
    }
    return null;
}

/** Exchange refresh token for short-lived access token. */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token",
        }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
}

/** Store a message in Firestore messages collection via REST API (Message schema). */
async function storeMessage(msg: UnifiedMessage): Promise<void> {
    const docId = msg.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    await fetch(
        `${FIRESTORE_BASE}/messages/${docId}?key=${FIREBASE_API_KEY}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fields: {
                    id: { stringValue: msg.id },
                    source: { stringValue: msg.source },
                    external_id: { stringValue: msg.metadata.external_id ?? msg.id },
                    sender: { stringValue: msg.sender },
                    senderEmail: { stringValue: msg.metadata.senderEmail ?? "" },
                    subject: { stringValue: msg.metadata.subject ?? "(Kein Betreff)" },
                    content: { stringValue: msg.preview.slice(0, 5000) },
                    htmlContent: { stringValue: msg.metadata.htmlContent ?? "" },
                    timestamp: { stringValue: msg.timestamp },
                    threadId: { stringValue: msg.threadId },
                    status: { stringValue: msg.metadata.status ?? "unread" },
                    importance_score: { doubleValue: msg.metadata.importance_score ?? 3 },
                    ai_draft_response: { nullValue: null },
                    accountId: { stringValue: msg.metadata.accountId ?? "" },
                },
            }),
        },
    );
}

export async function POST(request: Request) {
    // 1. Verify secret token
    const { searchParams } = new URL(request.url);
    if (GMAIL_PUBSUB_SECRET && searchParams.get("secret") !== GMAIL_PUBSUB_SECRET) {
        logger.warn("gmail/webhook", "Invalid secret token");
        return new NextResponse(null, { status: 200 }); // Always 200 to avoid re-delivery
    }

    let pubsubBody: PubSubBody;
    try {
        pubsubBody = (await request.json()) as PubSubBody;
    } catch {
        return new NextResponse(null, { status: 200 });
    }

    const base64Data = pubsubBody.message?.data;
    if (!base64Data) {
        return new NextResponse(null, { status: 200 });
    }

    // 2. Decode Pub/Sub message
    let pushData: GmailPushData;
    try {
        const json = Buffer.from(base64Data, "base64").toString("utf-8");
        pushData = JSON.parse(json) as GmailPushData;
    } catch {
        logger.warn("gmail/webhook", "Failed to decode Pub/Sub message");
        return new NextResponse(null, { status: 200 });
    }

    const { emailAddress, historyId } = pushData;
    if (!emailAddress || !historyId) {
        return new NextResponse(null, { status: 200 });
    }

    logger.info("gmail/webhook", "Received push notification", { email: emailAddress, historyId });

    // 3. Look up uid
    const uid = await getUidByEmail(emailAddress);
    if (!uid) {
        logger.warn("gmail/webhook", "No uid found for email", { email: emailAddress });
        return new NextResponse(null, { status: 200 });
    }

    // 4. Get refresh token
    const refreshToken = await getRefreshToken(uid, emailAddress);
    if (!refreshToken) {
        logger.warn("gmail/webhook", "No refresh token for user", { uid, email: emailAddress });
        return new NextResponse(null, { status: 200 });
    }

    // 5. Get access token
    const accessToken = await refreshAccessToken(refreshToken);
    if (!accessToken) {
        logger.error("gmail/webhook", "Token refresh failed", { uid });
        return new NextResponse(null, { status: 200 });
    }

    // 6. Fetch new messages via history.list starting from the pushed historyId
    try {
        const histRes = await fetch(
            `${GMAIL_API}/history?startHistoryId=${historyId}&historyTypes=messageAdded&labelId=INBOX`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!histRes.ok) {
            logger.warn("gmail/webhook", "history.list failed", { uid, status: histRes.status });
            return new NextResponse(null, { status: 200 });
        }

        const histData = (await histRes.json()) as GmailHistoryResponse;
        const newIds = new Set<string>();
        histData.history?.forEach(record => {
            record.messagesAdded?.forEach(ma => newIds.add(ma.message.id));
        });

        if (newIds.size === 0) {
            return new NextResponse(null, { status: 200 });
        }

        // 7. Fetch message details and store in Firestore
        await Promise.all(
            [...newIds].map(async id => {
                try {
                    const msgRes = await fetch(
                        `${GMAIL_API}/messages/${id}?format=full`,
                        { headers: { Authorization: `Bearer ${accessToken}` } },
                    );
                    if (!msgRes.ok) return;
                    const raw = (await msgRes.json()) as Record<string, unknown>;
                    const normalized = normalizeGmail(
                        { ...raw, _accountId: emailAddress } as Parameters<typeof normalizeGmail>[0],
                        emailAddress,
                    );
                    await storeMessage(normalized);
                } catch {
                    // Best-effort — do not block other messages
                }
            }),
        );

        logger.info("gmail/webhook", "Processed push notification", { uid, email: emailAddress, newMessages: newIds.size });
    } catch (err: unknown) {
        logger.error("gmail/webhook", "Push processing failed", {
            error: err instanceof Error ? err.message : String(err),
            uid,
        });
    }

    return new NextResponse(null, { status: 200 });
}
