"use client";

import { Mail, Video, CheckSquare, TrendingUp } from "lucide-react";

const STATS = [
  { icon: Mail, label: "E-Mails bearbeitet", value: 284, change: "+12%" },
  { icon: Video, label: "Meetings", value: 18, change: "-2" },
  { icon: CheckSquare, label: "Aufgaben erledigt", value: 47, change: "+8" },
  { icon: TrendingUp, label: "Fokus-Stunden", value: "31h", change: "+4h" },
];

const TOP_ITEMS = [
  "Investoren-Pitch erfolgreich abgeschlossen",
  "API v2 Feature-Freeze erreicht",
  "3 neue Enterprise-Kunden gewonnen",
  "Team auf 12 Personen erweitert",
];

export function WidgetWeeklySummary() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wochenzusammenfassung</span>
        <span className="text-[10px] text-muted-foreground">KW {Math.ceil((monday.getDate() - 1 + new Date(monday.getFullYear(), 0, 1).getDay()) / 7)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {STATS.map(({ icon: Icon, label, value, change }) => (
          <div key={label} className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-muted/50">
            <div className="flex items-center gap-1">
              <Icon className="w-3 h-3 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground">{value}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{change}</span>
            </div>
          </div>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Highlights</p>
        <div className="flex flex-col gap-1">
          {TOP_ITEMS.map((item) => (
            <div key={item} className="flex items-start gap-1.5">
              <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
              <span className="text-xs text-foreground leading-snug">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
