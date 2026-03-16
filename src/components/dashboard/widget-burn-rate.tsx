"use client";

import { Flame } from "lucide-react";

export function WidgetBurnRate() {
  const burnRate = 89400;
  const runway = 14.2;
  const cashBalance = burnRate * runway;

  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <div className="flex items-center gap-1.5">
        <Flame className="w-3.5 h-3.5 text-orange-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Burn Rate</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">€{burnRate.toLocaleString("de-DE")}</p>
        <p className="text-xs text-muted-foreground">pro Monat</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-xl bg-muted/50">
          <p className="text-[10px] text-muted-foreground">Cash Balance</p>
          <p className="text-sm font-bold text-foreground">€{(cashBalance / 1000000).toFixed(1)}M</p>
        </div>
        <div className="p-2 rounded-xl bg-amber-500/10">
          <p className="text-[10px] text-amber-600 dark:text-amber-400">Runway</p>
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{runway} Monate</p>
        </div>
      </div>
    </div>
  );
}
