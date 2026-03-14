import { NextResponse } from "next/server";
import { REQUIRED_SCOPES, checkMissingScopes } from "@/lib/oauth-scopes";

/**
 * GET /api/slack/check-scopes
 * Authorization: Bearer <firebase_id_token>
 *
 * Reads granted_bot_scopes and granted_user_scopes from the stored Slack token
 * in Firestore and compares them against REQUIRED_SCOPES. Returns which scopes
 * (if any) are missing — no Slack API call is made.
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7);

    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

    if (!projectId) {
        return NextResponse.json({ error: "server_config" }, { status: 500 });
    }

    // Verify ID token → uid
    const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        }
    );
    if (!verifyRes.ok) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }
    const verifyData = await verifyRes.json() as { users?: Array<{ localId: string }> };
    const uid = verifyData.users?.[0]?.localId;
    if (!uid) {
        return NextResponse.json({ error: "uid_not_found" }, { status: 401 });
    }

    // Read Slack token document from Firestore
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/slack`;
    const fsRes = await fetch(fsUrl, { headers: { Authorization: `Bearer ${idToken}` } });

    if (fsRes.status === 404) {
        return NextResponse.json({ error: "slack_not_connected" }, { status: 404 });
    }
    if (!fsRes.ok) {
        return NextResponse.json({ error: "firestore_error" }, { status: 500 });
    }

    const fsData = await fsRes.json() as {
        fields?: {
            granted_bot_scopes?: { stringValue: string };
            granted_user_scopes?: { stringValue: string };
        };
    };

    const grantedBotScopes = fsData.fields?.granted_bot_scopes?.stringValue ?? "";
    const grantedUserScopes = fsData.fields?.granted_user_scopes?.stringValue ?? "";

    // Only validate if granted scopes were recorded (i.e. token was obtained after this feature was deployed)
    const missingBotScopes = grantedBotScopes
        ? checkMissingScopes(grantedBotScopes, REQUIRED_SCOPES.slack_bot)
        : [];
    const missingUserScopes = grantedUserScopes
        ? checkMissingScopes(grantedUserScopes, REQUIRED_SCOPES.slack_user)
        : [];

    const needsUpgrade = missingBotScopes.length > 0 || missingUserScopes.length > 0;

    return NextResponse.json({ needsUpgrade, missingBotScopes, missingUserScopes });
}
