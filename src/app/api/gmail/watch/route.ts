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

async function getGmailRefreshToken(uid: string, email: string, idToken: string): Promise<string | null> {
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

async function getAccessToken(refreshToken: string): Promise<string | null> {
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
        // Pub/Sub not configured — skip registration gracefully
        logger.warn("gmail/watch", "GMAIL_PUBSUB_TOPIC not set — skipping push watch");
        return NextResponse.json({ skipped: true, reason: "pubsub_not_configured" });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_invalid" }, { status: 401 });
    }

    const refreshToken = await getGmailRefreshToken(uid, body.email, idToken);
    if (!refreshToken) {
        return NextResponse.json({ error: "no_refresh_token" }, { status: 400 });
    }

    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) {
        logger.error("gmail/watch", "Token refresh failed", { uid });
        return NextResponse.json({ error: "token_refresh_failed" }, { status: 500 });
    }

    try {
        const watchRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ topicName: GMAIL_PUBSUB_TOPIC, labelIds: ["INBOX"] }),
        });

        if (!watchRes.ok) {
            const err = await watchRes.text().catch(() => "");
            logger.error("gmail/watch", "Watch registration failed", { uid, status: watchRes.status, err: err.slice(0, 200) });
            return NextResponse.json({ error: "watch_failed" }, { status: 502 });
        }

        const watchData = (await watchRes.json()) as { historyId?: string; expiration?: string };
        const expirationMs = parseInt(watchData.expiration ?? "0", 10);
        const expirationIso = expirationMs
            ? new Date(expirationMs).toISOString()
            : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

        // Persist push state + email→uid lookup in parallel (best-effort)
        await Promise.all([
            // Update Gmail sync state
            fetch(
                `${FIRESTORE_BASE}/users/${uid}/sync/gmail` +
                `?updateMask.fieldPaths=pushActive&updateMask.fieldPaths=watchExpiration`,
                {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fields: {
                            pushActive: { booleanValue: true },
                            watchExpiration: { stringValue: expirationIso },
                        },
                    }),
                },
            ).catch(() => {}),
            // Write email→uid index
            fetch(
                `${FIRESTORE_BASE}/emailIndex/${encodeEmail(body.email!)}` +
                `?updateMask.fieldPaths=uid&updateMask.fieldPaths=email`,
                {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fields: {
                            uid: { stringValue: uid },
                            email: { stringValue: body.email },
                        },
                    }),
                },
            ).catch(() => {}),
        ]);

        logger.info("gmail/watch", "Push watch registered", { uid, email: body.email, expiresAt: expirationIso });
        return NextResponse.json({ pushActive: true, expiresAt: expirationIso, historyId: watchData.historyId });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("gmail/watch", "Unexpected error", { error: msg });
        return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
}
