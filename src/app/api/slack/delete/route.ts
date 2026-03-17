import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/slack/delete
 * Authorization: Bearer <firebase_id_token>
 * Body: { channel: string, ts: string }
 *
 * Deletes a Slack message.
 * Tries user token first, falls back to bot token if missing_scope.
 */
export async function POST(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7);
    if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as { channel?: string; ts?: string };
    if (!body.channel || !body.ts) {
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

    const tryDelete = async (token: string) => {
        const res = await fetch("https://slack.com/api/chat.delete", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ channel: body.channel, ts: body.ts }),
        });
        return res.json() as Promise<{ ok: boolean; error?: string }>;
    };

    let deleteData: { ok: boolean; error?: string };

    if (userToken) {
        deleteData = await tryDelete(userToken);
        if (!deleteData.ok && deleteData.error === "missing_scope" && botToken) {
            deleteData = await tryDelete(botToken);
        }
    } else {
        deleteData = await tryDelete(botToken);
    }

    if (!deleteData.ok) {
        logger.error("slack/delete", "chat.delete failed", {
            error: deleteData.error,
            channel: body.channel,
            ts: body.ts,
        });
        return NextResponse.json({ error: deleteData.error }, { status: 500 });
    }

    logger.info("slack/delete", "Message deleted", { channel: body.channel, ts: body.ts });

    return NextResponse.json({ ok: true });
}
