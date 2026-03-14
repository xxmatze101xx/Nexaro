import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/logs
 * Authorization: Bearer <firebase_id_token>
 * Body: { level: "info"|"warn"|"error", service: string, message: string, context?: object }
 *
 * Client-side log ingestion. Verifies the Firebase ID token, then writes
 * the log entry to Firestore under users/{uid}/logs/{auto-id}.
 *
 * Only warn and error entries are persisted (info logs are discarded server-side
 * to prevent Firestore write spam).
 */
export async function POST(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7);

    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

    if (!projectId) {
        return NextResponse.json({ error: "server_config" }, { status: 500 });
    }

    let body: { level?: string; service?: string; message?: string; context?: Record<string, unknown> };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { level, service, message, context } = body;

    if (!level || !service || !message) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Discard info-level logs to avoid Firestore write spam
    if (level === "info") {
        return NextResponse.json({ ok: true, stored: false });
    }

    // Verify ID token → get uid
    const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        }
    );

    if (!verifyRes.ok) {
        logger.warn("api/logs", "Token verification failed", { status: verifyRes.status });
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    const verifyData = (await verifyRes.json()) as { users?: Array<{ localId: string }> };
    const uid = verifyData.users?.[0]?.localId;

    if (!uid) {
        return NextResponse.json({ error: "uid_not_found" }, { status: 401 });
    }

    // Write log entry to Firestore users/{uid}/logs collection
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/logs`;
    const firestoreBody = {
        fields: {
            level: { stringValue: level },
            service: { stringValue: service },
            message: { stringValue: message },
            context: { stringValue: context ? JSON.stringify(context) : "" },
            timestamp: { stringValue: new Date().toISOString() },
        },
    };

    try {
        const fsRes = await fetch(firestoreUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(firestoreBody),
        });

        if (!fsRes.ok) {
            const errText = await fsRes.text().catch(() => "(unreadable)");
            logger.error("api/logs", "Firestore log write failed", {
                status: fsRes.status,
                body: errText.slice(0, 200),
            });
            return NextResponse.json({ error: "storage_failed" }, { status: 500 });
        }

        return NextResponse.json({ ok: true, stored: true });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("api/logs", "Unexpected error writing log", { error: msg });
        return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
}
