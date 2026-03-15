/**
 * user-memory.ts — User preference memory for Nexaro AI features.
 *
 * Stores and retrieves learned user preferences to personalize AI-generated
 * content over time. Preferences are inferred from interaction signals
 * (e.g., draft regenerations suggest the previous output was not ideal).
 *
 * Storage: users/{uid}/config/memory (single Firestore document per user)
 *
 * Schema:
 *   tone:              "formal" | "professional" | "casual"
 *   responseLength:    "short" | "medium" | "long"
 *   regenerationCount: number — total draft regenerations (high = pickier user)
 *   acceptanceCount:   number — total drafts accepted without regeneration
 *   updatedAt:         ISO timestamp
 */

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export interface UserMemory {
    tone?: "formal" | "professional" | "casual";
    responseLength?: "short" | "medium" | "long";
    regenerationCount?: number;
    acceptanceCount?: number;
    updatedAt?: string;
}

interface FirestoreMemoryDoc {
    fields?: {
        tone?: { stringValue: string };
        responseLength?: { stringValue: string };
        regenerationCount?: { integerValue: string };
        acceptanceCount?: { integerValue: string };
        updatedAt?: { stringValue: string };
    };
}

export async function readUserMemory(uid: string, idToken: string): Promise<UserMemory | null> {
    try {
        const res = await fetch(
            `${FIRESTORE_BASE}/users/${uid}/config/memory`,
            { headers: { Authorization: `Bearer ${idToken}` } },
        );
        if (!res.ok) return null;

        const doc = (await res.json()) as FirestoreMemoryDoc;
        const f = doc.fields;
        if (!f) return null;

        return {
            tone: (f.tone?.stringValue as UserMemory["tone"]) ?? undefined,
            responseLength: (f.responseLength?.stringValue as UserMemory["responseLength"]) ?? undefined,
            regenerationCount: f.regenerationCount ? parseInt(f.regenerationCount.integerValue, 10) : undefined,
            acceptanceCount: f.acceptanceCount ? parseInt(f.acceptanceCount.integerValue, 10) : undefined,
            updatedAt: f.updatedAt?.stringValue,
        };
    } catch {
        return null;
    }
}

export async function updateUserMemory(
    uid: string,
    idToken: string,
    updates: Partial<UserMemory>,
): Promise<void> {
    const current = await readUserMemory(uid, idToken) ?? {};
    const merged: UserMemory = { ...current, ...updates, updatedAt: new Date().toISOString() };

    const fields: Record<string, unknown> = {
        updatedAt: { stringValue: merged.updatedAt },
    };
    if (merged.tone) fields["tone"] = { stringValue: merged.tone };
    if (merged.responseLength) fields["responseLength"] = { stringValue: merged.responseLength };
    if (merged.regenerationCount !== undefined) fields["regenerationCount"] = { integerValue: String(merged.regenerationCount) };
    if (merged.acceptanceCount !== undefined) fields["acceptanceCount"] = { integerValue: String(merged.acceptanceCount) };

    await fetch(
        `${FIRESTORE_BASE}/users/${uid}/config/memory?key=${FIREBASE_API_KEY}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ fields }),
        },
    ).catch(() => undefined);
}

/**
 * Converts stored memory into injected instructions for AI system prompts.
 * Returns an empty string when no meaningful preferences have been recorded.
 */
export function formatMemoryForPrompt(memory: UserMemory | null): string {
    if (!memory) return "";

    const hints: string[] = [];

    if (memory.tone === "formal") {
        hints.push("Use formal, conservative language.");
    } else if (memory.tone === "casual") {
        hints.push("Use a relaxed, friendly tone.");
    }

    if (memory.responseLength === "short") {
        hints.push("Keep responses very brief (1-2 sentences).");
    } else if (memory.responseLength === "long") {
        hints.push("Provide more detailed, thorough responses.");
    }

    const regenCount = memory.regenerationCount ?? 0;
    const acceptCount = memory.acceptanceCount ?? 0;
    if (regenCount > acceptCount && regenCount > 3) {
        hints.push("This user is particular — make the draft especially polished.");
    }

    if (hints.length === 0) return "";
    return `\nUser preferences (learned from past interactions):\n${hints.map(h => `- ${h}`).join("\n")}`;
}
