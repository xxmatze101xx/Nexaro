"use client";

import { TrendingDown } from "lucide-react";

export function WidgetChurn() {
  const churn = 2.1;
  const prev = 2.5;
  const improvement = prev - churn;

  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Churn Rate</span>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-foreground leading-none">{churn}%</span>
        <span className="text-sm text-muted-foreground mb-0.5">monatlich</span>
      </div>
      <div className="flex items-center gap-1.5">
        <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">−{improvement.toFixed(1)}pp vs. Vormonat</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-xl bg-muted/50">
          <p className="text-[9px] text-muted-foreground">Ø Kundenlaufzeit</p>
          <p className="text-sm font-bold text-foreground">47 Monate</p>
        </div>
        <div className="p-2 rounded-xl bg-muted/50">
          <p className="text-[9px] text-muted-foreground">Kündigungen/Monat</p>
          <p className="text-sm font-bold text-foreground">27</p>
        </div>
      </div>
    </div>
  );
}
