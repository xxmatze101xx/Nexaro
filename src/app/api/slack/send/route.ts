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
        };
    };

    const userToken = fsData.fields?.user_access_token?.stringValue ?? "";
    const botToken  = fsData.fields?.access_token?.stringValue ?? "";

    if (!userToken && !botToken) {
        return NextResponse.json({ error: "no_token" }, { status: 400 });
    }

    // Try user token first — it will have chat:write after re-auth.
    // If it returns missing_scope, fall back to bot token silently.
    const tryPost = async (token: string) => {
        const res = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ channel: body.channel, text: body.text }),
        });
        return res.json() as Promise<{ ok: boolean; error?: string }>;
    };

    let sentAsBot = false;
    let sendData: { ok: boolean; error?: string };

    if (userToken) {
        sendData = await tryPost(userToken);
        if (!sendData.ok && sendData.error === "missing_scope" && botToken) {
            // Silent fallback to bot token
            sendData = await tryPost(botToken);
            sentAsBot = true;
        }
    } else {
        sendData = await tryPost(botToken);
        sentAsBot = true;
    }

    if (!sendData.ok) {
        logger.error("slack/send", "chat.postMessage failed", { error: sendData.error, channel: body.channel });
        return NextResponse.json({ error: sendData.error }, { status: 500 });
    }

    logger.info("slack/send", "Message sent", { channel: body.channel, sentAsBot });

    return NextResponse.json({ ok: true, ...(sentAsBot ? { sentAsBot: true } : {}) });
}
