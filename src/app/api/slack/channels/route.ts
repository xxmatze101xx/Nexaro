import { NextResponse } from "next/server";

/**
 * GET /api/slack/channels
 * Authorization: Bearer <firebase_id_token>
 *
 * Server-side proxy for Slack conversations.list.
 * Reads the stored token from Firestore and calls Slack on behalf of the user.
 * All errors are logged server-side (visible in Vercel logs).
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7); // strip "Bearer "

    if (!idToken) {
        return NextResponse.json({ error: "unauthorized", channels: [] }, { status: 401 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

    if (!projectId) {
        return NextResponse.json({ error: "server_config", channels: [] }, { status: 500 });
    }

    // ── 1. Verify ID token → get uid ─────────────────────────────────────────
    const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        }
    );
    if (!verifyRes.ok) {
        console.error(`[slack/channels] token verify failed: ${verifyRes.status}`);
        return NextResponse.json({ error: "token_verify_failed", channels: [] }, { status: 401 });
    }
    const verifyData = await verifyRes.json() as { users?: Array<{ localId: string }> };
    const uid = verifyData.users?.[0]?.localId;
    if (!uid) {
        console.error("[slack/channels] uid not found in verify response");
        return NextResponse.json({ error: "uid_not_found", channels: [] }, { status: 401 });
    }

    // ── 2. Read Slack token from Firestore ────────────────────────────────────
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/slack?key=${apiKey}`;
    const fsRes = await fetch(fsUrl, {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (fsRes.status === 404) {
        return NextResponse.json({ error: "slack_not_connected", channels: [] });
    }
    if (!fsRes.ok) {
        console.error(`[slack/channels] Firestore read failed: status=${fsRes.status}`);
        return NextResponse.json({ error: "firestore_error", channels: [] }, { status: 500 });
    }

    const fsData = await fsRes.json() as {
        fields?: {
            user_access_token?: { stringValue: string };
            access_token?: { stringValue: string };
        };
    };

    const userToken = fsData.fields?.user_access_token?.stringValue ?? "";
    const botToken  = fsData.fields?.access_token?.stringValue ?? "";
    const token     = userToken || botToken;
    const tokenType = userToken ? "user(xoxp)" : "bot(xoxb)";

    if (!token) {
        console.error("[slack/channels] no token in Firestore document");
        return NextResponse.json({ error: "no_token", channels: [] });
    }

    console.log(`[slack/channels] uid=${uid} using token_type=${tokenType}`);

    // ── 3. Call Slack conversations.list ─────────────────────────────────────
    const slackRes = await fetch(
        "https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200",
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const slackData = await slackRes.json() as {
        ok: boolean;
        error?: string;
        needed?: string;
        channels?: Array<{ id: string; name: string; is_private: boolean; is_member: boolean }>;
    };

    if (!slackData.ok) {
        console.error(
            `[slack/channels] Slack API error: ${slackData.error}` +
            (slackData.needed ? ` (needs scope: ${slackData.needed})` : "") +
            ` token_type=${tokenType}`
        );
        return NextResponse.json({
            error: slackData.error,
            needed_scope: slackData.needed,
            token_type: tokenType,
            channels: [],
        });
    }

    const allChannels = slackData.channels ?? [];
    const memberChannels = allChannels.filter(c => c.is_member);

    console.log(
        `[slack/channels] total=${allChannels.length} member=${memberChannels.length} token_type=${tokenType}`
    );

    const sorted = memberChannels
        .map(c => ({ id: c.id, name: c.name, is_private: c.is_private, is_member: c.is_member }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ channels: sorted, token_type: tokenType });
}
