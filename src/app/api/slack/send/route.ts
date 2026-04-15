import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/slack/send
 * Authorization: Bearer <firebase_id_token>
 * Body: { channel: string, text: string }
 *
 * Sends a message to a Slack channel AS THE AUTHENTICATED USER.
 *
 * We MUST use the user token (xoxp-) so the message appears under the user's
 * own Slack display name. The bot token (xoxb-) would post as "@Nexaro",
 * which defeats the purpose — so we never fall back to it for sending.
 *
 * If the stored user token lacks the `chat:write` user scope (e.g. the user
 * connected Slack before this scope was required), we return
 * `scope_upgrade_required` so the UI can prompt a reconnect.
 */
export async function POST(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7);
    if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as { channel?: string; text?: string };
    if (!body.channel || !body.text?.trim()) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

    // Verify ID token → uid
    const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) }
    );
    if (!verifyRes.ok) return NextResponse.json({ error: "auth_failed" }, { status: 401 });
    const verifyData = await verifyRes.json() as { users?: Array<{ localId: string }> };
    const uid = verifyData.users?.[0]?.localId;
    if (!uid) return NextResponse.json({ error: "uid_not_found" }, { status: 401 });

    // Read Slack token
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/slack`;
    const fsRes = await fetch(fsUrl, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!fsRes.ok) return NextResponse.json({ error: "no_token" }, { status: 400 });
    const fsData = await fsRes.json() as {
        fields?: {
            user_access_token?: { stringValue: string };
            granted_user_scopes?: { stringValue: string };
        };
    };

    const userToken = fsData.fields?.user_access_token?.stringValue ?? "";
    const grantedUserScopes = fsData.fields?.granted_user_scopes?.stringValue ?? "";

    // We MUST post as the user — no bot-token fallback, since that would show "Nexaro".
    if (!userToken) {
        return NextResponse.json(
            { error: "scope_upgrade_required", missingScopes: ["chat:write"] },
            { status: 403 }
        );
    }

    // If we recorded the granted user scopes at connect time and they don't
    // include chat:write, short-circuit and prompt re-auth. (Older connections
    // that predate the granted-scopes field will skip this check and rely on
    // Slack's own error response below.)
    if (grantedUserScopes) {
        const granted = new Set(grantedUserScopes.split(",").map(s => s.trim()).filter(Boolean));
        if (!granted.has("chat:write")) {
            return NextResponse.json(
                { error: "scope_upgrade_required", missingScopes: ["chat:write"] },
                { status: 403 }
            );
        }
    }

    // Post with the user token so the message appears under the user's own
    // Slack display name (e.g. "Matteo"), not the "@Nexaro" bot.
    const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ channel: body.channel, text: body.text }),
    });
    const sendData = await res.json() as { ok: boolean; error?: string };

    if (!sendData.ok) {
        // A legacy token without chat:write will get `missing_scope` / `not_allowed_token_type`
        // from Slack — surface this as a re-auth prompt rather than a generic error.
        if (sendData.error === "missing_scope" || sendData.error === "not_allowed_token_type") {
            logger.warn("slack/send", "User token lacks chat:write — prompting re-auth", { error: sendData.error });
            return NextResponse.json(
                { error: "scope_upgrade_required", missingScopes: ["chat:write"] },
                { status: 403 }
            );
        }
        logger.error("slack/send", "chat.postMessage failed", { error: sendData.error, channel: body.channel });
        return NextResponse.json({ error: sendData.error }, { status: 500 });
    }

    logger.info("slack/send", "Message sent as user", { channel: body.channel });

    return NextResponse.json({ ok: true });
}
