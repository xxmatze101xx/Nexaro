/**
 * user-memory.ts
 * User memory system for AI personalization.
 *
 * Stores and retrieves user interaction patterns and writing style signals
 * from Firestore so they can be injected into AI prompts.
 *
 * Firestore path: users/{uid}/memory/profile
 *
 * Schema:
 *   writingStyle: string    — detected style, e.g. "concise, bullet points"
 *   tone: string            — detected tone, e.g. "professional", "friendly"
 *   preferredLength: string — "short" | "medium" | "long"
 *   frequentSenders: string[] — email addresses the user frequently engages with
 *   interests: string[]     — topics recurring in engaged messages
 *   lastUpdated: string     — ISO timestamp
 */

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export interface UserMemoryProfile {
    writingStyle: string;
    tone: "professional" | "friendly" | "formal" | "casual";
    preferredLength: "short" | "medium" | "long";
    /** Email addresses the user frequently replies to */
    frequentSenders: string[];
    /** Topics or keywords recurring in messages the user engages with */
    interests: string[];
    lastUpdated: string;
}

export interface MemoryInteractionSignal {
    /** Email address of message sender user just replied to */
    repliedToEmail?: string;
    /** Keywords or subject from the message that was engaged with */
    engagedTopics?: string[];
    /** Style of draft the user accepted (e.g. length / tone of their sent reply) */
    draftStyle?: {
        tone?: "professional" | "friendly" | "formal" | "casual";
        length?: "short" | "medium" | "long";
    };
}

const DEFAULT_PROFILE: UserMemoryProfile = {
    writingStyle: "professional and concise",
    tone: "professional",
    preferredLength: "short",
    frequentSenders: [],
    interests: [],
    lastUpdated: new Date().toISOString(),
};

interface FirestoreMemoryDoc {
    fields?: {
        writingStyle?: { stringValue: string };
        tone?: { stringValue: string };
        preferredLength?: { stringValue: string };
        frequentSenders?: { arrayValue?: { values?: Array<{ stringValue: string }> } };
        interests?: { arrayValue?: { values?: Array<{ stringValue: string }> } };
        lastUpdated?: { stringValue: string };
    };
}

export async function readUserMemory(
    uid: string,
    idToken: string,
): Promise<UserMemoryProfile> {
    const url = `${FIRESTORE_BASE}/users/${uid}/memory/profile`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) return { ...DEFAULT_PROFILE };

    const doc = (await res.json()) as FirestoreMemoryDoc;
    const f = doc.fields;
    if (!f) return { ...DEFAULT_PROFILE };

    return {
        writingStyle: f.writingStyle?.stringValue ?? DEFAULT_PROFILE.writingStyle,
        tone: (f.tone?.stringValue ?? DEFAULT_PROFILE.tone) as UserMemoryProfile["tone"],
        preferredLength: (f.preferredLength?.stringValue ?? DEFAULT_PROFILE.preferredLength) as UserMemoryProfile["preferredLength"],
        frequentSenders: (f.frequentSenders?.arrayValue?.values ?? []).map(v => v.stringValue).filter(Boolean),
        interests: (f.interests?.arrayValue?.values ?? []).map(v => v.stringValue).filter(Boolean),
        lastUpdated: f.lastUpdated?.stringValue ?? DEFAULT_PROFILE.lastUpdated,
    };
}

export async function writeUserMemory(
    uid: string,
    idToken: string,
    profile: UserMemoryProfile,
): Promise<void> {
    const url =
        `${FIRESTORE_BASE}/users/${uid}/memory/profile` +
        `?updateMask.fieldPaths=writingStyle` +
        `&updateMask.fieldPaths=tone` +
        `&updateMask.fieldPaths=preferredLength` +
        `&updateMask.fieldPaths=frequentSenders` +
        `&updateMask.fieldPaths=interests` +
        `&updateMask.fieldPaths=lastUpdated`;

    await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
            fields: {
                writingStyle: { stringValue: profile.writingStyle },
                tone: { stringValue: profile.tone },
                preferredLength: { stringValue: profile.preferredLength },
                frequentSenders: {
                    arrayValue: {
                        values: profile.frequentSenders.map(s => ({ stringValue: s })),
                    },
                },
                interests: {
                    arrayValue: {
                        values: profile.interests.map(i => ({ stringValue: i })),
                    },
                },
                lastUpdated: { stringValue: new Date().toISOString() },
            },
        }),
    });
}

/**
 * Merges an interaction signal into the current memory profile.
 * Reads the current profile, applies the signal, writes back.
 */
export async function recordInteractionSignal(
    uid: string,
    idToken: string,
    signal: MemoryInteractionSignal,
): Promise<void> {
    const profile = await readUserMemory(uid, idToken);

    // Update frequent senders (keep top 20)
    if (signal.repliedToEmail) {
        const senders = profile.frequentSenders.filter(s => s !== signal.repliedToEmail);
        senders.unshift(signal.repliedToEmail);
        profile.frequentSenders = senders.slice(0, 20);
    }

    // Update interests (keep top 30 unique keywords)
    if (signal.engagedTopics?.length) {
        const interests = new Set([...signal.engagedTopics, ...profile.interests]);
        profile.interests = Array.from(interests).slice(0, 30);
    }

    // Update writing style signals from accepted drafts
    if (signal.draftStyle?.tone) profile.tone = signal.draftStyle.tone;
    if (signal.draftStyle?.length) profile.preferredLength = signal.draftStyle.length;

    await writeUserMemory(uid, idToken, profile);
}

/**
 * Formats the memory profile into a compact AI system prompt injection.
 * Returns an empty string if the profile has no meaningful signals.
 */
export function formatMemoryForPrompt(profile: UserMemoryProfile): string {
    const parts: string[] = [];

    if (profile.tone !== "professional") {
        parts.push(`Preferred tone: ${profile.tone}.`);
    }
    if (profile.preferredLength === "short") {
        parts.push("Keep replies brief — the user prefers short responses.");
    } else if (profile.preferredLength === "long") {
        parts.push("The user prefers detailed, thorough replies.");
    }
    if (profile.frequentSenders.length > 0) {
        parts.push(`Frequent contacts: ${profile.frequentSenders.slice(0, 5).join(", ")}.`);
    }
    if (profile.interests.length > 0) {
        parts.push(`User context: often discusses ${profile.interests.slice(0, 8).join(", ")}.`);
    }

    return parts.length > 0
        ? `\n\nUser memory context:\n${parts.join("\n")}`
        : "";
}
