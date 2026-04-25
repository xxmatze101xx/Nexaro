import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
    try {
        const { access_token, messageId } = await request.json() as { access_token?: string; messageId?: string };

        if (!access_token || !messageId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const res = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
            {
                method: "POST",
                headers: { Authorization: `Bearer ${access_token}` },
            }
        );

        if (!res.ok) {
            const errorBody = await res.text();
            logger.error("gmail/trash", "Gmail API error", { status: res.status, body: errorBody, messageId });

            if (res.status === 401 || res.status === 403) {
                return NextResponse.json({ error: "insufficient_scope" }, { status: res.status });
            }
            return NextResponse.json({ error: "Gmail API error", details: errorBody }, { status: res.status });
        }

        const data = await res.json();
        logger.info("gmail/trash", "Email trashed successfully", { messageId });
        return NextResponse.json(data);
    } catch (err: unknown) {
        logger.error("gmail/trash", "Unexpected error", { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
