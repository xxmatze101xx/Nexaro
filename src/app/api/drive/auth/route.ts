import { NextResponse } from "next/server";

/**
 * GET /api/drive/auth?uid=<firebase_uid>
 *
 * Initiates Google Drive OAuth flow.
 * Required env vars: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_REDIRECT_URI
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
        return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { error: "Google Drive OAuth is not configured (missing GOOGLE_DRIVE_CLIENT_ID or GOOGLE_DRIVE_REDIRECT_URI)" },
            { status: 500 }
        );
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/drive.readonly",
        access_type: "offline",
        prompt: "consent",
        // Only uid in state — no idToken (avoids expiry issues; client handles Firestore write)
        state: JSON.stringify({ uid }),
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
