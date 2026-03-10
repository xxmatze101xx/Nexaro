import { NextRequest, NextResponse } from "next/server";

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

interface FirestoreField {
    stringValue?: string;
    integerValue?: string;
    doubleValue?: number;
    booleanValue?: boolean;
    nullValue?: string;
}

interface FirestoreDocument {
    fields?: Record<string, FirestoreField>;
}

function getStr(doc: FirestoreDocument, key: string): string {
    return doc.fields?.[key]?.stringValue ?? "";
}
function getNum(doc: FirestoreDocument, key: string): number {
    const f = doc.fields?.[key];
    if (f?.doubleValue !== undefined) return f.doubleValue;
    if (f?.integerValue !== undefined) return Number(f.integerValue);
    return 0;
}

/**
 * POST /api/digest?uid=<uid>
 * Reads top-10 messages by importance_score from Firestore and returns
 * an HTML digest email. Optionally sends via Gmail if access token is available.
 *
 * NOTE: Scheduling requires Vercel Cron or Cloud Scheduler.
 * ⏳ BLOCKED (needs Vercel Cron or external scheduler)
 */
export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

    // 1. Fetch digest settings
    const settingsRes = await fetch(
        `${FIRESTORE_BASE}/users/${uid}/settings/digest`,
        { cache: "no-store" }
    );
    if (!settingsRes.ok) return NextResponse.json({ error: "No digest settings found" }, { status: 404 });
    const settingsDoc = (await settingsRes.json()) as FirestoreDocument;
    const recipientEmail = getStr(settingsDoc, "email");
    if (!recipientEmail) return NextResponse.json({ error: "No recipient email" }, { status: 400 });

    // 2. Fetch top-10 messages from Firestore (last 24h)
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const queryRes = await fetch(
        `${FIRESTORE_BASE}/messages?pageSize=100&orderBy=importance_score%20desc`,
        { cache: "no-store" }
    );
    interface FirestoreListResponse { documents?: FirestoreDocument[] }
    const queryData = (queryRes.ok ? await queryRes.json() : {}) as FirestoreListResponse;
    const docs: FirestoreDocument[] = queryData.documents ?? [];

    const top10 = docs
        .filter(d => getStr(d, "timestamp") >= since)
        .sort((a, b) => getNum(b, "importance_score") - getNum(a, "importance_score"))
        .slice(0, 10);

    // 3. Build HTML email
    const rows = top10.map((d, i) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:12px 8px;font-weight:700;color:#1e293b;">${i + 1}</td>
            <td style="padding:12px 8px;">
                <div style="font-weight:600;color:#1e293b;">${getStr(d, "sender")}</div>
                <div style="font-size:12px;color:#64748b;">${getStr(d, "subject") || getStr(d, "content").slice(0, 60)}</div>
            </td>
            <td style="padding:12px 8px;text-align:right;">
                <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:700;">
                    ${Math.round(getNum(d, "importance_score") * 10)}/100
                </span>
            </td>
        </tr>`).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;">
    <div style="background:#1e293b;color:white;padding:20px 24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:20px;">Nexaro Tägliche Zusammenfassung</h1>
        <p style="margin:4px 0 0;opacity:0.7;font-size:13px;">${new Date().toLocaleDateString("de-AT", { dateStyle: "full" })}</p>
    </div>
    <div style="background:white;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:0;">
        <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f1f5f9;">
                <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;">#</th>
                <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;">Nachricht</th>
                <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748b;">Score</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="3" style="padding:24px;text-align:center;color:#94a3b8;">Keine neuen Nachrichten</td></tr>'}</tbody>
        </table>
    </div>
    <p style="text-align:center;margin-top:16px;font-size:11px;color:#94a3b8;">Nexaro Unified Inbox &mdash; <a href="${process.env.NEXTAUTH_URL ?? "https://nexaro-9j3h.vercel.app"}" style="color:#3b82f6;">App öffnen</a></p>
</body></html>`;

    // 4. Return the digest (sending via Gmail API would require user's access token)
    return NextResponse.json({
        success: true,
        recipient: recipientEmail,
        messageCount: top10.length,
        html,
        note: "Scheduling via Vercel Cron or Cloud Scheduler required. ⏳ BLOCKED (needs Vercel Cron or external scheduler)",
    });
}

export async function GET(req: NextRequest) {
    return POST(req);
}
