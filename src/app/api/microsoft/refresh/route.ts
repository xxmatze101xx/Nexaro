import { NextResponse } from "next/server";

/**
 * POST /api/microsoft/refresh
 * Body: { refresh_token: string }
 * Response: { access_token: string; expires_in: number }
 *
 * Exchanges a Microsoft refresh token for a new access token.
 * Required env vars: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI
 */
export async function POST(request: Request) {
    let body: { refresh_token?: string };
    try {
        body = (await request.json()) as { refresh_token?: string };
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { refresh_token } = body;
    if (!refresh_token) {
        return NextResponse.json({ error: "Missing refresh_token." }, { status: 400 });
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        return NextResponse.json({ error: "Microsoft OAuth is not configured." }, { status: 500 });
    }

    const scopes = [
        "offline_access",
        "User.Read",
        "Mail.Read",
        "Mail.Send",
        "Calendars.Read",
        "Chat.Read",
    ].join(" ");

    try {
        const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token,
                redirect_uri: redirectUri,
                grant_type: "refresh_token",
                scope: scopes,
            }),
        });

        const data = (await tokenRes.json()) as {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
            error?: string;
            error_description?: string;
        };

        if (!tokenRes.ok || !data.access_token) {
            console.error("Microsoft token refresh failed:", data.error_description);
            return NextResponse.json(
                { error: data.error_description ?? "Token refresh failed." },
                { status: 502 }
            );
        }

        return NextResponse.json({
            access_token: data.access_token,
            refresh_token: data.refresh_token ?? refresh_token,
            expires_in: data.expires_in ?? 3600,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown";
        console.error("Microsoft refresh error:", msg);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
