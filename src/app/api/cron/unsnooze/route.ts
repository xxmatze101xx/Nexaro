import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/unsnooze
 *
 * Called every 15 minutes by Vercel Cron (see vercel.json).
 * Snoozed messages are re-activated automatically on the client whenever
 * snoozedUntil < now (client-side filter in page.tsx). This route serves
 * as a lightweight health-check / audit log for the snooze cron schedule.
 *
 * Full server-side cleanup (purging snoozedUntil from Firestore for all users)
 * would require the Firebase Admin SDK. Once firebase-admin is added to the
 * project, the cleanup logic can be implemented here.
 *
 * To protect this route in production, set CRON_SECRET in .env and Vercel
 * environment variables, and add it to the cron URL:
 *   "path": "/api/cron/unsnooze?secret=<CRON_SECRET>"
 */
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const { searchParams } = new URL(request.url);
        if (searchParams.get("secret") !== secret) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
    }

    logger.info("cron/unsnooze", "Unsnooze cron tick", {
        timestamp: new Date().toISOString(),
    });

    // Client-side snooze filtering: messages are shown again automatically
    // once snoozedUntil < Date.now() — no server action required for the MVP.
    return NextResponse.json({ ok: true, note: "client-side snooze filter active" });
}
