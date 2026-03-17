import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/slack/react
 * Authorization: Bearer <firebase_id_token>
 * Body: { channel: string, timestamp: string, emoji: string, action: "add" | "remove" }
 *
 * Adds or removes an emoji reaction on a Slack message.
 * Tries user token first, falls back to bot token if missing_scope.
 */
export async function POST(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7);
    if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as {
        channel?: string;
        timestamp?: string;
        emoji?: string;
        action?: string;
    };

    if (!body.channel || !body.timestamp || !body.emoji || !body.action) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    if (body.action !== "add" && body.action !== "remove") {
        return NextResponse.json({ error: "invalid_action" }, { status: 400 });
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

    // Read Slack tokens from Firestore
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

    const endpoint = body.action === "add"
        ? "https://slack.com/api/reactions.add"
        : "https://slack.com/api/reactions.remove";

    const payload = {
        channel:   body.channel,
        timestamp: body.timestamp,
        name:      body.emoji,
    };

    const tryReact = async (token: string) => {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
        });
        return res.json() as Promise<{ ok: boolean; error?: string }>;
    };

    let reactData: { ok: boolean; error?: string };

    if (userToken) {
        reactData = await tryReact(userToken);
        if (!reactData.ok && reactData.error === "missing_scope" && botToken) {
            reactData = await tryReact(botToken);
        }
    } else {
        reactData = await tryReact(botToken);
    }

    if (!reactData.ok) {
        // already_reacted / no_reaction are soft errors — treat as ok
        if (reactData.error === "already_reacted" || reactData.error === "no_reaction") {
            return NextResponse.json({ ok: true });
        }
        logger.error("slack/react", `reactions.${body.action} failed`, {
            error: reactData.error,
            channel: body.channel,
            emoji: body.emoji,
        });
        return NextResponse.json({ error: reactData.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
