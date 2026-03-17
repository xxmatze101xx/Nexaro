import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/drive/callback?code=<auth_code>&state=<uid>
 *
 * Exchanges Google Drive OAuth code for tokens, then hands them off to
 * the client via redirect params so the client can write to Firestore
 * using its own authenticated SDK (avoids idToken-in-state expiry issues).
 *
 * Required env vars:
 *   GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REDIRECT_URI
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const rawState = searchParams.get("state") ?? "";
    const error = searchParams.get("error");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // State contains only the uid (no idToken to avoid expiry issues)
    let uid = "";
    try {
        const parsed = JSON.parse(rawState) as { uid?: string };
        uid = parsed.uid ?? "";
    } catch {
        uid = rawState;
    }

    if (error || !code || !uid) {
        const reason = error ?? "missing_code_or_state";
        return NextResponse.redirect(`${appUrl}/settings?drive_error=${encodeURIComponent(reason)}`);
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
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
            return NextResponse.redirect(`${appUrl}/settings?drive_error=${encodeURIComponent(tokenData.error ?? "exchange_failed")}`);
        }

        logger.info("drive/callback", "Drive token exchange successful, handing off to client", { uid });

        // Pass tokens to the client via redirect params so the client writes to Firestore
        // using its authenticated Firebase SDK (more reliable than server-side REST write).
        const now = Date.now();
        const params = new URLSearchParams({
            drive_tokens: "1",
            drive_uid: uid,
            drive_access_token: tokenData.access_token,
            drive_refresh_token: tokenData.refresh_token ?? "",
            drive_expires_at: String(now + (tokenData.expires_in ?? 3600) * 1000),
        });

        return NextResponse.redirect(`${appUrl}/settings?${params.toString()}`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown";
        logger.error("drive/callback", "Unexpected error", { error: msg });
        return NextResponse.redirect(`${appUrl}/settings?drive_error=server_error`);
    }
}
