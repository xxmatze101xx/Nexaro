import { NextResponse } from "next/server";

/**
 * GET /api/slack/dms
 * Authorization: Bearer <firebase_id_token>
 *
 * Returns the user's direct message conversations (1:1 and group DMs)
 * with resolved display names.
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7);

    if (!idToken) {
        return NextResponse.json({ error: "unauthorized", dms: [] }, { status: 401 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

    if (!projectId) {
        return NextResponse.json({ error: "server_config", dms: [] }, { status: 500 });
    }

    // ── 1. Verify ID token → uid ─────────────────────────────────────────────
    const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) }
    );
    if (!verifyRes.ok) {
        return NextResponse.json({ error: "token_verify_failed", dms: [] }, { status: 401 });
    }
    const verifyData = await verifyRes.json() as { users?: Array<{ localId: string }> };
    const uid = verifyData.users?.[0]?.localId;
    if (!uid) {
        return NextResponse.json({ error: "uid_not_found", dms: [] }, { status: 401 });
    }

    // ── 2. Read Slack token from Firestore ────────────────────────────────────
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/slack`;
    const fsRes = await fetch(fsUrl, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!fsRes.ok) {
        return NextResponse.json({ error: "slack_not_connected", dms: [] });
    }
    const fsData = await fsRes.json() as {
        fields?: {
            user_access_token?: { stringValue: string };
            access_token?: { stringValue: string };
        };
    };

    const userToken = fsData.fields?.user_access_token?.stringValue || "";
    const botToken  = fsData.fields?.access_token?.stringValue || "";
    const token = userToken || botToken;

    if (!token) {
        return NextResponse.json({ error: "no_token", dms: [] });
    }

    // ── 3. Fetch DM conversations (im = 1:1, mpim = group DMs) ───────────────
    const listRes = await fetch(
        "https://slack.com/api/conversations.list?types=im,mpim&exclude_archived=true&limit=200",
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const listData = await listRes.json() as {
        ok: boolean;
        error?: string;
        channels?: Array<{
            id: string;
            name?: string;
            is_mpim?: boolean;
            user?: string;
        }>;
    };

    if (!listData.ok) {
        console.error(`[slack/dms] conversations.list error=${listData.error}`);
        return NextResponse.json({ error: listData.error, dms: [] });
    }

    const conversations = listData.channels ?? [];

    // ── 4. Resolve display names ──────────────────────────────────────────────
    const dms = await Promise.all(
        conversations.map(async (conv) => {
            if (conv.is_mpim) {
                // Group DM: strip the "mpdm-" prefix and trailing "-1" index
                const name = (conv.name ?? "Group DM")
                    .replace(/^mpdm-/, "")
                    .replace(/--/g, ", ")
                    .replace(/-\d+$/, "");
                return { id: conv.id, name, is_group: true };
            }

            // 1:1 DM: resolve the partner's display name
            if (conv.user) {
                try {
                    const uRes = await fetch(`https://slack.com/api/users.info?user=${conv.user}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const uData = await uRes.json() as {
                        ok: boolean;
                        user?: { real_name?: string; display_name?: string; name?: string; deleted?: boolean };
                    };
                    if (uData.ok && uData.user && !uData.user.deleted) {
                        return {
                            id: conv.id,
                            name: uData.user.real_name || uData.user.display_name || uData.user.name || conv.user,
                            is_group: false,
                        };
                    }
                } catch {
                    // ignore individual failures — fall through to uid
                }
                return { id: conv.id, name: conv.user, is_group: false };
            }

            return { id: conv.id, name: "Unbekannt", is_group: false };
        })
    );

    // Filter out bots/slackbot (id often "USLACKBOT")
    const filtered = dms.filter(d => d.name !== "slackbot" && d.name !== "USLACKBOT");

    console.log(`[slack/dms] uid=${uid} returned=${filtered.length} dms`);
    return NextResponse.json({ dms: filtered });
}
