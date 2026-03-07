import { getCalendarRefreshToken } from "./user";

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

/**
 * Gets a valid access token for the Calendar API, using localStorage cache.
 * Refreshes automatically if expired.
 */
export async function getCalendarAccessToken(uid: string, email: string): Promise<string | null> {
    if (typeof window === "undefined") return null;

    const cacheKey = `gcal_access_token_${email}`;
    const expiryKey = `gcal_token_expiry_${email}`;

    const currentToken = localStorage.getItem(cacheKey);
    const expiryStr = localStorage.getItem(expiryKey);

    if (currentToken && expiryStr) {
        const expiryTime = parseInt(expiryStr, 10);
        // 5-minute buffer
        if (Date.now() < expiryTime - 5 * 60 * 1000) {
            return currentToken;
        }
    }

    // Need to refresh
    const refreshToken = await getCalendarRefreshToken(uid, email);
    if (!refreshToken) return null;

    try {
        const res = await fetch("/api/calendar/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!res.ok) {
            console.error("Failed to refresh Calendar token", await res.text());
            return null;
        }

        const data = await res.json();
        if (data.access_token) {
            localStorage.setItem(cacheKey, data.access_token);
            localStorage.setItem(expiryKey, (Date.now() + data.expires_in * 1000).toString());
            return data.access_token;
        }
    } catch (e) {
        console.error("Error refreshing Calendar token", e);
    }
    return null;
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
                return (eventsData.items || []).map((ev: any): CalendarEvent => {
                    const allDay = !!ev.start?.date;
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
