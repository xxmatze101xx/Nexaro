"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEK_DATA = [
  { day: "Mo", hours: 7.5 },
  { day: "Di", hours: 6.0 },
  { day: "Mi", hours: 8.0 },
  { day: "Do", hours: 7.0 },
  { day: "Fr", hours: 6.5 },
  { day: "Sa", hours: 9.0 },
  { day: "So", hours: 8.5 },
];

const MAX_H = 9;
const TARGET = 8;

export function WidgetSleepTracker() {
  const avg = (WEEK_DATA.reduce((s, d) => s + d.hours, 0) / WEEK_DATA.length).toFixed(1);
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Moon className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schlaf-Tracker</span>
        </div>
        <div className="flex items-center gap-1">
          <Sun className="w-3 h-3 text-amber-500" />
          <span className="text-xs font-medium text-foreground">{avg}h Ø</span>
        </div>
      </div>
      <div className="flex-1 flex items-end gap-1.5">
        {WEEK_DATA.map((d) => {
          const h = (d.hours / MAX_H) * 100;
          const isGood = d.hours >= TARGET;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-muted-foreground">{d.hours}h</span>
              <div className={cn("w-full rounded-t-sm transition-colors", isGood ? "bg-indigo-500" : "bg-amber-500")}
                style={{ height: `${h}%`, minHeight: "4px" }} />
              <span className="text-[9px] text-muted-foreground">{d.day}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-[9px] text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-indigo-500" />≥ {TARGET}h</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-500" />&lt; {TARGET}h</div>
      </div>
    </div>
  );
}
