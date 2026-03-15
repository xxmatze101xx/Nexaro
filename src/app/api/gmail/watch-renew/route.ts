import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/gmail/watch-renew
 * Authorization: Bearer <CRON_SECRET>  (or configured via vercel.json cron)
 *
 * Called by Vercel Cron at 06:00 UTC daily.
 *
 * Scans the emailIndex collection for all registered Gmail push users
 * and renews their watch subscriptions that expire within 48 hours.
 *
 * Since we cannot list all users without firebase-admin, we iterate over
 * the emailIndex collection using the Firestore REST listDocuments API.
 * Each entry has { uid, email } and we renew the watch using a refresh token exchange.
 *
 * Required env vars: NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_API_KEY,
 *                    NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 *                    GMAIL_PUBSUB_TOPIC, CRON_SECRET (optional, for auth)
 */

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const GMAIL_PUBSUB_TOPIC = process.env.GMAIL_PUBSUB_TOPIC ?? "";

interface FsStringField { stringValue?: string }
interface FsDoc {
    name?: string;
    fields?: {
        uid?: FsStringField;
        email?: FsStringField;
        watchExpiration?: FsStringField;
    };
}

async function listEmailIndex(): Promise<Array<{ uid: string; email: string }>> {
    const res = await fetch(
        `${FIRESTORE_BASE}/emailIndex?pageSize=200&key=${FIREBASE_API_KEY}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { documents?: FsDoc[] };
    return (data.documents ?? []).flatMap(doc => {
        const uid = doc.fields?.uid?.stringValue;
        const email = doc.fields?.email?.stringValue;
        return uid && email ? [{ uid, email }] : [];
    });
}

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
                        mapValue?: { fields?: Record<string, FsStringField> };
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

async function renewWatch(uid: string, email: string, accessToken: string): Promise<string | null> {
    if (!GMAIL_PUBSUB_TOPIC) return null;
    const res = await fetch(`${GMAIL_API}/watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ topicName: GMAIL_PUBSUB_TOPIC, labelIds: ["INBOX"] }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { expiration?: string };
    const expiration = data.expiration
        ? new Date(Number(data.expiration)).toISOString()
        : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    // Update Firestore sync state watchExpiration
    await fetch(
        `${FIRESTORE_BASE}/users/${uid}/sync/gmail?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=watchExpiration`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: { watchExpiration: { stringValue: expiration } } }),
        },
    );
    return expiration;
}

export async function GET(request: Request) {
    // Optional cron secret check
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const auth = request.headers.get("Authorization");
        if (auth !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
    }

    if (!GMAIL_PUBSUB_TOPIC) {
        logger.info("gmail/watch-renew", "GMAIL_PUBSUB_TOPIC not set — skipping");
        return NextResponse.json({ skipped: true });
    }

    const users = await listEmailIndex();
    if (users.length === 0) {
        logger.info("gmail/watch-renew", "No Gmail push users found");
        return NextResponse.json({ renewed: 0 });
    }

    const renewThreshold = Date.now() + 48 * 3600 * 1000; // renew if expiring within 48h
    let renewed = 0;

    for (const { uid, email } of users) {
        try {
            const refreshToken = await getRefreshToken(uid, email);
            if (!refreshToken) continue;

            const accessToken = await refreshAccessToken(refreshToken);
            if (!accessToken) continue;

            // Check current expiration
            const syncRes = await fetch(
                `${FIRESTORE_BASE}/users/${uid}/sync/gmail?key=${FIREBASE_API_KEY}`,
            );
            let shouldRenew = true;
            if (syncRes.ok) {
                const syncDoc = (await syncRes.json()) as { fields?: { watchExpiration?: FsStringField } };
                const expStr = syncDoc.fields?.watchExpiration?.stringValue;
                if (expStr && new Date(expStr).getTime() > renewThreshold) {
                    shouldRenew = false;
                }
            }

            if (!shouldRenew) continue;

            const expiration = await renewWatch(uid, email, accessToken);
            if (expiration) {
                renewed++;
                logger.info("gmail/watch-renew", "Watch renewed", { uid, email, expiration });
            }
        } catch (err: unknown) {
            logger.error("gmail/watch-renew", "Failed to renew watch", {
                uid,
                email,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    logger.info("gmail/watch-renew", "Cron complete", { total: users.length, renewed });
    return NextResponse.json({ total: users.length, renewed });
}
