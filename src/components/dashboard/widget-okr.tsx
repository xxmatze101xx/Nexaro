"use client";

import { cn } from "@/lib/utils";

const OKRS = [
  {
    objective: "Marktposition stärken",
    krs: [
      { label: "MRR auf €60K steigern", progress: 80 },
      { label: "NPS > 70 erreichen", progress: 65 },
      { label: "100 Enterprise-Kunden", progress: 42 },
    ],
  },
  {
    objective: "Produkt skalieren",
    krs: [
      { label: "Mobile App launchen", progress: 18 },
      { label: "API v2 veröffentlichen", progress: 55 },
    ],
  },
];

export function WidgetOkr() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">OKR Tracker — Q1 2026</span>
      <div className="flex-1 overflow-y-auto flex flex-col gap-4">
        {OKRS.map((o) => (
          <div key={o.objective}>
            <p className="text-sm font-semibold text-foreground mb-2">{o.objective}</p>
            <div className="flex flex-col gap-2 pl-2">
              {o.krs.map((kr) => (
                <div key={kr.label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs text-muted-foreground">{kr.label}</span>
                    <span className="text-xs font-medium text-foreground tabular-nums">{kr.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", kr.progress >= 70 ? "bg-emerald-500" : kr.progress >= 40 ? "bg-amber-500" : "bg-red-500")}
                      style={{ width: `${kr.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
