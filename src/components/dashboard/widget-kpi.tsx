"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const KPIS = [
  { label: "MRR", value: "€ 48.2K", change: 8.3, unit: "" },
  { label: "Aktive Kunden", value: "1,284", change: 12.1, unit: "" },
  { label: "Churn", value: "2.1%", change: -0.4, unit: "" },
  { label: "NPS", value: "67", change: 5.0, unit: "" },
  { label: "Support Tickets", value: "23", change: -15.2, unit: "" },
  { label: "Umsatz (MTD)", value: "€ 142K", change: 22.8, unit: "" },
];

export function WidgetKpi() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">KPI-Dashboard</span>
      <div className="grid grid-cols-3 gap-2 flex-1">
        {KPIS.map((kpi) => {
          const positive = kpi.label === "Churn" || kpi.label === "Support Tickets" ? kpi.change < 0 : kpi.change > 0;
          return (
            <div key={kpi.label} className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-muted/50">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
              <span className="text-base font-bold text-foreground leading-tight">{kpi.value}</span>
              <span className={cn("flex items-center gap-0.5 text-[10px] font-semibold",
                positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {kpi.change > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {kpi.change > 0 ? "+" : ""}{kpi.change}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
