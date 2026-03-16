"use client";

import { cn } from "@/lib/utils";

const SENTIMENT = { positive: 52, neutral: 31, negative: 17 };
const SOURCES = [
  { name: "Kunden", positive: 68, neutral: 22, negative: 10 },
  { name: "Investoren", positive: 45, neutral: 40, negative: 15 },
  { name: "Team", positive: 72, neutral: 21, negative: 7 },
];

export function WidgetInboxSentiment() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inbox Sentiment</span>
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-14 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="24" fill="none" strokeWidth="5" className="stroke-muted" />
            <circle cx="30" cy="30" r="24" fill="none" strokeWidth="5" strokeLinecap="butt"
              className="stroke-emerald-500" strokeDasharray={`${SENTIMENT.positive * 1.508} ${(100 - SENTIMENT.positive) * 1.508}`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{SENTIMENT.positive}%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          {[
            { label: "Positiv", pct: SENTIMENT.positive, color: "bg-emerald-500" },
            { label: "Neutral", pct: SENTIMENT.neutral, color: "bg-muted-foreground/50" },
            { label: "Negativ", pct: SENTIMENT.negative, color: "bg-red-500" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-12">{s.label}</span>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", s.color)} style={{ width: `${s.pct}%` }} />
              </div>
              <span className="text-[10px] font-medium text-foreground w-7 text-right tabular-nums">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {SOURCES.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-16">{s.name}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500" style={{ width: `${s.positive}%` }} />
              <div className="bg-muted-foreground/30" style={{ width: `${s.neutral}%` }} />
              <div className="bg-red-500" style={{ width: `${s.negative}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
