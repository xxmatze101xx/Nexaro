"use client";

import { cn } from "@/lib/utils";

const NPS_SCORE = 67;
const HISTORY = [52, 55, 58, 61, 64, 67];
const MONTHS = ["Okt", "Nov", "Dez", "Jan", "Feb", "Mär"];
const BREAKDOWN = { promoters: 72, passives: 23, detractors: 5 };

export function WidgetNps() {
  const scoreColor = NPS_SCORE >= 70 ? "text-emerald-500" : NPS_SCORE >= 50 ? "text-amber-500" : "text-red-500";
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Promoter Score</span>
      <div className="flex items-center gap-4">
        <span className={cn("text-5xl font-bold leading-none", scoreColor)}>{NPS_SCORE}</span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-emerald-600">Promoter: {BREAKDOWN.promoters}%</span>
          <span className="text-[10px] text-amber-600">Passiv: {BREAKDOWN.passives}%</span>
          <span className="text-[10px] text-red-500">Kritiker: {BREAKDOWN.detractors}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex gap-0.5">
        <div className="bg-emerald-500 rounded-l-full" style={{ width: `${BREAKDOWN.promoters}%` }} />
        <div className="bg-amber-500" style={{ width: `${BREAKDOWN.passives}%` }} />
        <div className="bg-red-500 rounded-r-full" style={{ width: `${BREAKDOWN.detractors}%` }} />
      </div>
      <div className="flex-1 flex items-end gap-1">
        {HISTORY.map((v, i) => {
          const h = ((v - 40) / 40) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn("w-full rounded-t-sm", i === HISTORY.length - 1 ? "bg-primary" : "bg-muted")}
                style={{ height: `${Math.max(h, 5)}%` }} />
              <span className="text-[9px] text-muted-foreground">{MONTHS[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
