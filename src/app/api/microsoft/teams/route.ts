import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/microsoft/teams?since=<ISO-timestamp>
 * Authorization: Bearer <firebase_id_token>
 *
 * Fetches Microsoft Teams DMs and group chats from the Graph API.
 * Handles token refresh automatically when the stored access token is expired.
 *
 * Required env vars:
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_API_KEY
 *   MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const SCOPES = "offline_access User.Read Mail.Read Mail.Send Calendars.Read Chat.Read";

interface FirestoreTokenFields {
    fields?: {
        access_token?: { stringValue: string };
        refresh_token?: { stringValue: string };
        expires_in?: { integerValue: string };
        token_acquired_at?: { integerValue: string };
    };
}

interface GraphMessage {
    id: string;
    createdDateTime: string;
    messageType?: string;
    deletedDateTime?: string | null;
    replyToId?: string | null;
    from?: {
        user?: { displayName?: string };
        application?: { displayName?: string };
    };
    body?: { content?: string; contentType?: string };
}

interface GraphChat {
    id: string;
    chatType?: string;
}

/** Strips basic HTML tags from Graph API message body content. */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Verifies a Firebase ID token and returns the uid + the user's Microsoft
 * access token (auto-refreshed if expired).
 */
async function resolveMicrosoftToken(
    idToken: string,
    projectId: string,
    apiKey: string,
): Promise<{ uid: string; accessToken: string } | null> {
    // 1. Verify Firebase ID token → uid
    const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        },
    );
    if (!verifyRes.ok) return null;
    const verifyData = (await verifyRes.json()) as { users?: Array<{ localId: string }> };
    const uid = verifyData.users?.[0]?.localId;
    if (!uid) return null;

    // 2. Read Microsoft tokens from Firestore (user's own ID token as Bearer)
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/microsoft`;
    const fsRes = await fetch(fsUrl, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!fsRes.ok) return null;

    const fsData = (await fsRes.json()) as FirestoreTokenFields;
    const f = fsData.fields;
    if (!f) return null;

    const accessToken = f.access_token?.stringValue ?? "";
    const refreshToken = f.refresh_token?.stringValue ?? "";
    const expiresIn = parseInt(f.expires_in?.integerValue ?? "3600", 10);
    const tokenAcquiredAt = parseInt(f.token_acquired_at?.integerValue ?? "0", 10);

    // 3. Check expiry (5-minute buffer) and refresh if needed
    const isExpired = Date.now() > tokenAcquiredAt + (expiresIn - 300) * 1000;

    if (isExpired && refreshToken) {
        const clientId = process.env.MICROSOFT_CLIENT_ID ?? "";
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET ?? "";
        const redirectUri = process.env.MICROSOFT_REDIRECT_URI ?? "";

        if (clientId && clientSecret && redirectUri) {
            const tokenRes = await fetch(
                "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        refresh_token: refreshToken,
                        redirect_uri: redirectUri,
                        grant_type: "refresh_token",
                        scope: SCOPES,
                    }),
                },
            );
            const tokenData = (await tokenRes.json()) as {
                access_token?: string;
                refresh_token?: string;
                expires_in?: number;
            };

            if (tokenData.access_token) {
                // Persist refreshed token to Firestore (best-effort, non-blocking)
                const refreshedAt = Date.now();
                const patchUrl =
                    `${fsUrl}?key=${apiKey}` +
                    `&updateMask.fieldPaths=access_token` +
                    `&updateMask.fieldPaths=refresh_token` +
                    `&updateMask.fieldPaths=expires_in` +
                    `&updateMask.fieldPaths=token_acquired_at` +
                    `&updateMask.fieldPaths=expires_at`;

                fetch(patchUrl, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fields: {
                            access_token: { stringValue: tokenData.access_token },
                            refresh_token: { stringValue: tokenData.refresh_token ?? refreshToken },
                            expires_in: { integerValue: String(tokenData.expires_in ?? 3600) },
                            token_acquired_at: { integerValue: String(refreshedAt) },
                            expires_at: { integerValue: String(refreshedAt + (tokenData.expires_in ?? 3600) * 1000) },
                        },
                    }),
                }).catch(() => {});

                return { uid, accessToken: tokenData.access_token };
            }
        }
    }

    if (!accessToken) return null;
    return { uid, accessToken };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since"); // ISO timestamp for incremental sync
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7);

    if (!idToken) {
        return NextResponse.json({ error: "missing_auth", messages: [] }, { status: 401 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

    const resolved = await resolveMicrosoftToken(idToken, projectId, apiKey);
    if (!resolved) {
        return NextResponse.json({ error: "auth_failed", messages: [] }, { status: 401 });
    }

    const { accessToken } = resolved;

    try {
        // ── 1. List chats (DMs and group chats) ──────────────────────────────
        const chatsRes = await fetch(
            `${GRAPH_BASE}/me/chats?$select=id,chatType&$top=50`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!chatsRes.ok) {
            if (chatsRes.status === 401) {
                return NextResponse.json({ error: "token_expired", messages: [] }, { status: 401 });
            }
            const errText = await chatsRes.text().catch(() => "");
            logger.error("microsoft/teams", "Failed to fetch chats", { status: chatsRes.status, body: errText.slice(0, 200) });
            return NextResponse.json({ error: "graph_error", messages: [] }, { status: 502 });
        }

        const chatsData = (await chatsRes.json()) as { value?: GraphChat[] };
        const chats = (chatsData.value ?? []).filter(
            c => c.chatType === "oneOnOne" || c.chatType === "group",
        );

        // ── 2. Fetch recent messages per chat ─────────────────────────────────
        const sinceDate = since ? new Date(since).getTime() : 0;

        const allMessages: Array<{
            id: string;
            chatId: string;
            chatType: string;
            createdDateTime: string;
            senderName: string;
            body: string;
            replyToId: string | null;
        }> = [];

        await Promise.all(
            chats.map(async chat => {
                const msgsRes = await fetch(
                    `${GRAPH_BASE}/me/chats/${chat.id}/messages?$top=20&$orderby=createdDateTime desc`,
                    { headers: { Authorization: `Bearer ${accessToken}` } },
                );

                if (!msgsRes.ok) return; // Skip this chat on error

                const msgsData = (await msgsRes.json()) as { value?: GraphMessage[] };
                const rawMsgs = msgsData.value ?? [];

                for (const msg of rawMsgs) {
                    // Skip system messages and deleted messages
                    if (msg.messageType !== "message") continue;
                    if (msg.deletedDateTime) continue;

                    // Apply incremental filter
                    const msgTime = new Date(msg.createdDateTime).getTime();
                    if (sinceDate > 0 && msgTime <= sinceDate) continue;

                    const senderName =
                        msg.from?.user?.displayName ??
                        msg.from?.application?.displayName ??
                        "Unknown";

                    const rawBody = msg.body?.content ?? "";
                    const body =
                        msg.body?.contentType === "html" ? stripHtml(rawBody) : rawBody.trim();

                    if (!body) continue;

                    allMessages.push({
                        id: msg.id,
                        chatId: chat.id,
                        chatType: chat.chatType ?? "oneOnOne",
                        createdDateTime: msg.createdDateTime,
                        senderName,
                        body,
                        replyToId: msg.replyToId ?? null,
                    });
                }
            }),
        );

        logger.info("microsoft/teams", "Messages fetched", {
            chats: chats.length,
            messages: allMessages.length,
            since: since ?? "initial",
        });

        return NextResponse.json({ messages: allMessages });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown";
        logger.error("microsoft/teams", "Unexpected error", { error: msg });
        return NextResponse.json({ error: "server_error", messages: [] }, { status: 500 });
    }
}
