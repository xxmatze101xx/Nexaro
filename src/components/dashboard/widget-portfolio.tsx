"use client";

import { TrendingUp } from "lucide-react";

const HOLDINGS = [
  { name: "S&P 500 ETF", value: 48200, change: 12.4, pct: 38 },
  { name: "Tech Stocks", value: 32100, change: 18.7, pct: 26 },
  { name: "Real Estate", value: 25000, change: 5.2, pct: 20 },
  { name: "Bonds", value: 12800, change: 2.1, pct: 10 },
  { name: "Crypto", value: 7600, change: 34.8, pct: 6 },
];

const COLORS = ["bg-primary", "bg-blue-500", "bg-amber-500", "bg-emerald-500", "bg-purple-500"];

export function WidgetPortfolio() {
  const total = HOLDINGS.reduce((s, h) => s + h.value, 0);
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Portfolio</span>
      <div>
        <p className="text-2xl font-bold text-foreground">€{total.toLocaleString("de-DE")}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+12.4% YTD</span>
        </div>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {HOLDINGS.map((h, i) => (
          <div key={h.name} className={COLORS[i]} style={{ width: `${h.pct}%` }} />
        ))}
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {HOLDINGS.map((h, i) => (
          <div key={h.name} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${COLORS[i]}`} />
            <span className="text-xs text-foreground flex-1 truncate">{h.name}</span>
            <span className="text-xs font-medium text-foreground tabular-nums">€{h.value.toLocaleString("de-DE")}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 w-12 text-right">+{h.change}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
