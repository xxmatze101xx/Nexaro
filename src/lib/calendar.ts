import { getCalendarRefreshToken } from "./user";

export interface CalendarAttendee {
    email: string;
    displayName?: string;
    responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
    organizer?: boolean;
    self?: boolean;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    accountEmail: string;
    calendarId: string;
    color: string;
    location?: string;
    description?: string;
    attendees?: CalendarAttendee[];
    organizer?: string;
    conferenceLink?: string;
}

// Colour palette — one per account, cycles if more than the palette length
const ACCOUNT_COLOURS = [
    "#3B82F6", // blue
    "#10B981", // emerald
    "#8B5CF6", // violet
    "#F59E0B", // amber
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#F97316", // orange
];

const accountColorMap = new Map<string, string>();

export function getAccountColor(email: string): string {
    if (!accountColorMap.has(email)) {
        const index = accountColorMap.size % ACCOUNT_COLOURS.length;
        accountColorMap.set(email, ACCOUNT_COLOURS[index]);
    }
    return accountColorMap.get(email)!;
}

// In-flight refresh deduplication: one promise per email at a time
const _refreshInFlight = new Map<string, Promise<string | null>>();

/**
 * Gets a valid access token for the Calendar API, using localStorage cache.
 * Refreshes automatically if expired.
 *
 * On a permanent failure (400 – expired/revoked token), sets a 10-minute
 * backoff in localStorage so subsequent calls return null immediately
 * without hammering the API.
 */
export async function getCalendarAccessToken(uid: string, email: string): Promise<string | null> {
    if (typeof window === "undefined") return null;

    const cacheKey   = `gcal_access_token_${email}`;
    const expiryKey  = `gcal_token_expiry_${email}`;
    const backoffKey = `gcal_refresh_backoff_${email}`;

    // If a previous refresh failed permanently, don't retry until backoff expires
    const backoffUntil = localStorage.getItem(backoffKey);
    if (backoffUntil && Date.now() < parseInt(backoffUntil, 10)) {
        return null;
    }

    const currentToken = localStorage.getItem(cacheKey);
    const expiryStr = localStorage.getItem(expiryKey);

    if (currentToken && expiryStr) {
        const expiryTime = parseInt(expiryStr, 10);
        // 5-minute buffer
        if (Date.now() < expiryTime - 5 * 60 * 1000) {
            return currentToken;
        }
    }

    // Deduplicate: if a refresh is already in-flight for this email, wait for it
    const inflight = _refreshInFlight.get(email);
    if (inflight) return inflight;

    // Need to refresh
    const refreshToken = await getCalendarRefreshToken(uid, email);
    if (!refreshToken) return null;

    const promise = (async (): Promise<string | null> => {
        try {
            const res = await fetch("/api/calendar/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!res.ok) {
                const errText = await res.text().catch(() => "");
                console.error("Failed to refresh Calendar token", errText);
                // Set backoff: 10 min for permanent errors (400), 2 min for transient
                const backoffMs = res.status === 400 ? 10 * 60 * 1000 : 2 * 60 * 1000;
                localStorage.setItem(backoffKey, (Date.now() + backoffMs).toString());
                // Permanent auth error (expired/revoked token) — mark for UI
                if (res.status === 400) {
                    localStorage.setItem(`gcal_auth_error_${email}`, "true");
                }
                return null;
            }

            const data = (await res.json()) as { access_token?: string; expires_in?: number };
            if (data.access_token) {
                localStorage.setItem(cacheKey, data.access_token);
                localStorage.setItem(expiryKey, (Date.now() + (data.expires_in ?? 3600) * 1000).toString());
                localStorage.removeItem(backoffKey); // clear any prior backoff on success
                localStorage.removeItem(`gcal_auth_error_${email}`); // clear auth error on success
                return data.access_token;
            }
        } catch (e) {
            console.error("Error refreshing Calendar token", e);
        }
        return null;
    })();

    _refreshInFlight.set(email, promise);
    promise.finally(() => _refreshInFlight.delete(email));
    return promise;
}

/**
 * Returns which account emails currently have a permanent auth error
 * (i.e. the refresh token is expired/revoked and needs reconnection).
 */
export function getCalendarAuthErrors(emails: string[]): string[] {
    if (typeof window === "undefined") return [];
    return emails.filter(email => localStorage.getItem(`gcal_auth_error_${email}`) === "true");
}

/**
 * Fetches all calendar events for the given account in the given time range.
 */
export async function fetchCalendarEvents(
    uid: string,
    email: string,
    timeMin: Date,
    timeMax: Date
): Promise<CalendarEvent[]> {
    const accessToken = await getCalendarAccessToken(uid, email);
    if (!accessToken) return [];

    try {
        // 1. Get list of calendars the user has
        const calListRes = await fetch(
            "https://www.googleapis.com/calendar/v3/users/me/calendarList",
            { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
        );

        if (!calListRes.ok) {
            console.error("Failed to fetch calendar list", await calListRes.text());
            return [];
        }

        const calListData = await calListRes.json();
        const calendars: any[] = (calListData.items || []).filter((cal: any) => cal.selected);

        const color = getAccountColor(email);

        // 2. Fetch events from each calendar in parallel
        const allEventArrays = await Promise.all(
            calendars.map(async (cal: any) => {
                const eventsRes = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?` +
                    new URLSearchParams({
                        timeMin: timeMin.toISOString(),
                        timeMax: timeMax.toISOString(),
                        singleEvents: "true",
                        orderBy: "startTime",
                        maxResults: "250",
                    }),
                    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
                );
                if (!eventsRes.ok) return [];
                const eventsData = await eventsRes.json();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (eventsData.items || []).map((ev: any): CalendarEvent => {
                    const allDay = !!ev.start?.date;
                    const videoLink: string | undefined =
                        ev.hangoutLink ??
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (ev.conferenceData?.entryPoints as any[] | undefined)?.find(
                            (e: { entryPointType?: string }) => e.entryPointType === "video",
                        )?.uri;
                    return {
                        id: `${email}_${ev.id}`,
                        title: ev.summary || "(Kein Titel)",
                        start: allDay ? new Date(ev.start.date) : new Date(ev.start.dateTime),
                        end: allDay ? new Date(ev.end.date) : new Date(ev.end.dateTime),
                        allDay,
                        accountEmail: email,
                        calendarId: cal.id,
                        color: cal.backgroundColor || color,
                        location: ev.location,
                        description: ev.description,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        attendees: Array.isArray(ev.attendees)
                            ? (ev.attendees as any[]).map(
                                  (a: {
                                      email?: string;
                                      displayName?: string;
                                      responseStatus?: string;
                                      organizer?: boolean;
                                      self?: boolean;
                                  }): CalendarAttendee => ({
                                      email: a.email ?? "",
                                      displayName: a.displayName,
                                      responseStatus:
                                          a.responseStatus as CalendarAttendee["responseStatus"],
                                      organizer: a.organizer,
                                      self: a.self,
                                  }),
                              )
                            : undefined,
                        organizer: ev.organizer?.displayName ?? ev.organizer?.email,
                        conferenceLink: videoLink,
                    };
                });
            })
        );

        return allEventArrays.flat();
    } catch (err) {
        console.error("Error fetching calendar events", err);
        return [];
    }
}

/**
 * Creates a new event in the user's primary Google Calendar.
 */
export async function createCalendarEvent(
    uid: string,
    email: string,
    event: { title: string; start: Date; end: Date; location?: string; description?: string }
): Promise<boolean> {
    const accessToken = await getCalendarAccessToken(uid, email);
    if (!accessToken) return false;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            summary: event.title,
            location: event.location || undefined,
            description: event.description || undefined,
            start: { dateTime: event.start.toISOString(), timeZone: tz },
            end: { dateTime: event.end.toISOString(), timeZone: tz },
        }),
    });
    if (!res.ok) {
        console.error("Failed to create the event in Google Calendar:", await res.text());
    }
    return res.ok;
}

/**
 * Updates an existing event in a Google Calendar.
 */
export async function updateCalendarEvent(
    uid: string,
    email: string,
    calendarId: string,
    eventId: string,
    event: { title: string; start: Date; end: Date; location?: string; description?: string }
): Promise<boolean> {
    const accessToken = await getCalendarAccessToken(uid, email);
    if (!accessToken) return false;

    // Extract actual event ID (we prefixed it with email in fetchCalendarEvents)
    const originalEventId = eventId.startsWith(`${email}_`) ? eventId.slice(email.length + 1) : eventId;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(originalEventId)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            summary: event.title,
            location: event.location || undefined,
            description: event.description || undefined,
            start: { dateTime: event.start.toISOString(), timeZone: tz },
            end: { dateTime: event.end.toISOString(), timeZone: tz },
        }),
    });
    return res.ok;
}

/**
 * Deletes an event from a Google Calendar.
 */
export async function deleteCalendarEvent(
    uid: string,
    email: string,
    calendarId: string,
    eventId: string
): Promise<boolean> {
    const accessToken = await getCalendarAccessToken(uid, email);
    if (!accessToken) return false;

    // Extract actual event ID
    const originalEventId = eventId.startsWith(`${email}_`) ? eventId.slice(email.length + 1) : eventId;

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(originalEventId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
}
