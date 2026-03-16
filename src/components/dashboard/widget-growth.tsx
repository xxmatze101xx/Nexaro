"use client";

import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const METRICS = [
  { label: "Kundenwachstum", value: "+12.4%", detail: "1.284 → 1.443", positive: true },
  { label: "Umsatzwachstum", value: "+28.4%", detail: "YoY", positive: true },
  { label: "Team-Wachstum", value: "+42%", detail: "7 → 12 Personen", positive: true },
  { label: "Ticket-Wachstum", value: "+8%", detail: "Support-Last steigt", positive: false },
];

export function WidgetGrowth() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wachstumsmetriken</span>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {METRICS.map((m) => (
          <div key={m.label} className={cn("flex flex-col gap-1 p-2.5 rounded-xl", m.positive ? "bg-emerald-500/5" : "bg-amber-500/5")}>
            <span className="text-[9px] text-muted-foreground leading-tight">{m.label}</span>
            <div className="flex items-center gap-1">
              <TrendingUp className={cn("w-3 h-3", m.positive ? "text-emerald-500" : "text-amber-500")} />
              <span className={cn("text-base font-bold", m.positive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>{m.value}</span>
            </div>
            <span className="text-[9px] text-muted-foreground">{m.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
