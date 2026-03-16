"use client";

import { Calendar, Clock, CheckCircle } from "lucide-react";

const AGENDA = [
  { time: "08:30", title: "Morgendliches E-Mail-Screening", type: "task", done: true },
  { time: "09:00", title: "Team Standup", type: "meeting", done: true },
  { time: "10:00", title: "Product Roadmap Review", type: "meeting", done: false },
  { time: "11:30", title: "Investoren-Pitch vorbereiten", type: "task", done: false },
  { time: "14:00", title: "1:1 mit Head of Sales", type: "meeting", done: false },
  { time: "15:30", title: "Q1 Report finalisieren", type: "task", done: false },
  { time: "17:00", title: "Team-Update schreiben", type: "task", done: false },
];

export function WidgetAgendaToday() {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tagesagenda</span>
        <span className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {AGENDA.map((item) => {
          const [h, m] = item.time.split(":").map(Number);
          const itemMins = h * 60 + m;
          const isPast = item.done || itemMins < nowMins;
          const isCurrent = !item.done && itemMins <= nowMins && itemMins + 60 > nowMins;
          return (
            <div key={item.time} className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${isCurrent ? "bg-primary/10 border border-primary/20" : isPast ? "opacity-50" : "hover:bg-muted/40"}`}>
              <span className="text-[10px] font-mono text-muted-foreground w-9 shrink-0">{item.time}</span>
              {item.done ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> :
                item.type === "meeting" ? <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" /> :
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              <span className={`text-xs truncate ${isCurrent ? "font-medium text-primary" : "text-foreground"}`}>{item.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
