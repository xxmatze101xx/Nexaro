/**
 * token-manager.ts
 * Proactive OAuth token expiry management for Microsoft integrations.
 *
 * Reads stored tokens from Firestore, checks expiry proactively (5-minute buffer),
 * refreshes automatically if needed, persists the new token + expires_at back to
 * Firestore, and logs a warning when a token is within 10 minutes of expiry.
 *
 * Supported services:  "microsoft"
 *
 * Token storage schema (Firestore):
 *   users/{uid}/tokens/microsoft → {
 *     access_token: string
 *     refresh_token: string
 *     expires_in: number        (seconds)
 *     token_acquired_at: number (Unix ms)
 *   }
 */

import { logger } from "@/lib/logger";

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

/** Time buffer before actual expiry to trigger proactive refresh (5 minutes). */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
/** Time threshold to emit a warning log (10 minutes). */
const WARN_BUFFER_MS = 10 * 60 * 1000;

interface FirestoreTokenDoc {
    fields?: {
        access_token?: { stringValue: string };
        refresh_token?: { stringValue: string };
        expires_in?: { integerValue: string };
        token_acquired_at?: { integerValue: string };
    };
}

interface StoredToken {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenAcquiredAt: number;
    /** Computed expiry timestamp in ms */
    expiresAt: number;
}

async function readTokenFromFirestore(
    uid: string,
    service: string,
    idToken: string,
): Promise<StoredToken | null> {
    const url = `${FIRESTORE_BASE}/users/${uid}/tokens/${service}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) return null;

    const doc = (await res.json()) as FirestoreTokenDoc;
    const f = doc.fields;
    if (!f) return null;

    const accessToken = f.access_token?.stringValue ?? "";
    const refreshToken = f.refresh_token?.stringValue ?? "";
    const expiresIn = parseInt(f.expires_in?.integerValue ?? "3600", 10);
    const tokenAcquiredAt = parseInt(f.token_acquired_at?.integerValue ?? "0", 10);

    if (!accessToken) return null;

    return {
        accessToken,
        refreshToken,
        expiresIn,
        tokenAcquiredAt,
        expiresAt: tokenAcquiredAt + expiresIn * 1000,
    };
}

async function refreshMicrosoftToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
} | null> {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) return null;

    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            redirect_uri: redirectUri,
            grant_type: "refresh_token",
            scope: "offline_access User.Read Mail.Read Mail.Send Calendars.Read Chat.Read",
        }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
    };

    if (!data.access_token) return null;

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        expiresIn: data.expires_in ?? 3600,
    };
}

async function persistTokenToFirestore(
    uid: string,
    service: string,
    idToken: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
): Promise<void> {
    const tokenAcquiredAt = Date.now();
    const url =
        `${FIRESTORE_BASE}/users/${uid}/tokens/${service}` +
        `?key=${FIREBASE_API_KEY}` +
        `&updateMask.fieldPaths=access_token` +
        `&updateMask.fieldPaths=refresh_token` +
        `&updateMask.fieldPaths=expires_in` +
        `&updateMask.fieldPaths=token_acquired_at`;

    await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
            fields: {
                access_token: { stringValue: accessToken },
                refresh_token: { stringValue: refreshToken },
                expires_in: { integerValue: String(expiresIn) },
                token_acquired_at: { integerValue: String(tokenAcquiredAt) },
            },
        }),
    }).catch(e => {
        logger.warn("token-manager", "Failed to persist refreshed token", {
            service,
            uid,
            error: e instanceof Error ? e.message : String(e),
        });
    });
}

/**
 * Returns a valid, non-expired access token for the given service.
 * Proactively refreshes the token if it will expire within 5 minutes.
 * Emits a warning log if the token is within 10 minutes of expiry.
 *
 * @param uid      Firebase user UID
 * @param service  "microsoft" (currently the only supported service)
 * @param idToken  Firebase ID token for authenticating Firestore reads/writes
 */
export async function getValidToken(
    uid: string,
    service: "microsoft",
    idToken: string,
): Promise<string | null> {
    const stored = await readTokenFromFirestore(uid, service, idToken);
    if (!stored) return null;

    const now = Date.now();
    const msUntilExpiry = stored.expiresAt - now;

    // Emit warning if expiring soon but not yet due for refresh
    if (msUntilExpiry < WARN_BUFFER_MS && msUntilExpiry >= REFRESH_BUFFER_MS) {
        logger.warn("token-manager", "Token near expiry", {
            service,
            uid,
            expiresInMs: msUntilExpiry,
        });
    }

    // Token is still valid — return as-is
    if (msUntilExpiry >= REFRESH_BUFFER_MS) {
        return stored.accessToken;
    }

    // Token is expired or within the 5-minute buffer — refresh proactively
    if (!stored.refreshToken) {
        logger.error("token-manager", "Token expired and no refresh token available", { service, uid });
        return null;
    }

    logger.info("token-manager", "Proactively refreshing token", { service, uid, expiresInMs: msUntilExpiry });

    let refreshed: { accessToken: string; refreshToken: string; expiresIn: number } | null = null;

    if (service === "microsoft") {
        refreshed = await refreshMicrosoftToken(stored.refreshToken);
    }

    if (!refreshed) {
        logger.error("token-manager", "Token refresh failed", { service, uid });
        // Return the existing (possibly expired) token as a last resort
        return stored.accessToken;
    }

    // Persist refreshed token non-blocking
    persistTokenToFirestore(uid, service, idToken, refreshed.accessToken, refreshed.refreshToken, refreshed.expiresIn)
        .catch(() => {});

    logger.info("token-manager", "Token refreshed successfully", { service, uid });
    return refreshed.accessToken;
}
