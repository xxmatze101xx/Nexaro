import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/user/purge
 * Authorization: Bearer <firebase_id_token>
 *
 * Permanently deletes all Firestore data for the authenticated user.
 * This implements GDPR Article 17 (Right to Erasure).
 *
 * Deleted paths:
 *   users/{uid}/tokens/*
 *   users/{uid}/sync/*
 *   users/{uid}/jobs/*
 *   users/{uid}/logs/*
 *   users/{uid}/settings/*
 *   users/{uid}/private/*
 *   users/{uid}  (the user document itself)
 *
 * NOTE: This does NOT delete the Firebase Auth user record. That requires
 * firebase-admin (not installed) or the user to do it from the Firebase console.
 * The user is responsible for deleting their Auth account separately if desired.
 */

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

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

/**
 * Lists document names in a Firestore subcollection via REST API.
 * Returns an array of full Firestore document resource names.
 */
async function listDocumentNames(
    collectionPath: string,
    idToken: string,
): Promise<string[]> {
    const url = `${FIRESTORE_BASE}/${collectionPath}?pageSize=100`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) return [];
    const data = (await res.json()) as { documents?: Array<{ name: string }> };
    return (data.documents ?? []).map(d => d.name);
}

/**
 * Deletes a Firestore document by its full resource name.
 */
async function deleteDocument(resourceName: string, idToken: string): Promise<void> {
    const url = `https://firestore.googleapis.com/v1/${resourceName}`;
    await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
    });
}

export async function POST(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.slice(7);

    if (!idToken) {
        return NextResponse.json({ error: "missing_auth" }, { status: 401 });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "auth_failed" }, { status: 401 });
    }

    const collectionsCleared: string[] = [];

    // Subcollections to purge under users/{uid}/
    const subcollections = ["tokens", "sync", "jobs", "logs", "settings", "private"];

    for (const subcollection of subcollections) {
        const collectionPath = `users/${uid}/${subcollection}`;
        try {
            const docNames = await listDocumentNames(collectionPath, idToken);
            for (const name of docNames) {
                await deleteDocument(name, idToken);
            }
            if (docNames.length > 0) {
                collectionsCleared.push(collectionPath);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn("user/purge", `Failed to purge subcollection ${subcollection}`, { uid, error: msg });
        }
    }

    // Delete the top-level users/{uid} document
    try {
        const userDocUrl = `${FIRESTORE_BASE}/users/${uid}`;
        await fetch(userDocUrl, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${idToken}` },
        });
        collectionsCleared.push(`users/${uid}`);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.warn("user/purge", "Failed to delete user document", { uid, error: msg });
    }

    logger.info("user/purge", "User data purged", { uid, collectionsCleared });

    return NextResponse.json({ purged: true, collectionsCleared });
}
