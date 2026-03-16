"use client";

import { TrendingUp } from "lucide-react";

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const VISITS = [1240, 1580, 1890, 2100, 1760, 980, 740];
const MAX_V = Math.max(...VISITS);

export function WidgetVisitorStats() {
  const today = VISITS[5];
  const total = VISITS.reduce((s, v) => s + v, 0);
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Website-Besucher</span>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground">{total.toLocaleString("de-DE")}</p>
          <p className="text-[10px] text-muted-foreground">diese Woche</p>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+18% WoW</span>
        </div>
      </div>
      <div className="flex-1 flex items-end gap-1.5">
        {VISITS.map((v, i) => {
          const h = (v / MAX_V) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-primary/80 rounded-t-sm" style={{ height: `${h}%`, minHeight: "2px" }} />
              <span className="text-[9px] text-muted-foreground">{DAYS[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
