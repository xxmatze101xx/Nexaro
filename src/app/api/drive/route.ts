import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime?: string;
    webViewLink?: string;
}

interface DriveListResponse {
    files?: DriveFile[];
    error?: { message: string; code?: number };
}

/**
 * GET /api/drive?folderId=<id>
 *
 * Lists files/folders in a Google Drive folder using the user's stored token.
 * Authorization: Bearer <firebase_id_token>
 * Reads token from: users/{uid}/tokens/google_drive
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") ?? "root";

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
        // Fetch the stored Drive token from Firestore
        const tokenUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/google_drive`;
        const tokenRes = await fetch(tokenUrl, {
            headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!tokenRes.ok) {
            return NextResponse.json({ error: "Drive not connected" }, { status: 403 });
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
            const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
            if (clientId && clientSecret) {
                const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        refresh_token: refreshToken,
                        client_id: clientId,
                        client_secret: clientSecret,
                        grant_type: "refresh_token",
                    }),
                });
                const refreshData = (await refreshRes.json()) as { access_token?: string; expires_in?: number };
                if (refreshData.access_token) {
                    accessToken = refreshData.access_token;
                    // Update stored token
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

        // Query Google Drive API
        const driveParams = new URLSearchParams({
            q: `'${folderId}' in parents and trashed = false`,
            fields: "files(id,name,mimeType,size,modifiedTime,webViewLink)",
            orderBy: "folder,name",
            pageSize: "100",
        });

        const driveRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?${driveParams.toString()}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const driveData = (await driveRes.json()) as DriveListResponse;

        if (!driveRes.ok || driveData.error) {
            logger.error("drive/route", "Drive API error", { error: driveData.error?.message });
            return NextResponse.json({ error: driveData.error?.message ?? "Drive API error" }, { status: driveRes.status });
        }

        return NextResponse.json({ files: driveData.files ?? [] });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown";
        logger.error("drive/route", "Unexpected error", { error: msg });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
