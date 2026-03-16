"use client";

import { TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function WidgetRevenue() {
  const current = 142800;
  const target = 180000;
  const pct = current / target;
  const yoy = 28.4;

  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Umsatz — März 2026</span>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground">€{(current / 1000).toFixed(0)}K</p>
          <div className="flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+{yoy}% YoY</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-right">
          <Target className="w-3.5 h-3.5 text-muted-foreground" />
          <div>
            <p className="text-[10px] text-muted-foreground">Ziel</p>
            <p className="text-sm font-bold text-foreground">€{(target / 1000).toFixed(0)}K</p>
          </div>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Zielerfüllung</span>
          <span>{Math.round(pct * 100)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full", pct >= 1 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${Math.min(pct, 1) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
