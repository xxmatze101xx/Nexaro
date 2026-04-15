import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/slack/send
 * Authorization: Bearer <firebase_id_token>
 * Body: { channel: string, text: string }
 *
 * Sends a message to a Slack channel.
 * Tries user token first (has chat:write after re-auth), falls back to bot token silently.
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
            access_token?: { stringValue: string };
            user_id?: { stringValue: string };
        };
    };

    const userToken = fsData.fields?.user_access_token?.stringValue ?? "";
    const botToken  = fsData.fields?.access_token?.stringValue ?? "";
    const slackUserId = fsData.fields?.user_id?.stringValue ?? "";

    if (!userToken && !botToken) {
        return NextResponse.json({ error: "no_token" }, { status: 400 });
    }

    // Resolve the sender's Slack display name + avatar so that bot-token sends
    // can be customized to appear as the actual user rather than "Nexaro".
    // User-token sends already post as the user natively; this is only used
    // when we fall back to the bot token.
    const resolveSenderIdentity = async (): Promise<{ username?: string; icon_url?: string }> => {
        if (!slackUserId) return {};
        const lookupToken = userToken || botToken;
        try {
            const uRes = await fetch(`https://slack.com/api/users.info?user=${slackUserId}`, {
                headers: { Authorization: `Bearer ${lookupToken}` },
            });
            const uData = await uRes.json() as {
                ok: boolean;
                user?: {
                    real_name?: string;
                    name?: string;
                    profile?: {
                        display_name?: string;
                        real_name?: string;
                        image_72?: string;
                        image_48?: string;
                    };
                };
            };
            if (!uData.ok || !uData.user) return {};
            const p = uData.user.profile ?? {};
            const username =
                p.display_name?.trim() ||
                p.real_name?.trim() ||
                uData.user.real_name?.trim() ||
                uData.user.name?.trim() ||
                undefined;
            const icon_url = p.image_72 || p.image_48 || undefined;
            return { username, icon_url };
        } catch {
            return {};
        }
    };

    // Try user token first — it will have chat:write after re-auth.
    // If it returns missing_scope, fall back to bot token silently.
    const tryPost = async (token: string, extra: Record<string, unknown> = {}) => {
        const res = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ channel: body.channel, text: body.text, ...extra }),
        });
        return res.json() as Promise<{ ok: boolean; error?: string }>;
    };

    let sentAsBot = false;
    let sendData: { ok: boolean; error?: string };

    if (userToken) {
        // User token posts as the authenticated Slack user natively.
        sendData = await tryPost(userToken);
        if (!sendData.ok && sendData.error === "missing_scope" && botToken) {
            // Silent fallback to bot token — customize identity so Slack shows
            // the user's name instead of "Nexaro".
            const identity = await resolveSenderIdentity();
            sendData = await tryPost(botToken, identity);
            sentAsBot = true;
        }
    } else {
        // Bot-token-only: customize identity to the authenticated user.
        const identity = await resolveSenderIdentity();
        sendData = await tryPost(botToken, identity);
        sentAsBot = true;
    }

    if (!sendData.ok) {
        logger.error("slack/send", "chat.postMessage failed", { error: sendData.error, channel: body.channel });
        return NextResponse.json({ error: sendData.error }, { status: 500 });
    }

    logger.info("slack/send", "Message sent", { channel: body.channel, sentAsBot });

    return NextResponse.json({ ok: true, ...(sentAsBot ? { sentAsBot: true } : {}) });
}
