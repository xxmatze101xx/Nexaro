import { NextResponse } from "next/server";

/**
 * GET /api/microsoft/callback?code=<auth_code>&state=<uid>
 *
 * Exchanges the Microsoft OAuth code for access + refresh tokens,
 * fetches the user's profile, and stores everything in Firestore
 * under users/{uid}/tokens/microsoft via Firestore REST API.
 *
 * Required env vars:
 *   MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const uid = searchParams.get("state");
    const error = searchParams.get("error");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (error || !code || !uid) {
        const reason = error ?? "missing_code_or_state";
        return NextResponse.redirect(`${appUrl}/settings?microsoft_error=${reason}`);
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!clientId || !clientSecret || !redirectUri || !projectId) {
        return NextResponse.redirect(`${appUrl}/settings?microsoft_error=server_config`);
    }

    try {
        // Exchange code for tokens
        const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
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
            console.error("Microsoft token exchange failed:", tokenData.error_description);
            return NextResponse.redirect(
                `${appUrl}/settings?microsoft_error=${tokenData.error ?? "exchange_failed"}`
            );
        }

        // Fetch user profile from Microsoft Graph
        const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = profileRes.ok
            ? ((await profileRes.json()) as { id?: string; mail?: string; displayName?: string })
            : {};

        // Write to Firestore via REST API
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/microsoft`;
        const firestoreBody = {
            fields: {
                access_token: { stringValue: tokenData.access_token },
                refresh_token: { stringValue: tokenData.refresh_token ?? "" },
                expires_in: { integerValue: String(tokenData.expires_in ?? 3600) },
                token_acquired_at: { integerValue: String(Date.now()) },
                user_id: { stringValue: profile.id ?? "" },
                email: { stringValue: profile.mail ?? "" },
                display_name: { stringValue: profile.displayName ?? "" },
                connected_at: { stringValue: new Date().toISOString() },
            },
        };

        await fetch(firestoreUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(firestoreBody),
        });

        return NextResponse.redirect(`${appUrl}/settings?microsoft_connected=true`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown";
        console.error("Microsoft callback error:", msg);
        return NextResponse.redirect(`${appUrl}/settings?microsoft_error=server_error`);
    }
}
