import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/slack/callback?code=<auth_code>&state=<uid>:<idToken>
 *
 * Exchanges the Slack OAuth code for access + bot tokens and stores them
 * in Firestore under users/{uid}/tokens/slack via Firestore REST API.
 *
 * The state parameter encodes both the Firebase UID and Firebase ID token
 * (format: "uid:idToken"). The ID token is used as Bearer auth for the
 * Firestore REST write — a bare Web API key alone cannot satisfy
 * `request.auth != null` Firestore security rules.
 *
 * Required env vars:
 *   SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_REDIRECT_URI
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const rawState = searchParams.get("state") ?? "";
    const error = searchParams.get("error");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Parse state: "uid:idToken" — uid has no colons, JWTs have no colons
    const colonIdx = rawState.indexOf(":");
    const uid = colonIdx > -1 ? rawState.slice(0, colonIdx) : rawState;
    const idToken = colonIdx > -1 ? rawState.slice(colonIdx + 1) : "";

    if (error || !code || !uid) {
        const reason = error ?? "missing_code_or_state";
        return NextResponse.redirect(`${appUrl}/settings?slack_error=${reason}`);
    }

    if (!idToken) {
        logger.error("slack/callback", "Missing Firebase ID token in state — cannot authenticate Firestore write");
        return NextResponse.redirect(`${appUrl}/settings?slack_error=missing_auth_token`);
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!clientId || !clientSecret || !redirectUri || !projectId) {
        return NextResponse.redirect(`${appUrl}/settings?slack_error=server_config`);
    }

    try {
        // Exchange code for tokens
        const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
            }),
        });

        const tokenData = (await tokenRes.json()) as {
            ok: boolean;
            error?: string;
            access_token?: string;
            scope?: string;
            bot_user_id?: string;
            team?: { id?: string; name?: string };
            authed_user?: { id?: string; access_token?: string; scope?: string };
        };

        if (!tokenData.ok) {
            logger.error("slack/callback", "Token exchange failed", { error: tokenData.error });
            return NextResponse.redirect(`${appUrl}/settings?slack_error=${tokenData.error ?? "exchange_failed"}`);
        }

        // Write to Firestore via REST API using the user's Firebase ID token as
        // Bearer auth. This satisfies `request.auth != null` security rules —
        // a bare ?key=<webApiKey> is NOT sufficient for auth-protected collections.
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/slack`;
        const firestoreBody = {
            fields: {
                access_token: { stringValue: tokenData.access_token ?? "" },
                bot_user_id: { stringValue: tokenData.bot_user_id ?? "" },
                team_id: { stringValue: tokenData.team?.id ?? "" },
                team_name: { stringValue: tokenData.team?.name ?? "" },
                user_id: { stringValue: tokenData.authed_user?.id ?? "" },
                user_access_token: { stringValue: tokenData.authed_user?.access_token ?? "" },
                granted_bot_scopes: { stringValue: tokenData.scope ?? "" },
                granted_user_scopes: { stringValue: tokenData.authed_user?.scope ?? "" },
                connected_at: { stringValue: new Date().toISOString() },
            },
        };

        const fsRes = await fetch(firestoreUrl, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`,
            },
            body: JSON.stringify(firestoreBody),
        });

        if (!fsRes.ok) {
            const errText = await fsRes.text().catch(() => "(unreadable)");
            logger.error("slack/callback", "Firestore token write failed", { status: fsRes.status, body: errText.slice(0, 300) });
            return NextResponse.redirect(`${appUrl}/settings?slack_error=token_storage_failed`);
        }

        logger.info("slack/callback", "Token stored successfully", { uid, team: tokenData.team?.name ?? "?" });
        return NextResponse.redirect(`${appUrl}/settings?slack_connected=true`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown";
        logger.error("slack/callback", "Unexpected error", { error: msg });
        return NextResponse.redirect(`${appUrl}/settings?slack_error=server_error`);
    }
}
