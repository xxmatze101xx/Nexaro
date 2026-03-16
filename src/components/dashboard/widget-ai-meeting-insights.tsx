"use client";

import { Cpu } from "lucide-react";

const INSIGHTS = [
  { meeting: "Investoren-Pitch", date: "14.03.", sentiment: 92, topics: ["Finanzierung", "Wachstum", "Roadmap"], followUps: 3 },
  { meeting: "Team-Retrospektive", date: "13.03.", sentiment: 74, topics: ["Prozesse", "Tooling", "Burnout"], followUps: 7 },
  { meeting: "Sales Review", date: "12.03.", sentiment: 88, topics: ["Pipeline", "Deals", "Q2 Ziele"], followUps: 2 },
];

export function WidgetAiMeetingInsights() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <Cpu className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">KI Meeting-Insights</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {INSIGHTS.map((m) => (
          <div key={m.meeting} className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-foreground">{m.meeting}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{m.date}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.sentiment >= 85 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                  {m.sentiment}%
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-1">
              {m.topics.map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>)}
            </div>
            <p className="text-[10px] text-muted-foreground">{m.followUps} Follow-ups erkannt</p>
          </div>
        ))}
      </div>
    </div>
  );
}
