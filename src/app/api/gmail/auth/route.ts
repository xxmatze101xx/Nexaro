import { NextResponse } from "next/server";

/**
 * GET /api/gmail/auth
 *
 * Server-side Gmail OAuth initiation — uses GOOGLE_REDIRECT_URI env var
 * so authorization and exchange always use the same redirect URI.
 */
export async function GET() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${appUrl}/settings`;

    if (!clientId) {
        return NextResponse.json({ error: "Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID" }, { status: 500 });
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send",
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "false",
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
