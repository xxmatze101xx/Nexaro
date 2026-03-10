/**
 * Slack API client utilities for the Nexaro dashboard.
 * All calls are made client-side using the access token stored in Firestore.
 */

export interface SlackChannel {
    id: string;
    name: string;
    is_private: boolean;
    is_member: boolean;
}

/**
 * Fetches all Slack channels (public + private) the user is a member of.
 * Requires scopes: channels:read, groups:read
 */
export async function fetchSlackChannels(accessToken: string): Promise<SlackChannel[]> {
    try {
        const res = await fetch(
            "https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json() as {
            ok: boolean;
            error?: string;
            channels?: Array<{ id: string; name: string; is_private: boolean; is_member: boolean }>;
        };
        if (!data.ok) {
            console.warn("fetchSlackChannels:", data.error);
            return [];
        }
        // Only return channels the user is actually a member of, sorted alphabetically
        return (data.channels ?? [])
            .filter(c => c.is_member)
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch (e: unknown) {
        console.warn("fetchSlackChannels error:", e instanceof Error ? e.message : String(e));
        return [];
    }
}
