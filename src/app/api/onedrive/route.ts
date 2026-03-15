import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

interface OneDriveItem {
    id: string;
    name: string;
    size?: number;
    lastModifiedDateTime?: string;
    webUrl?: string;
    folder?: { childCount?: number };
    file?: { mimeType?: string };
}

interface OneDriveListResponse {
    value?: OneDriveItem[];
    error?: { message: string; code?: string };
}

/**
 * GET /api/onedrive?itemId=<id>
 *
 * Lists files/folders in a OneDrive folder using the user's stored Microsoft token.
 * Authorization: Bearer <firebase_id_token>
 * Reads token from: users/{uid}/tokens/microsoft
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId") ?? "root";

    const authHeader = request.headers.get("Authorization") ?? "";
    const idToken = authHeader.replace("Bearer ", "");
    const uid = searchParams.get("uid");

    if (!idToken || !uid) {
        return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
        return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    try {
        // Fetch the stored Microsoft token from Firestore
        const tokenUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/microsoft`;
        const tokenRes = await fetch(tokenUrl, {
            headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!tokenRes.ok) {
            return NextResponse.json({ error: "OneDrive not connected" }, { status: 403 });
        }

        const tokenDoc = (await tokenRes.json()) as {
            fields?: {
                access_token?: { stringValue?: string };
                refresh_token?: { stringValue?: string };
                expires_at?: { integerValue?: string };
            };
        };

        let accessToken = tokenDoc.fields?.access_token?.stringValue ?? "";
        const refreshToken = tokenDoc.fields?.refresh_token?.stringValue ?? "";
        const expiresAt = Number(tokenDoc.fields?.expires_at?.integerValue ?? 0);

        // Refresh token if expired
        if (Date.now() > expiresAt - 60_000 && refreshToken) {
            const clientId = process.env.MICROSOFT_CLIENT_ID;
            const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
            if (clientId && clientSecret) {
                const refreshRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        refresh_token: refreshToken,
                        client_id: clientId,
                        client_secret: clientSecret,
                        grant_type: "refresh_token",
                        scope: "Files.Read offline_access",
                    }),
                });
                const refreshData = (await refreshRes.json()) as { access_token?: string; expires_in?: number };
                if (refreshData.access_token) {
                    accessToken = refreshData.access_token;
                    const now = Date.now();
                    await fetch(tokenUrl, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${idToken}`,
                        },
                        body: JSON.stringify({
                            fields: {
                                access_token: { stringValue: accessToken },
                                expires_at: { integerValue: String(now + (refreshData.expires_in ?? 3600) * 1000) },
                            },
                        }),
                    });
                }
            }
        }

        if (!accessToken) {
            return NextResponse.json({ error: "No access token" }, { status: 403 });
        }

        // Query Microsoft Graph
        const graphUrl =
            itemId === "root"
                ? "https://graph.microsoft.com/v1.0/me/drive/root/children"
                : `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/children`;

        const graphRes = await fetch(
            `${graphUrl}?$select=id,name,size,lastModifiedDateTime,webUrl,folder,file&$orderby=name&$top=100`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const graphData = (await graphRes.json()) as OneDriveListResponse;

        if (!graphRes.ok || graphData.error) {
            logger.error("onedrive/route", "Graph API error", { error: graphData.error?.message });
            return NextResponse.json({ error: graphData.error?.message ?? "Graph API error" }, { status: graphRes.status });
        }

        return NextResponse.json({ items: graphData.value ?? [] });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown";
        logger.error("onedrive/route", "Unexpected error", { error: msg });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
