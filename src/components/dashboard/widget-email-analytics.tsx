"use client";

import { cn } from "@/lib/utils";

const STATS = [
  { label: "Öffnungsrate", value: 42.1, benchmark: 35, unit: "%" },
  { label: "Klickrate", value: 8.4, benchmark: 5, unit: "%" },
  { label: "Abmelderate", value: 0.8, benchmark: 1.2, unit: "%", lowerBetter: true },
  { label: "Bounce Rate", value: 1.2, benchmark: 2.0, unit: "%", lowerBetter: true },
];

export function WidgetEmailAnalytics() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-Mail Analytics</span>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {STATS.map((s) => {
          const good = s.lowerBetter ? s.value <= s.benchmark : s.value >= s.benchmark;
          return (
            <div key={s.label} className={cn("flex flex-col gap-1 p-2.5 rounded-xl", good ? "bg-emerald-500/5" : "bg-amber-500/5")}>
              <span className="text-[9px] text-muted-foreground leading-tight">{s.label}</span>
              <span className={cn("text-xl font-bold tabular-nums", good ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                {s.value}{s.unit}
              </span>
              <span className="text-[9px] text-muted-foreground">Benchmark: {s.benchmark}{s.unit}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
