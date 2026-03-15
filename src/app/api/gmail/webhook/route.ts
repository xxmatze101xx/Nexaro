import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/gmail/webhook?secret=<GMAIL_PUBSUB_SECRET>
 *
 * Receives Google Cloud Pub/Sub push notifications from Gmail.
 * Pub/Sub delivers: { message: { data: "<base64>", messageId: "..." }, subscription: "..." }
 * The base64 data decodes to: { emailAddress: "user@gmail.com", historyId: 12345 }
 *
 * On receipt:
 * 1. Verifies the shared secret in the query string.
 * 2. Decodes and parses the Pub/Sub message.
 * 3. Looks up uid from emailIndex/{encodedEmail} in Firestore (unauthenticated read).
 * 4. Updates users/{uid}/sync/gmail with { historyId, lastPushAt } via REST PATCH.
 *    This causes the client's Firestore listener to detect the change and trigger
 *    an immediate incremental Gmail sync.
 * 5. Always returns 200 so Pub/Sub does not retry delivery.
 *
 * Required env vars:
 *   GMAIL_PUBSUB_SECRET  — secret appended to the push endpoint URL (?secret=...)
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_API_KEY
 */

const GMAIL_PUBSUB_SECRET = process.env.GMAIL_PUBSUB_SECRET ?? "";
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

interface PubSubBody {
    message?: { data?: string; messageId?: string };
    subscription?: string;
}

interface GmailPushData {
    emailAddress: string;
    historyId: number;
}

function encodeEmail(email: string): string {
    return email.replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

/** Look up the uid for a given email using the emailIndex collection. */
async function getUidByEmail(email: string): Promise<string | null> {
    const res = await fetch(
        `${FIRESTORE_BASE}/emailIndex/${encodeEmail(email)}?key=${FIREBASE_API_KEY}`,
    );
    if (!res.ok) return null;
    const doc = (await res.json()) as { fields?: { uid?: { stringValue?: string } } };
    return doc.fields?.uid?.stringValue ?? null;
}

/**
 * Updates the Gmail sync state with the new historyId and lastPushAt timestamp.
 * The client-side useSyncEngine detects a recent lastPushAt and triggers an immediate sync.
 *
 * Note: This uses the Firebase API key (unauthenticated). The emailIndex and
 * users/{uid}/sync/gmail paths need Firestore rules that allow this webhook to write.
 * In a production environment, use a Firebase service account for this server-side write.
 */
async function signalPushToClient(uid: string, historyId: number): Promise<void> {
    const syncDocUrl = `${FIRESTORE_BASE}/users/${uid}/sync/gmail`;
    await fetch(
        `${syncDocUrl}?key=${FIREBASE_API_KEY}` +
        `&updateMask.fieldPaths=historyId&updateMask.fieldPaths=lastPushAt`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fields: {
                    historyId: { stringValue: String(historyId) },
                    lastPushAt: { stringValue: new Date().toISOString() },
                },
            }),
        },
    );
}

export async function POST(request: Request) {
    // Always return 200 — Pub/Sub retries on non-200 responses
    const ok = new NextResponse(null, { status: 200 });

    // 1. Verify secret
    const { searchParams } = new URL(request.url);
    if (GMAIL_PUBSUB_SECRET && searchParams.get("secret") !== GMAIL_PUBSUB_SECRET) {
        logger.warn("gmail/webhook", "Invalid secret token");
        return ok;
    }

    let body: PubSubBody;
    try {
        body = (await request.json()) as PubSubBody;
    } catch {
        return ok;
    }

    const base64Data = body.message?.data;
    if (!base64Data) return ok;

    // 2. Decode Pub/Sub payload
    let pushData: GmailPushData;
    try {
        const json = Buffer.from(base64Data, "base64").toString("utf-8");
        pushData = JSON.parse(json) as GmailPushData;
    } catch {
        logger.warn("gmail/webhook", "Failed to decode Pub/Sub data");
        return ok;
    }

    const { emailAddress, historyId } = pushData;
    if (!emailAddress || !historyId) return ok;

    logger.info("gmail/webhook", "Push received", { email: emailAddress, historyId });

    // 3. Look up uid
    const uid = await getUidByEmail(emailAddress).catch(() => null);
    if (!uid) {
        logger.warn("gmail/webhook", "No uid for email", { email: emailAddress });
        return ok;
    }

    // 4. Signal the client via Firestore — client will trigger immediate incremental sync
    try {
        await signalPushToClient(uid, historyId);
        logger.info("gmail/webhook", "Sync state signaled", { uid, historyId });
    } catch (err: unknown) {
        logger.error("gmail/webhook", "Failed to signal sync state", {
            uid,
            error: err instanceof Error ? err.message : String(err),
        });
    }

    return ok;
}
