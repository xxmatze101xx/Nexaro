"use client";

import { cn } from "@/lib/utils";

const FUNNEL = [
  { stage: "Besucher", value: 10400, pct: 100 },
  { stage: "Leads", value: 2184, pct: 21 },
  { stage: "Trials", value: 436, pct: 4.2 },
  { stage: "Kunden", value: 87, pct: 0.84 },
];

export function WidgetConversion() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Konversionsrate</span>
      <div className="flex-1 flex flex-col justify-center gap-2">
        {FUNNEL.map((stage, i) => (
          <div key={stage.stage}>
            <div className="flex justify-between mb-0.5">
              <span className="text-xs text-foreground">{stage.stage}</span>
              <div className="flex gap-2">
                <span className="text-xs font-medium text-foreground tabular-nums">{stage.value.toLocaleString("de-DE")}</span>
                <span className="text-[10px] text-muted-foreground w-10 text-right tabular-nums">{stage.pct}%</span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all",
                i === 0 ? "bg-blue-500" : i === 1 ? "bg-primary" : i === 2 ? "bg-amber-500" : "bg-emerald-500")}
                style={{ width: `${stage.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
