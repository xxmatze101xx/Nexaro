import { NextResponse } from "next/server";

/**
 * GET /api/slack/connect?uid=<firebase_uid>&idToken=<firebase_id_token>
 *
 * Redirects the user to Slack's OAuth authorization page.
 * The Firebase ID token is encoded into the OAuth state so the callback
 * can use it to authenticate the Firestore REST write (Bearer auth).
 *
 * Required env vars: SLACK_CLIENT_ID, SLACK_REDIRECT_URI
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    const idToken = searchParams.get("idToken") ?? "";

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
        "channels:read",    // list public channels (conversations.list)
        "channels:history", // read public channel messages
        "groups:read",      // list private channels
        "groups:history",   // read private channel messages
        "im:read",          // list DMs
        "im:history",       // read DM messages
        "mpim:read",        // list group DMs
        "users:read",       // resolve user IDs to names
        "chat:write",       // send messages
    ].join(",");

    // Encode uid and Firebase ID token together in state — the callback needs
    // the ID token to authenticate the Firestore REST write via Bearer auth.
    // Format: "<uid>:<idToken>"  (uid has no colons, JWTs have no colons)
    const state = idToken ? `${uid}:${idToken}` : uid;

    const params = new URLSearchParams({
        client_id: clientId,
        scope: scopes,
        redirect_uri: redirectUri,
        state,
    });

    const authUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
    return NextResponse.redirect(authUrl);
}
