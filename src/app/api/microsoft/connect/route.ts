import { NextResponse } from "next/server";

/**
 * GET /api/microsoft/connect?uid=<firebase_uid>
 *
 * Redirects the user to Microsoft's OAuth authorization page.
 * Required env vars: MICROSOFT_CLIENT_ID, MICROSOFT_REDIRECT_URI
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
        return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { error: "Microsoft OAuth is not configured (missing MICROSOFT_CLIENT_ID or MICROSOFT_REDIRECT_URI)" },
            { status: 500 }
        );
    }

    const scopes = [
        "offline_access",
        "User.Read",
        "Mail.Read",
        "Mail.Send",
        "Calendars.Read",
        "Chat.Read",
    ].join(" ");

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: scopes,
        response_mode: "query",
        // Pass Firebase UID as `state` so we can associate the token on callback
        state: uid,
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    return NextResponse.redirect(authUrl);
}
