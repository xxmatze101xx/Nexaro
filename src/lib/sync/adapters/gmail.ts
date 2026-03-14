/**
 * sync/adapters/gmail.ts
 * Gmail sync adapter — supports initial and incremental sync modes.
 *
 * Initial:     fetches last 50 inbox messages, records current historyId.
 * Incremental: calls history.list?startHistoryId=<stored> to get only new messages.
 *              Falls back to initial if historyId has expired (404).
 */

import { getValidAccessToken } from "@/lib/gmail";
import { normalizeGmail } from "@/lib/normalizers";
import type { UnifiedMessage } from "@/lib/normalizers/types";
import type { GmailSyncCredentials, SyncMode, SyncResult, SyncState } from "../types";
import { rateLimitedFetch } from "../rate-limiter";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const BATCH_SIZE = 10;

interface GmailMessageSummary { id: string }
interface GmailHistoryRecord {
    messagesAdded?: Array<{ message: { id: string } }>;
}
interface GmailHistoryResponse {
    history?: GmailHistoryRecord[];
    historyId?: string;
}
interface GmailListResponse {
    messages?: GmailMessageSummary[];
}
interface GmailProfileResponse {
    historyId?: string;
}

async function fetchMessageDetail(
    accessToken: string,
    id: string,
    accountEmail: string,
): Promise<UnifiedMessage | null> {
    try {
        const res = await rateLimitedFetch(
            "gmail",
            `${GMAIL_API}/messages/${id}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!res.ok) return null;
        const raw = await res.json() as Record<string, unknown>;
        return normalizeGmail({ ...raw, _accountId: accountEmail } as Parameters<typeof normalizeGmail>[0], accountEmail);
    } catch {
        return null;
    }
}

async function fetchBatch(
    accessToken: string,
    ids: string[],
    email: string,
): Promise<UnifiedMessage[]> {
    const results: UnifiedMessage[] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const slice = ids.slice(i, i + BATCH_SIZE);
        const batch = await Promise.all(
            slice.map(id => fetchMessageDetail(accessToken, id, email)),
        );
        results.push(...batch.filter((m): m is UnifiedMessage => m !== null));
    }
    return results;
}

export async function syncGmail(
    creds: GmailSyncCredentials,
    mode: SyncMode,
    state: SyncState | null,
): Promise<Omit<SyncResult, "service">> {
    const { uid, email } = creds;
    const errors: string[] = [];
    const nextState: Partial<SyncState> = {};

    const accessToken = await getValidAccessToken(uid, email);
    if (!accessToken) {
        return { added: 0, messages: [], nextState: {}, errors: ["no_access_token"] };
    }

    // ── Incremental sync via history.list ─────────────────────────────────────
    if (mode === "incremental" && state?.historyId) {
        const response = await rateLimitedFetch(
            "gmail",
            `${GMAIL_API}/history?startHistoryId=${state.historyId}&historyTypes=messageAdded&labelId=INBOX`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!response.ok) {
            if (response.status === 404) {
                // historyId expired — fall back to full initial sync
                console.warn("[sync/gmail] historyId expired, falling back to initial sync");
                return syncGmail(creds, "initial", null);
            }
            errors.push(`history_list_failed: ${response.status}`);
            return { added: 0, messages: [], nextState: {}, errors };
        }

        const data = await response.json() as GmailHistoryResponse;

        const newIds = new Set<string>();
        data.history?.forEach(record => {
            record.messagesAdded?.forEach(ma => newIds.add(ma.message.id));
        });

        const messages = await fetchBatch(accessToken, [...newIds], email);
        if (data.historyId) nextState.historyId = data.historyId;

        return { added: messages.length, messages, nextState, errors };
    }

    // ── Initial sync: fetch last 50 inbox messages ────────────────────────────
    const listResponse = await rateLimitedFetch(
        "gmail",
        `${GMAIL_API}/messages?maxResults=50&labelIds=INBOX`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listResponse.ok) {
        errors.push(`messages_list_failed: ${listResponse.status}`);
        return { added: 0, messages: [], nextState: {}, errors };
    }
    const listData = await listResponse.json() as GmailListResponse;
    const ids = listData.messages?.map(m => m.id) ?? [];
    const messages = await fetchBatch(accessToken, ids, email);

    // Record current historyId for future incremental syncs
    const profileResponse = await rateLimitedFetch(
        "gmail",
        `${GMAIL_API}/profile`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (profileResponse.ok) {
        const profileData = await profileResponse.json() as GmailProfileResponse;
        if (profileData.historyId) nextState.historyId = profileData.historyId;
    }

    return { added: messages.length, messages, nextState, errors };
}
