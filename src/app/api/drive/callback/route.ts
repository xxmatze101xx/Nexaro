import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/drive/callback?code=<auth_code>&state=<uid+idToken>
 *
 * Exchanges Google Drive OAuth code for tokens,
 * stores them in Firestore at users/{uid}/tokens/google_drive.
 *
 * Required env vars:
 *   GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REDIRECT_URI
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const rawState = searchParams.get("state") ?? "";
    const error = searchParams.get("error");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    let uid = "";
    let idToken = "";
    try {
        const parsed = JSON.parse(rawState) as { uid?: string; idToken?: string };
        uid = parsed.uid ?? "";
        idToken = parsed.idToken ?? "";
    } catch {
        uid = rawState;
    }

    if (error || !code || !uid) {
        const reason = error ?? "missing_code_or_state";
        return NextResponse.redirect(`${appUrl}/settings?drive_error=${reason}`);
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!clientId || !clientSecret || !redirectUri || !projectId) {
        return NextResponse.redirect(`${appUrl}/settings?drive_error=server_config`);
    }

    try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        const tokenData = (await tokenRes.json()) as {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
            error?: string;
            error_description?: string;
        };

        if (!tokenData.access_token) {
            logger.error("drive/callback", "Token exchange failed", {
                error: tokenData.error,
                description: tokenData.error_description,
            });
            return NextResponse.redirect(`${appUrl}/settings?drive_error=${tokenData.error ?? "exchange_failed"}`);
        }

        const now = Date.now();
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/google_drive`;
        const firestoreBody = {
            fields: {
                access_token: { stringValue: tokenData.access_token },
                refresh_token: { stringValue: tokenData.refresh_token ?? "" },
                expires_in: { integerValue: String(tokenData.expires_in ?? 3600) },
                token_acquired_at: { integerValue: String(now) },
                expires_at: { integerValue: String(now + (tokenData.expires_in ?? 3600) * 1000) },
                connected_at: { stringValue: new Date().toISOString() },
            },
        };

        const fsRes = await fetch(firestoreUrl, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(firestoreBody),
        });

        if (!fsRes.ok) {
            const errText = await fsRes.text().catch(() => "(unreadable)");
            logger.error("drive/callback", "Firestore token write failed", { status: fsRes.status, body: errText.slice(0, 300) });
            return NextResponse.redirect(`${appUrl}/settings?drive_error=token_storage_failed`);
        }

        logger.info("drive/callback", "Google Drive token stored", { uid });
        return NextResponse.redirect(`${appUrl}/?drive_connected=true`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown";
        logger.error("drive/callback", "Unexpected error", { error: msg });
        return NextResponse.redirect(`${appUrl}/settings?drive_error=server_error`);
    }
}
