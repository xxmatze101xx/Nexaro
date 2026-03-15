"use client";

/**
 * MeetingPrepPanel
 *
 * Displays upcoming meetings (next 24 h) with a "Prepare" button that
 * triggers AI-generated briefings. Each briefing is shown inline below
 * the meeting card.
 */

import type { UpcomingMeeting } from "@/hooks/useMeetingPrep";

interface MeetingPrepPanelProps {
    meetings: UpcomingMeeting[];
    isLoading: boolean;
    onGenerateBriefing: (eventId: string) => void;
    className?: string;
}

function formatMeetingTime(start: Date, end: Date): string {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const isToday = start >= startOfToday && start < startOfTomorrow;
    const dayLabel = isToday ? "Today" : "Tomorrow";

    const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const endStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${dayLabel} · ${timeStr} – ${endStr}`;
}

function minutesUntil(start: Date): number {
    return Math.round((start.getTime() - Date.now()) / 60_000);
}

function BriefingSection({ text }: { text: string }) {
    // Parse the structured briefing into sections
    const sections = text.split(/\n(?=DISCUSSION TOPICS:|PREVIOUS DECISIONS:|IMPORTANT CONTEXT:)/);

    return (
        <div className="mt-3 space-y-3 text-xs text-gray-700 dark:text-gray-300">
            {sections.map((section, i) => {
                const colonIdx = section.indexOf(":");
                if (colonIdx === -1) {
                    return (
                        <p key={i} className="leading-relaxed whitespace-pre-wrap">
                            {section.trim()}
                        </p>
                    );
                }
                const heading = section.slice(0, colonIdx).trim();
                const body = section.slice(colonIdx + 1).trim();
                const lines = body.split("\n").filter(l => l.trim());

                return (
                    <div key={i}>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1 uppercase tracking-wide text-[10px]">
                            {heading}
                        </p>
                        <ul className="space-y-0.5">
                            {lines.map((line, j) => (
                                <li key={j} className="leading-relaxed pl-2 border-l-2 border-gray-200 dark:border-gray-600">
                                    {line.replace(/^[-•]\s*/, "")}
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}

function MeetingCard({
    meeting,
    onGenerateBriefing,
}: {
    meeting: UpcomingMeeting;
    onGenerateBriefing: (id: string) => void;
}) {
    const { event, briefing, isGenerating, error } = meeting;
    const mins = minutesUntil(event.start);
    const isImminent = mins <= 30 && mins >= 0;
    const attendeeNames = (event.attendees ?? [])
        .filter(a => !a.self)
        .map(a => a.displayName ?? a.email)
        .slice(0, 3);

    return (
        <div
            className={`rounded-lg border p-3 transition-colors ${
                isImminent
                    ? "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            }`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {event.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatMeetingTime(event.start, event.end)}
                        {isImminent && (
                            <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">
                                in {mins} min
                            </span>
                        )}
                    </p>
                    {attendeeNames.length > 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                            {attendeeNames.join(", ")}
                            {(event.attendees?.length ?? 0) > 3 && (
                                <span> +{(event.attendees?.length ?? 0) - 3} more</span>
                            )}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {event.conferenceLink && (
                        <a
                            href={event.conferenceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                        >
                            Join
                        </a>
                    )}
                    {!briefing && (
                        <button
                            onClick={() => onGenerateBriefing(event.id)}
                            disabled={isGenerating}
                            className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {isGenerating ? (
                                <span className="flex items-center gap-1">
                                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Preparing…
                                </span>
                            ) : (
                                "Prepare"
                            )}
                        </button>
                    )}
                    {briefing && (
                        <span className="text-xs text-green-600 dark:text-green-400">✓ Ready</span>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {error} —{" "}
                    <button
                        onClick={() => onGenerateBriefing(event.id)}
                        className="underline hover:no-underline"
                    >
                        retry
                    </button>
                </p>
            )}

            {/* Briefing */}
            {briefing && <BriefingSection text={briefing.briefing} />}
        </div>
    );
}

export function MeetingPrepPanel({
    meetings,
    isLoading,
    onGenerateBriefing,
    className = "",
}: MeetingPrepPanelProps) {
    if (isLoading) {
        return (
            <div className={`${className}`}>
                <p className="text-xs text-gray-400 dark:text-gray-500 py-2">
                    Loading upcoming meetings…
                </p>
            </div>
        );
    }

    if (meetings.length === 0) {
        return (
            <div className={`${className}`}>
                <p className="text-xs text-gray-400 dark:text-gray-500 py-2">
                    No meetings in the next 24 hours.
                </p>
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {meetings.map(meeting => (
                <MeetingCard
                    key={meeting.event.id}
                    meeting={meeting}
                    onGenerateBriefing={onGenerateBriefing}
                />
            ))}
        </div>
    );
}
