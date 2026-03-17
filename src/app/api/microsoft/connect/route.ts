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
    const idToken = searchParams.get("idToken") ?? "";
    const service = searchParams.get("service") ?? "outlook"; // "outlook" | "teams"

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

    const baseScopes = ["offline_access", "User.Read"];
    const outlookScopes = ["Mail.Read", "Mail.Send", "Calendars.Read"];
    const teamsScopes = ["Chat.Read"];

    const scopes = [
        ...baseScopes,
        ...(service === "teams" ? teamsScopes : outlookScopes),
    ].join(" ");

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: scopes,
        response_mode: "query",
        // Pass Firebase UID + idToken as JSON `state` so the callback can authenticate
        // the Firestore REST write with Bearer auth (same pattern as Slack).
        state: JSON.stringify({ uid, idToken }),
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    return NextResponse.redirect(authUrl);
}
