import { NextResponse } from "next/server";

/**
 * GET /api/slack/callback?code=<auth_code>&state=<uid>
 *
 * Exchanges the Slack OAuth code for access + bot tokens and stores them
 * in Firestore under users/{uid}/tokens/slack via Firestore REST API.
 *
 * Required env vars:
 *   SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_REDIRECT_URI
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   FIREBASE_ADMIN_API_KEY (server-side key for Firestore REST writes)
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const uid = searchParams.get("state");
    const error = searchParams.get("error");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (error || !code || !uid) {
        const reason = error ?? "missing_code_or_state";
        return NextResponse.redirect(`${appUrl}/settings?slack_error=${reason}`);
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
            bot_user_id?: string;
            team?: { id?: string; name?: string };
            authed_user?: { id?: string; access_token?: string };
        };

        if (!tokenData.ok) {
            console.error("Slack token exchange failed:", tokenData.error);
            return NextResponse.redirect(`${appUrl}/settings?slack_error=${tokenData.error ?? "exchange_failed"}`);
        }

        // Write to Firestore via REST API
        // Document path: users/{uid}/tokens/slack
        // The ?key= param authenticates the request using the Firebase Web API key,
        // which is required for Firestore REST writes from server-side code without firebase-admin.
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/slack?key=${apiKey}`;
        const firestoreBody = {
            fields: {
                access_token: { stringValue: tokenData.access_token ?? "" },
                bot_user_id: { stringValue: tokenData.bot_user_id ?? "" },
                team_id: { stringValue: tokenData.team?.id ?? "" },
                team_name: { stringValue: tokenData.team?.name ?? "" },
                user_id: { stringValue: tokenData.authed_user?.id ?? "" },
                user_access_token: { stringValue: tokenData.authed_user?.access_token ?? "" },
                connected_at: { stringValue: new Date().toISOString() },
            },
        };

        await fetch(firestoreUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(firestoreBody),
        });

        return NextResponse.redirect(`${appUrl}/settings?slack_connected=true`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown";
        console.error("Slack callback error:", msg);
        return NextResponse.redirect(`${appUrl}/settings?slack_error=server_error`);
    }
}
