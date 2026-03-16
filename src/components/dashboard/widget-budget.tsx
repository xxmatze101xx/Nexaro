"use client";

import { cn } from "@/lib/utils";

const BUDGET_ITEMS = [
  { label: "Marketing", spent: 8400, budget: 10000, color: "bg-blue-500" },
  { label: "Engineering", spent: 24100, budget: 25000, color: "bg-primary" },
  { label: "Sales", spent: 5800, budget: 8000, color: "bg-emerald-500" },
  { label: "Operations", spent: 3200, budget: 4000, color: "bg-amber-500" },
  { label: "R&D", spent: 7900, budget: 6000, color: "bg-red-500" },
];

export function WidgetBudget() {
  const totalSpent = BUDGET_ITEMS.reduce((s, i) => s + i.spent, 0);
  const totalBudget = BUDGET_ITEMS.reduce((s, i) => s + i.budget, 0);
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget März 2026</span>
        <span className="text-[10px] text-muted-foreground">€{totalSpent.toLocaleString("de-DE")} / €{totalBudget.toLocaleString("de-DE")}</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {BUDGET_ITEMS.map((item) => {
          const pct = Math.min(item.spent / item.budget, 1);
          const over = item.spent > item.budget;
          return (
            <div key={item.label}>
              <div className="flex justify-between mb-0.5">
                <span className="text-xs text-foreground">{item.label}</span>
                <span className={cn("text-[10px] font-medium tabular-nums", over ? "text-red-500" : "text-muted-foreground")}>
                  €{item.spent.toLocaleString("de-DE")} / €{item.budget.toLocaleString("de-DE")}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", over ? "bg-red-500" : item.color)} style={{ width: `${pct * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
