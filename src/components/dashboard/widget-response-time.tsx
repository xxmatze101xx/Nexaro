"use client";

import { Clock, TrendingDown } from "lucide-react";

export function WidgetResponseTime() {
  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Antwortzeit</span>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-foreground leading-none">23</span>
        <span className="text-lg text-muted-foreground mb-0.5">Min</span>
      </div>
      <div className="flex items-center gap-1.5">
        <TrendingDown className="w-3 h-3 text-emerald-500" />
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">−18% vs. gestern</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Diese Woche</span>
          <span>28 Min Ø</span>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Letzter Monat</span>
          <span>35 Min Ø</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Ziel: unter 30 Minuten</span>
      </div>
    </div>
  );
}
