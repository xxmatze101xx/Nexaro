import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
    try {
        const { refresh_token } = await request.json();

        if (!refresh_token) {
            return NextResponse.json({ error: "Missing refresh token" }, { status: 400 });
        }

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            logger.error("gmail/refresh", "Missing Google OAuth credentials in environment variables");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                refresh_token,
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "refresh_token",
            }),
        });

        const data = (await response.json()) as {
            access_token?: string;
            expires_in?: number;
            error?: string;
            error_description?: string;
        };

        if (!response.ok) {
            logger.error("gmail/refresh", "Token refresh failed", { status: response.status, error: data.error, description: data.error_description });
            return NextResponse.json({ error: data.error_description ?? "Token refresh failed" }, { status: response.status });
        }

        logger.info("gmail/refresh", "Token refreshed successfully");
        return NextResponse.json({
            access_token: data.access_token,
            expires_in: data.expires_in,
        });
    } catch (err: unknown) {
        logger.error("gmail/refresh", "Unexpected error refreshing token", { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
