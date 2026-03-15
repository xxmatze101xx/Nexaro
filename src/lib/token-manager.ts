/**
 * token-manager.ts — Proactive OAuth token expiry management for Nexaro.
 *
 * Centralises token reads/refreshes for all integrations.
 * Works server-side and client-side (uses Firestore REST API, not localStorage).
 *
 * Token storage layout in Firestore:
 *   users/{uid}/tokens/microsoft  — { access_token, refresh_token, expires_at (ms), … }
 *   users/{uid}/tokens/gmail      — { access_token, expires_at (ms) }  (access cache)
 *   users/{uid}/private/gmail     — { accounts: [{ email, refresh_token }] }
 *
 * EXPIRY_BUFFER_MS: refresh is triggered when less than 5 minutes remain.
 * WARN_BUFFER_MS:   a warning is logged when less than 10 minutes remain.
 */

import { logger } from "./logger";

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
}/databases/(default)/documents`;

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;   // 5 min
const WARN_BUFFER_MS   = 10 * 60 * 1000;  // 10 min

// ── Firestore REST helpers ─────────────────────────────────────────────────

type FsStringField  = { stringValue: string };
type FsIntField     = { integerValue: string };
type FsField        = FsStringField | FsIntField | { nullValue: null };
type FsDoc          = { fields?: Record<string, FsField> };

function str(field: FsField | undefined): string {
    if (!field) return "";
    if ("stringValue" in field) return field.stringValue;
    if ("integerValue" in field) return field.integerValue;
    return "";
}
function num(field: FsField | undefined): number {
    if (!field) return 0;
    if ("integerValue" in field) return Number(field.integerValue);
    if ("stringValue" in field) return Number(field.stringValue);
    return 0;
}

async function fsGet(path: string, idToken: string): Promise<FsDoc | null> {
    const res = await fetch(`${FIRESTORE_BASE}/${path}`, {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as FsDoc;
}

async function fsPatch(
    path: string,
    fields: Record<string, FsField>,
    idToken: string,
): Promise<void> {
    const fieldPaths = Object.keys(fields).join("&updateMask.fieldPaths=");
    await fetch(
        `${FIRESTORE_BASE}/${path}?updateMask.fieldPaths=${fieldPaths}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ fields }),
        },
    );
}

// ── Microsoft token refresh ────────────────────────────────────────────────

async function refreshMicrosoftToken(
    uid: string,
    refreshToken: string,
    idToken: string,
): Promise<string | null> {
    const clientId     = process.env.MICROSOFT_CLIENT_ID ?? "";
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET ?? "";
    const redirectUri  = process.env.MICROSOFT_REDIRECT_URI ?? "";
    if (!clientId || !clientSecret || !redirectUri) return null;

    const res = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
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
        },
    );

    const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!data.access_token) return null;

    const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

    // Persist refreshed token non-blocking
    void fsPatch(`users/${uid}/tokens/microsoft`, {
        access_token:      { stringValue: data.access_token },
        refresh_token:     { stringValue: data.refresh_token ?? refreshToken },
        expires_at:        { integerValue: String(expiresAt) },
        token_acquired_at: { integerValue: String(Date.now()) },
        expires_in:        { integerValue: String(data.expires_in ?? 3600) },
    }, idToken);

    return data.access_token;
}

// ── Gmail token refresh ────────────────────────────────────────────────────

async function refreshGmailToken(
    uid: string,
    email: string,
    idToken: string,
): Promise<string | null> {
    // Read refresh_token from private subcollection
    const privateDoc = await fsGet(`users/${uid}/private/gmail`, idToken);
    if (!privateDoc?.fields) return null;

    // accounts is stored as an arrayValue — read it via REST
    const accountsField = privateDoc.fields["accounts"] as { arrayValue?: { values?: Array<{ mapValue?: { fields?: Record<string, FsField> } }> } } | undefined;
    const accounts = accountsField?.arrayValue?.values ?? [];
    const account = accounts.find(a => str(a.mapValue?.fields?.["email"]) === email);
    const refreshToken = account ? str(account.mapValue?.fields?.["refresh_token"]) : "";
    if (!refreshToken) return null;

    const clientId     = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
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

    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;

    const expiresAt = Date.now() + (data.expires_in ?? 3599) * 1000;

    // Cache in Firestore for future server-side access
    void fsPatch(`users/${uid}/tokens/gmail`, {
        access_token: { stringValue: data.access_token },
        expires_at:   { integerValue: String(expiresAt) },
        email:        { stringValue: email },
    }, idToken);

    return data.access_token;
}

// ── Public API ─────────────────────────────────────────────────────────────

export type TokenService = "microsoft" | "gmail";

/**
 * Returns a valid access token for the given service.
 * Proactively refreshes if the token is within EXPIRY_BUFFER_MS of expiry.
 * Emits a warning log when within WARN_BUFFER_MS.
 *
 * @param uid       - Firebase user ID
 * @param service   - "microsoft" | "gmail"
 * @param idToken   - Firebase ID token for Firestore authentication
 * @param email     - Gmail email address (required when service === "gmail")
 */
export async function getValidToken(
    uid: string,
    service: TokenService,
    idToken: string,
    email?: string,
): Promise<string | null> {
    if (service === "microsoft") {
        const doc = await fsGet(`users/${uid}/tokens/microsoft`, idToken);
        if (!doc?.fields) return null;

        const f           = doc.fields;
        const accessToken = str(f["access_token"]);
        const refreshToken = str(f["refresh_token"]);

        // Support both expires_at (new) and token_acquired_at + expires_in (legacy)
        let expiresAt = num(f["expires_at"]);
        if (!expiresAt) {
            const acquiredAt = num(f["token_acquired_at"]);
            const expiresIn  = num(f["expires_in"]);
            expiresAt = acquiredAt + expiresIn * 1000;
        }

        const remainingMs = expiresAt - Date.now();

        if (remainingMs < WARN_BUFFER_MS) {
            logger.warn("token-manager", "Token near expiry", {
                service,
                uid,
                expiresInMs: remainingMs,
            });
        }

        if (remainingMs < EXPIRY_BUFFER_MS) {
            if (!refreshToken) return null;
            const fresh = await refreshMicrosoftToken(uid, refreshToken, idToken);
            if (fresh) logger.info("token-manager", "Token refreshed proactively", { service, uid });
            return fresh;
        }

        return accessToken || null;
    }

    if (service === "gmail") {
        if (!email) return null;

        const doc = await fsGet(`users/${uid}/tokens/gmail`, idToken);
        const f   = doc?.fields;

        let expiresAt = f ? num(f["expires_at"]) : 0;
        const accessToken = f ? str(f["access_token"]) : "";

        // Check if the cached email matches
        const cachedEmail = f ? str(f["email"]) : "";
        if (cachedEmail !== email) expiresAt = 0; // invalidate cache for different account

        const remainingMs = expiresAt - Date.now();

        if (remainingMs < WARN_BUFFER_MS) {
            logger.warn("token-manager", "Token near expiry", {
                service,
                uid,
                expiresInMs: remainingMs,
            });
        }

        if (remainingMs >= EXPIRY_BUFFER_MS && accessToken) {
            return accessToken;
        }

        // Refresh
        const fresh = await refreshGmailToken(uid, email, idToken);
        if (fresh) logger.info("token-manager", "Token refreshed proactively", { service, uid });
        return fresh;
    }

    return null;
}
