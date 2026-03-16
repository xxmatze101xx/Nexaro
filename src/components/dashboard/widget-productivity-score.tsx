"use client";

import { cn } from "@/lib/utils";

const SCORE = 78;
const FACTORS = [
  { label: "E-Mail-Antwortzeit", score: 85 },
  { label: "Aufgaben erledigt", score: 70 },
  { label: "Fokus-Stunden", score: 62 },
  { label: "Meeting-Effizienz", score: 88 },
];

export function WidgetProductivityScore() {
  const circumference = 2 * Math.PI * 32;
  const offset = circumference * (1 - SCORE / 100);
  const color = SCORE >= 80 ? "stroke-emerald-500" : SCORE >= 60 ? "stroke-amber-500" : "stroke-red-500";

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" strokeWidth="6" className="stroke-muted" />
          <circle cx="40" cy="40" r="32" fill="none" strokeWidth="6" strokeLinecap="round"
            className={color} strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-foreground">{SCORE}</span>
          <span className="text-[9px] text-muted-foreground">Score</span>
        </div>
      </div>
      <div className="w-full flex flex-col gap-1">
        {FACTORS.map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground flex-1 truncate">{f.label}</span>
            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", f.score >= 80 ? "bg-emerald-500" : f.score >= 60 ? "bg-amber-500" : "bg-red-500")}
                style={{ width: `${f.score}%` }} />
            </div>
            <span className="text-[10px] font-medium text-foreground w-5 text-right tabular-nums">{f.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
