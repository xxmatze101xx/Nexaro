import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { REQUIRED_SCOPES, checkMissingScopes } from "@/lib/oauth-scopes";

/**
 * GET /api/slack/messages?channel=<channelId>
 * Authorization: Bearer <firebase_id_token>
 *
 * Fetches conversation history from Slack and resolves user display names.
 * Uses the user token (xoxp-) for accurate member/permission context.
 */

async function getSlackToken(idToken: string, projectId: string): Promise<{
    userToken: string;
    botToken: string;
    grantedBotScopes: string;
    grantedUserScopes: string;
} | null> {
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
            granted_bot_scopes?: { stringValue: string };
            granted_user_scopes?: { stringValue: string };
        };
    };
    return {
        userToken: fsData.fields?.user_access_token?.stringValue || "",
        botToken:  fsData.fields?.access_token?.stringValue || "",
        grantedBotScopes: fsData.fields?.granted_bot_scopes?.stringValue ?? "",
        grantedUserScopes: fsData.fields?.granted_user_scopes?.stringValue ?? "",
    };
}

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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channel");
    const oldest = searchParams.get("oldest");   // incremental sync cursor (unix ts string)
    const limitParam = searchParams.get("limit");
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

    // Scope validation: only if granted scopes were recorded (tokens stored after this feature was deployed)
    if (tokens.grantedBotScopes) {
        const missingScopes = checkMissingScopes(tokens.grantedBotScopes, REQUIRED_SCOPES.slack_bot);
        if (missingScopes.length > 0) {
            logger.warn("slack/messages", "Token missing required bot scopes", { missingScopes });
            return NextResponse.json({ error: "scope_upgrade_required", missingScopes, messages: [] }, { status: 403 });
        }
    }

    // Use user token (xoxp-) for conversations.history — the user is already a member of their channels,
    // so this avoids "not_in_channel" errors that occur when the bot hasn't been invited.
    const historyToken = tokens.userToken || tokens.botToken;
    const usersToken   = tokens.userToken || tokens.botToken;

    if (!historyToken) {
        return NextResponse.json({ error: "no_token", messages: [] }, { status: 400 });
    }

    // ── Get current user's Slack ID via auth.test ────────────────────────────
    let currentSlackUserId: string | null = null;
    try {
        const authTestRes = await fetch("https://slack.com/api/auth.test", {
            headers: { Authorization: `Bearer ${historyToken}` },
        });
        const authTestData = await authTestRes.json() as { ok: boolean; user_id?: string };
        if (authTestData.ok && authTestData.user_id) {
            currentSlackUserId = authTestData.user_id;
        }
    } catch {
        // non-fatal — currentSlackUserId stays null
    }

    // ── Fetch conversation history ───────────────────────────────────────────
    const historyParams = new URLSearchParams({
        channel: channelId,
        limit: limitParam ?? "50",
    });
    if (oldest) historyParams.set("oldest", oldest);

    const histRes = await fetch(
        `https://slack.com/api/conversations.history?${historyParams.toString()}`,
        { headers: { Authorization: `Bearer ${historyToken}` } }
    );
    const histData = await histRes.json() as {
        ok: boolean;
        error?: string;
        messages?: RawSlackMessage[];
    };

    if (!histData.ok) {
        logger.error("slack/messages", "conversations.history failed", { error: histData.error, channel: channelId });
        return NextResponse.json({ error: histData.error, messages: [] });
    }

    logger.info("slack/messages", "Messages fetched", { channel: channelId, count: (histData.messages ?? []).length });

    // Reverse to chronological order; skip subtypes (join/leave events)
    const raw = (histData.messages ?? [])
        .filter(m => !m.subtype)
        .reverse();

    // ── Resolve user display names and avatars ───────────────────────────────
    const uniqueUsers = [...new Set(raw.map(m => m.user).filter((u): u is string => !!u))];
    const userMap: Record<string, { name: string; avatar?: string }> = {};

    await Promise.all(
        uniqueUsers.slice(0, 15).map(async userId => {
            try {
                const uRes = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
                    headers: { Authorization: `Bearer ${usersToken}` },
                });
                const uData = await uRes.json() as {
                    ok: boolean;
                    user?: {
                        real_name?: string;
                        display_name?: string;
                        name?: string;
                        profile?: { image_72?: string; image_48?: string };
                    };
                };
                if (uData.ok && uData.user) {
                    userMap[userId] = {
                        name: uData.user.real_name || uData.user.display_name || uData.user.name || userId,
                        avatar: uData.user.profile?.image_72 || uData.user.profile?.image_48,
                    };
                }
            } catch {
                // ignore individual user fetch failures
            }
        })
    );

    const messages = raw.map(m => ({
        ts:          m.ts,
        user:        m.user ?? "app",
        userName:    (m.user ? userMap[m.user]?.name : m.username) ?? m.user ?? "Slack Bot",
        avatarUrl:   m.user ? userMap[m.user]?.avatar : undefined,
        text:        m.text ?? "",
        reactions:   m.reactions,
        reply_count: m.reply_count,
        thread_ts:   m.thread_ts,
    }));

    return NextResponse.json({ messages, currentSlackUserId });
}
