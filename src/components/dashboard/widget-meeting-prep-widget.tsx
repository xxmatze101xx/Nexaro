"use client";

import { Video, Users, FileText, Check } from "lucide-react";

const NEXT_MEETING = {
  title: "Investoren-Pitch Q2 2026",
  time: "14:00 – 15:00 Uhr",
  participants: ["Anna Müller", "Thomas Klein", "Sarah Weber"],
  checklist: [
    { label: "Präsentation aktualisiert", done: true },
    { label: "Zahlen validiert", done: true },
    { label: "Demo-Account vorbereitet", done: false },
    { label: "Backup-Plan erstellt", done: false },
  ],
};

export function WidgetMeetingPrepWidget() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meeting-Vorbereitung</span>
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-2">
          <Video className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">{NEXT_MEETING.title}</p>
            <p className="text-xs text-muted-foreground">{NEXT_MEETING.time}</p>
          </div>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Teilnehmer</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {NEXT_MEETING.participants.map((p) => (
            <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p}</span>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <FileText className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Checkliste</span>
        </div>
        <div className="flex flex-col gap-1">
          {NEXT_MEETING.checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${item.done ? "bg-emerald-500 border-emerald-500" : "border-border"}`}>
                {item.done && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className={`text-xs ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
