import { NextResponse } from "next/server";

/**
 * GET /api/slack/connect?uid=<firebase_uid>
 *
 * Redirects the user to Slack's OAuth authorization page.
 * Required env vars: SLACK_CLIENT_ID, SLACK_REDIRECT_URI
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
        return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { error: "Slack OAuth is not configured (missing SLACK_CLIENT_ID or SLACK_REDIRECT_URI)" },
            { status: 500 }
        );
    }

    const scopes = [
        "channels:history",
        "im:history",
        "im:read",
        "users:read",
        "chat:write",
    ].join(",");

    const params = new URLSearchParams({
        client_id: clientId,
        scope: scopes,
        redirect_uri: redirectUri,
        // Pass the Firebase UID as `state` so we can associate the token on callback
        state: uid,
    });

    const authUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
    return NextResponse.redirect(authUrl);
}
