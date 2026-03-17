import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * GET  /api/slack/thread?channel=C&thread_ts=T
 *   Fetches replies in a thread via conversations.replies.
 *   Returns { messages, currentSlackUserId }
 *
 * POST /api/slack/thread
 *   Body: { channel: string, thread_ts: string, text: string }
 *   Posts a reply in a thread via chat.postMessage with thread_ts.
 *   Returns { ok: true }
 *
 * Authorization: Bearer <firebase_id_token>
 */

interface SlackReaction {
    name: string;
    count: number;
    users: string[];
}

interface RawSlackMessage {
    ts: string;
    user?: string;
    text?: string;
    subtype?: string;
    username?: string;
    reactions?: SlackReaction[];
    reply_count?: number;
    thread_ts?: string;
}

async function getTokens(idToken: string): Promise<{
    userToken: string;
    botToken: string;
} | null> {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

    const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) }
    );
    if (!verifyRes.ok) return null;
    const verifyData = await verifyRes.json() as { users?: Array<{ localId: string }> };
    const uid = verifyData.users?.[0]?.localId;
    if (!uid) return null;

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
        userToken: fsData.fields?.user_access_token?.stringValue ?? "",
        botToken:  fsData.fields?.access_token?.stringValue ?? "",
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channel");
    const threadTs  = searchParams.get("thread_ts");
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7);

    if (!idToken || !channelId || !threadTs) {
        return NextResponse.json({ error: "missing_params", messages: [] }, { status: 400 });
    }

    const tokens = await getTokens(idToken);
    if (!tokens) {
        return NextResponse.json({ error: "auth_failed", messages: [] }, { status: 401 });
    }

    const token = tokens.userToken || tokens.botToken;
    if (!token) {
        return NextResponse.json({ error: "no_token", messages: [] }, { status: 400 });
    }

    // Get current user's Slack ID
    let currentSlackUserId: string | null = null;
    try {
        const authTestRes = await fetch("https://slack.com/api/auth.test", {
            headers: { Authorization: `Bearer ${token}` },
        });
        const authTestData = await authTestRes.json() as { ok: boolean; user_id?: string };
        if (authTestData.ok && authTestData.user_id) {
            currentSlackUserId = authTestData.user_id;
        }
    } catch {
        // non-fatal
    }

    // Fetch thread replies
    const params = new URLSearchParams({ channel: channelId, ts: threadTs });
    const repliesRes = await fetch(
        `https://slack.com/api/conversations.replies?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const repliesData = await repliesRes.json() as {
        ok: boolean;
        error?: string;
        messages?: RawSlackMessage[];
    };

    if (!repliesData.ok) {
        logger.error("slack/thread", "conversations.replies failed", { error: repliesData.error, channel: channelId, threadTs });
        return NextResponse.json({ error: repliesData.error, messages: [] });
    }

    const raw = (repliesData.messages ?? []).filter(m => !m.subtype);

    // Resolve user display names
    const uniqueUsers = [...new Set(raw.map(m => m.user).filter((u): u is string => !!u))];
    const userMap: Record<string, string> = {};

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
                    userMap[userId] = uData.user.real_name || uData.user.display_name || uData.user.name || userId;
                }
            } catch {
                // ignore
            }
        })
    );

    const messages = raw.map(m => ({
        ts:          m.ts,
        user:        m.user ?? "app",
        userName:    (m.user ? userMap[m.user] : m.username) ?? m.user ?? "Slack Bot",
        text:        m.text ?? "",
        reactions:   m.reactions,
        reply_count: m.reply_count,
        thread_ts:   m.thread_ts,
    }));

    return NextResponse.json({ messages, currentSlackUserId });
}

export async function POST(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7);
    if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as { channel?: string; thread_ts?: string; text?: string };
    if (!body.channel || !body.thread_ts || !body.text?.trim()) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const tokens = await getTokens(idToken);
    if (!tokens) {
        return NextResponse.json({ error: "auth_failed" }, { status: 401 });
    }

    const userToken = tokens.userToken;
    const botToken  = tokens.botToken;

    if (!userToken && !botToken) {
        return NextResponse.json({ error: "no_token" }, { status: 400 });
    }

    const tryPost = async (token: string) => {
        const res = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                channel:   body.channel,
                text:      body.text,
                thread_ts: body.thread_ts,
            }),
        });
        return res.json() as Promise<{ ok: boolean; error?: string }>;
    };

    let sendData: { ok: boolean; error?: string };

    if (userToken) {
        sendData = await tryPost(userToken);
        if (!sendData.ok && sendData.error === "missing_scope" && botToken) {
            sendData = await tryPost(botToken);
        }
    } else {
        sendData = await tryPost(botToken);
    }

    if (!sendData.ok) {
        logger.error("slack/thread", "chat.postMessage (reply) failed", {
            error: sendData.error,
            channel: body.channel,
            thread_ts: body.thread_ts,
        });
        return NextResponse.json({ error: sendData.error }, { status: 500 });
    }

    logger.info("slack/thread", "Thread reply sent", { channel: body.channel, thread_ts: body.thread_ts });

    return NextResponse.json({ ok: true });
}
