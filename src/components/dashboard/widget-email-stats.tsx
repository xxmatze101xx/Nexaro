"use client";

import { Mail, Send, Clock, TrendingUp } from "lucide-react";

const STATS = [
  { icon: Mail, label: "Empfangen", value: 47, sub: "heute" },
  { icon: Send, label: "Gesendet", value: 12, sub: "heute" },
  { icon: Clock, label: "Unbeantwortet", value: 8, sub: "seit gestern" },
  { icon: TrendingUp, label: "Ø Antwortzeit", value: "23 Min", sub: "heute" },
];

export function WidgetEmailStats() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-Mail Statistiken</span>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {STATS.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/50">
            <div className="flex items-center gap-1.5">
              <Icon className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
            <span className="text-xl font-bold text-foreground leading-none">{value}</span>
            <span className="text-[9px] text-muted-foreground">{sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
