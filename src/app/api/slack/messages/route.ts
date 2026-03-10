import { NextResponse } from "next/server";

/**
 * GET /api/slack/messages?channel=<channelId>
 * Authorization: Bearer <firebase_id_token>
 *
 * Fetches conversation history from Slack and resolves user display names.
 * Uses the user token (xoxp-) for accurate member/permission context.
 */

async function getSlackToken(idToken: string, projectId: string): Promise<{ userToken: string; botToken: string } | null> {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

    // Verify ID token → uid
    const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) }
    );
    if (!verifyRes.ok) return null;
    const verifyData = await verifyRes.json() as { users?: Array<{ localId: string }> };
    const uid = verifyData.users?.[0]?.localId;
    if (!uid) return null;

    // Read Slack tokens from Firestore
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/slack`;
    const fsRes = await fetch(fsUrl, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!fsRes.ok) return null;
    const fsData = await fsRes.json() as {
        fields?: {
            user_access_token?: { stringValue: string };
            access_token?: { stringValue: string };
        };
    };
    return {
        userToken: fsData.fields?.user_access_token?.stringValue || "",
        botToken:  fsData.fields?.access_token?.stringValue || "",
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channel");
    const authHeader  = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7);

    if (!idToken || !channelId) {
        return NextResponse.json({ error: "missing_params", messages: [] }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
    const tokens = await getSlackToken(idToken, projectId);
    if (!tokens) {
        return NextResponse.json({ error: "auth_failed", messages: [] }, { status: 401 });
    }

    const token = tokens.userToken || tokens.botToken;
    if (!token) {
        return NextResponse.json({ error: "no_token", messages: [] }, { status: 400 });
    }

    // ── Fetch conversation history ───────────────────────────────────────────
    const histRes = await fetch(
        `https://slack.com/api/conversations.history?channel=${channelId}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const histData = await histRes.json() as {
        ok: boolean;
        error?: string;
        messages?: Array<{ ts: string; user?: string; text?: string; subtype?: string; username?: string }>;
    };

    if (!histData.ok) {
        console.error(`[slack/messages] conversations.history error=${histData.error} channel=${channelId}`);
        return NextResponse.json({ error: histData.error, messages: [] });
    }

    // Reverse to chronological order; skip subtypes (join/leave events)
    const raw = (histData.messages ?? [])
        .filter(m => !m.subtype)
        .reverse();

    // ── Resolve user display names ───────────────────────────────────────────
    const uniqueUsers = [...new Set(raw.map(m => m.user).filter((u): u is string => !!u))];
    const userMap: Record<string, { name: string }> = {};

    await Promise.all(
        uniqueUsers.slice(0, 15).map(async userId => {
            try {
                const uRes = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const uData = await uRes.json() as {
                    ok: boolean;
                    user?: { real_name?: string; display_name?: string; name?: string };
                };
                if (uData.ok && uData.user) {
                    userMap[userId] = {
                        name: uData.user.real_name || uData.user.display_name || uData.user.name || userId,
                    };
                }
            } catch {
                // ignore individual user fetch failures
            }
        })
    );

    const messages = raw.map(m => ({
        ts:       m.ts,
        user:     m.user ?? "app",
        userName: (m.user ? userMap[m.user]?.name : m.username) ?? m.user ?? "Slack Bot",
        text:     m.text ?? "",
    }));

    return NextResponse.json({ messages });
}
