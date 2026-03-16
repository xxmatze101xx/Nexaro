"use client";

import { CreditCard } from "lucide-react";

const EXPENSES = [
  { vendor: "AWS Cloud Services", amount: 2840, category: "Infrastruktur", date: "15.03." },
  { vendor: "HubSpot CRM", amount: 890, category: "Software", date: "14.03." },
  { vendor: "Geschäftsreise Berlin", amount: 645, category: "Reise", date: "13.03." },
  { vendor: "LinkedIn Ads", amount: 1200, category: "Marketing", date: "12.03." },
  { vendor: "Büro Miete", amount: 3500, category: "Miete", date: "01.03." },
];

export function WidgetExpenses() {
  const total = EXPENSES.reduce((s, e) => s + e.amount, 0);
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ausgaben</span>
        <span className="text-sm font-bold text-foreground">€{total.toLocaleString("de-DE")}</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {EXPENSES.map((e) => (
          <div key={e.vendor} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{e.vendor}</p>
              <p className="text-[10px] text-muted-foreground">{e.category} · {e.date}</p>
            </div>
            <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">€{e.amount.toLocaleString("de-DE")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
