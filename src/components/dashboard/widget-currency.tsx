"use client";

import { ArrowRight } from "lucide-react";

const RATES = [
  { from: "EUR", to: "USD", rate: 1.0842 },
  { from: "EUR", to: "GBP", rate: 0.8531 },
  { from: "EUR", to: "JPY", rate: 162.45 },
  { from: "EUR", to: "CHF", rate: 0.9612 },
  { from: "EUR", to: "CNY", rate: 7.8234 },
];

export function WidgetCurrency() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wechselkurse</span>
        <span className="text-[9px] text-muted-foreground">Basis: EUR</span>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-2">
        {RATES.map((r) => (
          <div key={r.to} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <span className="text-xs font-semibold text-muted-foreground w-8">{r.from}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold text-foreground w-8">{r.to}</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm font-bold tabular-nums text-foreground">{r.rate.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
