import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/gmail/watch
 * Authorization: Bearer <firebase_id_token>
 * Body: { email: string }
 *
 * Registers (or renews) a Gmail Pub/Sub push watch for the authenticated user's inbox.
 * On success:
 *  - Calls gmail.users.watch() with the configured Pub/Sub topic.
 *  - Stores { pushActive: true, watchExpiration } in users/{uid}/sync/gmail.
 *  - Writes email→uid lookup to emailIndex/{encodedEmail} for the webhook to route pushes.
 *
 * Required env vars:
 *   GMAIL_PUBSUB_TOPIC  e.g. "projects/nexaro-app-2026/topics/nexaro-gmail-push"
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const GMAIL_PUBSUB_TOPIC = process.env.GMAIL_PUBSUB_TOPIC ?? "";

async function verifyIdToken(idToken: string): Promise<string | null> {
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ localId: string }> };
    return data.users?.[0]?.localId ?? null;
}

/** Get the Gmail refresh token for a user+email from Firestore. */
async function getRefreshToken(uid: string, email: string, idToken: string): Promise<string | null> {
    const res = await fetch(`${FIRESTORE_BASE}/users/${uid}/private/gmail`, {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    const doc = (await res.json()) as {
        fields?: {
            accounts?: {
                arrayValue?: {
                    values?: Array<{
                        mapValue?: { fields?: Record<string, { stringValue?: string }> };
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

/** Exchange refresh token for access token. */
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

/** Encode an email address into a Firestore-safe document ID. */
function encodeEmail(email: string): string {
    return email.replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

/** Write the email → uid index entry to Firestore using the user's ID token. */
async function writeEmailIndex(email: string, uid: string, idToken: string): Promise<void> {
    const docId = encodeEmail(email);
    await fetch(
        `${FIRESTORE_BASE}/emailIndex/${docId}?updateMask.fieldPaths=uid&updateMask.fieldPaths=email`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
                fields: {
                    uid: { stringValue: uid },
                    email: { stringValue: email },
                },
            }),
        },
    );
}

/** Update the Gmail sync state with pushActive + watchExpiration using the user's ID token. */
async function updateGmailSyncState(uid: string, pushActive: boolean, watchExpiration: string, idToken: string): Promise<void> {
    await fetch(
        `${FIRESTORE_BASE}/users/${uid}/sync/gmail?updateMask.fieldPaths=pushActive&updateMask.fieldPaths=watchExpiration`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
                fields: {
                    pushActive: { booleanValue: pushActive },
                    watchExpiration: { stringValue: watchExpiration },
                },
            }),
        },
    );
}

export async function POST(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: { email?: string };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!body.email) {
        return NextResponse.json({ error: "email_required" }, { status: 400 });
    }

    if (!GMAIL_PUBSUB_TOPIC) {
        logger.warn("gmail/watch", "GMAIL_PUBSUB_TOPIC not configured — skipping push watch registration");
        return NextResponse.json({ skipped: true, reason: "pubsub_not_configured" });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    const refreshToken = await getRefreshToken(uid, body.email, idToken);
    if (!refreshToken) {
        logger.warn("gmail/watch", "No refresh token found", { uid, email: body.email });
        return NextResponse.json({ error: "no_refresh_token" }, { status: 400 });
    }

    const accessToken = await refreshAccessToken(refreshToken);
    if (!accessToken) {
        logger.error("gmail/watch", "Failed to refresh access token", { uid });
        return NextResponse.json({ error: "token_refresh_failed" }, { status: 500 });
    }

    try {
        // Register Gmail push watch
        const watchRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                topicName: GMAIL_PUBSUB_TOPIC,
                labelIds: ["INBOX"],
            }),
        });

        if (!watchRes.ok) {
            const errBody = await watchRes.text().catch(() => "");
            logger.error("gmail/watch", "Gmail watch registration failed", { uid, status: watchRes.status, body: errBody.slice(0, 200) });
            return NextResponse.json({ error: "watch_failed" }, { status: 502 });
        }

        const watchData = (await watchRes.json()) as { historyId?: string; expiration?: string };
        const expiration = watchData.expiration
            ? new Date(Number(watchData.expiration)).toISOString()
            : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

        // Store email → uid index and update sync state (fire both in parallel)
        await Promise.all([
            writeEmailIndex(body.email, uid, idToken),
            updateGmailSyncState(uid, true, expiration, idToken),
        ]);

        logger.info("gmail/watch", "Push watch registered", { uid, email: body.email, expiration });
        return NextResponse.json({ pushActive: true, expiration, historyId: watchData.historyId });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("gmail/watch", "Unexpected error", { error: msg });
        return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
}
