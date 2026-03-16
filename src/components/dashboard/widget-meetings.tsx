"use client";

import { Calendar, Clock, Video } from "lucide-react";
import type { UpcomingMeeting } from "@/hooks/useMeetingPrep";

interface WidgetMeetingsProps {
  meetings: UpcomingMeeting[];
  isLoading: boolean;
}

export function WidgetMeetings({ meetings, isLoading }: WidgetMeetingsProps) {
  const upcoming = meetings.slice(0, 3);

  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Nächste Meetings
      </span>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      ) : upcoming.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Calendar className="w-6 h-6 opacity-30" />
          <p className="text-xs text-center">Keine Meetings in den nächsten 24 Stunden</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 flex-1">
          {upcoming.map((m) => {
            const start = new Date(m.event.start);
            const end = new Date(m.event.end);
            const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);
            const startStr = start.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={m.event.id}
                className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/50 border border-border/50"
              >
                <p className="text-sm font-medium text-foreground truncate leading-snug">
                  {m.event.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {startStr}
                  </span>
                  <span>·</span>
                  <span>{durationMin} Min</span>
                  {m.event.conferenceLink && (
                    <>
                      <span>·</span>
                      <Video className="w-3 h-3 text-blue-500" />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
