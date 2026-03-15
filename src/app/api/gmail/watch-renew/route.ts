import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/gmail/watch-renew
 * Authorization: Bearer <firebase_id_token>   (or internal cron secret)
 *
 * Called by Vercel Cron (daily) to renew Gmail push watch subscriptions.
 * Gmail watch subscriptions expire after 7 days — this endpoint renews them
 * before expiry by calling POST /api/gmail/watch internally.
 *
 * Because we don't have Firebase Admin to enumerate all users, this endpoint
 * renews the watch for the authenticated user only. A future enhancement could
 * use a Cloud Function with firebase-admin to run a sweep across all users.
 *
 * Required env vars:
 *   CRON_SECRET — shared secret to authenticate Vercel Cron calls
 *   GMAIL_PUBSUB_TOPIC, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const GMAIL_PUBSUB_TOPIC = process.env.GMAIL_PUBSUB_TOPIC ?? "";
const RENEW_BEFORE_MS = 24 * 3600 * 1000; // Renew if expiring within 24 hours

interface FirestoreSyncState {
    fields?: {
        pushActive?: { booleanValue?: boolean };
        watchExpiration?: { stringValue?: string };
    };
}

interface GmailAccount {
    email: string;
    refresh_token: string;
}

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

async function getGmailAccounts(uid: string, idToken: string): Promise<GmailAccount[]> {
    const res = await fetch(`${FIRESTORE_BASE}/users/${uid}/private/gmail`, {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return [];
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
    return accounts
        .map(entry => {
            const f = entry.mapValue?.fields ?? {};
            return { email: f.email?.stringValue ?? "", refresh_token: f.refresh_token?.stringValue ?? "" };
        })
        .filter(a => a.email && a.refresh_token);
}

async function getGmailSyncState(uid: string, idToken: string): Promise<FirestoreSyncState | null> {
    const res = await fetch(`${FIRESTORE_BASE}/users/${uid}/sync/gmail`, {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as FirestoreSyncState;
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

async function renewWatch(accessToken: string, idToken: string, uid: string, email: string): Promise<boolean> {
    const watchRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ topicName: GMAIL_PUBSUB_TOPIC, labelIds: ["INBOX"] }),
    });
    if (!watchRes.ok) return false;

    const data = (await watchRes.json()) as { expiration?: string };
    const expirationMs = parseInt(data.expiration ?? "0", 10);
    const expirationIso = expirationMs
        ? new Date(expirationMs).toISOString()
        : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    await fetch(
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
    ).catch(() => {});

    logger.info("gmail/watch-renew", "Watch renewed", { uid, email, expiresAt: expirationIso });
    return true;
}

export async function GET(request: Request) {
    // Authenticate: either a Firebase ID token or the cron secret
    const authHeader = request.headers.get("Authorization");
    const cronHeader = request.headers.get("x-cron-secret");

    const isValidCron = CRON_SECRET && cronHeader === CRON_SECRET;
    const idToken = authHeader?.slice(7);

    if (!isValidCron && !idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!GMAIL_PUBSUB_TOPIC) {
        return NextResponse.json({ skipped: true, reason: "pubsub_not_configured" });
    }

    // For cron calls without user token, we can't enumerate users without firebase-admin.
    // Document this limitation and return success.
    if (isValidCron && !idToken) {
        logger.info("gmail/watch-renew", "Cron triggered — firebase-admin required for multi-user sweep. Add user ID tokens via client-side renewal.");
        return NextResponse.json({ ok: true, note: "Per-user renewal requires client-side call with idToken" });
    }

    const uid = await verifyIdToken(idToken!);
    if (!uid) {
        return NextResponse.json({ error: "token_invalid" }, { status: 401 });
    }

    // Check if renewal is needed (expiring within 24h)
    const syncState = await getGmailSyncState(uid, idToken!);
    const watchExpiration = syncState?.fields?.watchExpiration?.stringValue;
    const pushActive = syncState?.fields?.pushActive?.booleanValue ?? false;

    if (pushActive && watchExpiration) {
        const expiresAt = new Date(watchExpiration).getTime();
        if (expiresAt - Date.now() > RENEW_BEFORE_MS) {
            return NextResponse.json({ renewed: false, reason: "not_expiring_soon", expiresAt: watchExpiration });
        }
    }

    const accounts = await getGmailAccounts(uid, idToken!);
    if (accounts.length === 0) {
        return NextResponse.json({ renewed: false, reason: "no_accounts" });
    }

    const renewed: string[] = [];
    for (const account of accounts) {
        const accessToken = await getAccessToken(account.refresh_token);
        if (!accessToken) continue;
        const ok = await renewWatch(accessToken, idToken!, uid, account.email);
        if (ok) renewed.push(account.email);
    }

    return NextResponse.json({ renewed: renewed.length > 0, accounts: renewed });
}
