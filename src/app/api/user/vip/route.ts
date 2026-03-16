import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

async function verifyIdToken(idToken: string): Promise<string | null> {
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ localId: string }> };
    return data.users?.[0]?.localId ?? null;
}

const DOC_URL = (uid: string) =>
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}/preferences/vip_senders`;

async function readVipList(uid: string, idToken: string): Promise<string[]> {
    const res = await fetch(DOC_URL(uid), {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Firestore read failed: ${res.status}`);
    const doc = (await res.json()) as { fields?: { emails?: { arrayValue?: { values?: Array<{ stringValue?: string }> } } } };
    return (
        doc.fields?.emails?.arrayValue?.values
            ?.map((v) => v.stringValue ?? "")
            .filter(Boolean) ?? []
    );
}

async function writeVipList(uid: string, idToken: string, emails: string[]): Promise<void> {
    const body = {
        fields: {
            emails: {
                arrayValue: {
                    values: emails.map((e) => ({ stringValue: e })),
                },
            },
        },
    };
    const res = await fetch(`${DOC_URL(uid)}?updateMask.fieldPaths=emails`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Firestore write failed: ${res.status}`);
}

/**
 * GET /api/user/vip
 * Returns the current VIP sender list.
 */
export async function GET(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) return NextResponse.json({ error: "missing_auth" }, { status: 401 });

    const uid = await verifyIdToken(idToken);
    if (!uid) return NextResponse.json({ error: "auth_failed" }, { status: 401 });

    try {
        const emails = await readVipList(uid, idToken);
        return NextResponse.json({ emails });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("user/vip", "Failed to read VIP list", { uid, error: msg });
        return NextResponse.json({ error: "Failed to read VIP list." }, { status: 500 });
    }
}

/**
 * POST /api/user/vip
 * Body: { email: string }
 * Adds an email to the VIP list (deduped).
 */
export async function POST(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) return NextResponse.json({ error: "missing_auth" }, { status: 401 });

    const uid = await verifyIdToken(idToken);
    if (!uid) return NextResponse.json({ error: "auth_failed" }, { status: 401 });

    let body: { email?: string };
    try {
        body = (await request.json()) as { email?: string };
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    try {
        const current = await readVipList(uid, idToken);
        if (!current.includes(email)) {
            await writeVipList(uid, idToken, [...current, email]);
        }
        const emails = await readVipList(uid, idToken);
        return NextResponse.json({ emails });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("user/vip", "Failed to add VIP sender", { uid, error: msg });
        return NextResponse.json({ error: "Failed to update VIP list." }, { status: 500 });
    }
}

/**
 * DELETE /api/user/vip
 * Body: { email: string }
 * Removes an email from the VIP list.
 */
export async function DELETE(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) return NextResponse.json({ error: "missing_auth" }, { status: 401 });

    const uid = await verifyIdToken(idToken);
    if (!uid) return NextResponse.json({ error: "auth_failed" }, { status: 401 });

    let body: { email?: string };
    try {
        body = (await request.json()) as { email?: string };
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

    try {
        const current = await readVipList(uid, idToken);
        await writeVipList(uid, idToken, current.filter((e) => e !== email));
        const emails = await readVipList(uid, idToken);
        return NextResponse.json({ emails });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("user/vip", "Failed to remove VIP sender", { uid, error: msg });
        return NextResponse.json({ error: "Failed to update VIP list." }, { status: 500 });
    }
}
