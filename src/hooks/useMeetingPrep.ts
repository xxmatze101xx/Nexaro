/**
 * useMeetingPrep.ts
 *
 * Loads upcoming calendar events (next 24 h) and provides a function to
 * generate AI-powered meeting briefings for each event.
 *
 * The hook:
 *   1. Fetches events via fetchCalendarEvents for each calendar account.
 *   2. Filters to non-all-day meetings in the next 24 h (max 5).
 *   3. generateBriefing(eventId) — finds relevant messages by keyword-matching
 *      attendee names / meeting title against allMessages, then calls
 *      POST /api/ai/meeting-prep.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { fetchCalendarEvents } from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/calendar";
import type { Message } from "@/lib/mock-data";

const LOOKAHEAD_HOURS = 24;

export interface MeetingBriefing {
    eventId: string;
    briefing: string;
    generatedAt: string;
}

export interface UpcomingMeeting {
    event: CalendarEvent;
    briefing: MeetingBriefing | null;
    isGenerating: boolean;
    error: string | null;
}

export interface UseMeetingPrepResult {
    meetings: UpcomingMeeting[];
    isLoading: boolean;
    generateBriefing: (eventId: string) => Promise<void>;
}

export function useMeetingPrep(
    uid: string | null,
    calendarEmails: string[],
    allMessages: Message[],
): UseMeetingPrepResult {
    const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load upcoming meetings whenever uid or calendar accounts change
    useEffect(() => {
        if (!uid || calendarEmails.length === 0) {
            setMeetings([]);
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        const load = async () => {
            const now = new Date();
            const lookahead = new Date(now.getTime() + LOOKAHEAD_HOURS * 60 * 60 * 1000);

            const allEvents: CalendarEvent[] = [];
            for (const email of calendarEmails) {
                try {
                    const events = await fetchCalendarEvents(uid, email, now, lookahead);
                    allEvents.push(...events);
                } catch (e: unknown) {
                    console.warn(
                        "[useMeetingPrep] Error loading events for",
                        email,
                        e instanceof Error ? e.message : String(e),
                    );
                }
            }

            if (cancelled) return;

            const upcoming = allEvents
                .filter(e => !e.allDay)
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .slice(0, 5);

            setMeetings(
                upcoming.map(event => ({
                    event,
                    briefing: null,
                    isGenerating: false,
                    error: null,
                })),
            );
            setIsLoading(false);
        };

        load().catch((e: unknown) => {
            if (!cancelled) {
                console.warn(
                    "[useMeetingPrep] Error loading meetings:",
                    e instanceof Error ? e.message : String(e),
                );
                setIsLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [uid, calendarEmails]);

    const generateBriefing = useCallback(
        async (eventId: string) => {
            const user = auth.currentUser;
            if (!user) return;

            const target = meetings.find(m => m.event.id === eventId);
            if (!target || target.isGenerating) return;

            setMeetings(prev =>
                prev.map(m =>
                    m.event.id === eventId ? { ...m, isGenerating: true, error: null } : m,
                ),
            );

            const { event } = target;

            // Build search terms from meeting title words + attendee names/emails
            const titleWords = event.title
                .toLowerCase()
                .split(/\s+/)
                .filter(w => w.length > 3);
            const attendeeTerms = (event.attendees ?? []).map(a =>
                (a.displayName ?? a.email).toLowerCase(),
            );
            const searchTerms = [...new Set([...titleWords, ...attendeeTerms])].filter(
                t => t.length > 3,
            );

            const relevant = allMessages
                .filter(msg => {
                    if (searchTerms.length === 0) return false;
                    const haystack =
                        `${msg.sender} ${msg.subject ?? ""} ${msg.content}`.toLowerCase();
                    return searchTerms.some(term => haystack.includes(term));
                })
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 8)
                .map(msg => ({
                    sender: msg.sender,
                    subject: msg.subject ?? "(no subject)",
                    snippet: msg.content.slice(0, 300),
                    timestamp: msg.timestamp,
                }));

            try {
                const idToken = await user.getIdToken();
                const res = await fetch("/api/ai/meeting-prep", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        title: event.title,
                        attendees: (event.attendees ?? [])
                            .filter(a => !a.self)
                            .map(a => a.displayName ?? a.email)
                            .filter(Boolean),
                        startTime: event.start.toISOString(),
                        description: event.description,
                        messageExcerpts: relevant,
                    }),
                });

                if (!res.ok) {
                    const errData = (await res.json().catch(() => ({}))) as { error?: string };
                    throw new Error(errData.error ?? `API error ${res.status}`);
                }

                const data = (await res.json()) as { briefing: string };

                setMeetings(prev =>
                    prev.map(m =>
                        m.event.id === eventId
                            ? {
                                  ...m,
                                  isGenerating: false,
                                  briefing: {
                                      eventId,
                                      briefing: data.briefing,
                                      generatedAt: new Date().toISOString(),
                                  },
                              }
                            : m,
                    ),
                );
            } catch (err: unknown) {
                setMeetings(prev =>
                    prev.map(m =>
                        m.event.id === eventId
                            ? {
                                  ...m,
                                  isGenerating: false,
                                  error:
                                      err instanceof Error ? err.message : "Briefing generation failed",
                              }
                            : m,
                    ),
                );
            }
        },
        [meetings, allMessages],
    );

    return { meetings, isLoading, generateBriefing };
}
