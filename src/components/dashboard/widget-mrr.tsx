"use client";

import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Okt", "Nov", "Dez", "Jan", "Feb", "Mär"];
const MRR_DATA = [38000, 40200, 42100, 44800, 46200, 48400];
const MAX_MRR = Math.max(...MRR_DATA);

export function WidgetMrr() {
  const current = MRR_DATA[MRR_DATA.length - 1];
  const prev = MRR_DATA[MRR_DATA.length - 2];
  const growthPct = ((current - prev) / prev * 100).toFixed(1);

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">MRR / ARR</span>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground">€{(current / 1000).toFixed(1)}K</p>
          <div className="flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+{growthPct}% MoM</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">ARR</p>
          <p className="text-base font-bold text-foreground">€{(current * 12 / 1000).toFixed(0)}K</p>
        </div>
      </div>
      <div className="flex-1 flex items-end gap-1">
        {MRR_DATA.map((v, i) => {
          const h = (v / MAX_MRR) * 100;
          const isLast = i === MRR_DATA.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn("w-full rounded-t-sm transition-colors", isLast ? "bg-primary" : "bg-muted")}
                style={{ height: `${h}%`, minHeight: "4px" }} />
              <span className="text-[9px] text-muted-foreground">{MONTHS[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
