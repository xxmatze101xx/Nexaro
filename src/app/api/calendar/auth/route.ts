import { NextResponse } from "next/server";

/**
 * GET /api/calendar/auth
 *
 * Server-side Google Calendar OAuth initiation — uses GOOGLE_REDIRECT_URI env var
 * so authorization and exchange always use the same redirect URI.
 * Only calendar scopes are requested (openid + email for account identification).
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
        // openid + email: minimal OIDC scopes to identify the account — no Gmail access
        scope: "openid email https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "false",
        state: "calendar",
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
