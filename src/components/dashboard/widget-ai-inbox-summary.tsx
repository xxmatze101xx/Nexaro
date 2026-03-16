"use client";

import { Bot, TrendingUp } from "lucide-react";

const SUMMARY = {
  totalMessages: 47,
  actionRequired: 8,
  highPriority: 3,
  insights: [
    "3 Investor-Updates noch nicht beantwortet (> 48h)",
    "TechCorp-Deal braucht Ihre Unterschrift bis heute",
    "Kundenfeedback zu Feature X häuft sich — positiv",
    "Team-Eskalation zu Budget wartet auf Entscheidung",
  ],
};

export function WidgetAiInboxSummary() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <Bot className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">KI Posteingang-Analyse</span>
      </div>
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <div className="flex flex-col items-center p-2 rounded-xl bg-muted/50">
          <span className="text-xl font-bold text-foreground">{SUMMARY.totalMessages}</span>
          <span className="text-[9px] text-muted-foreground text-center">gesamt</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-xl bg-amber-500/10">
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{SUMMARY.actionRequired}</span>
          <span className="text-[9px] text-amber-600 dark:text-amber-400 text-center">Action nötig</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-xl bg-destructive/10">
          <span className="text-xl font-bold text-destructive">{SUMMARY.highPriority}</span>
          <span className="text-[9px] text-destructive text-center">kritisch</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">KI-Erkenntnisse</p>
        <div className="flex flex-col gap-1">
          {SUMMARY.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-1.5 p-1.5 rounded-lg bg-muted/30">
              <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
              <span className="text-[10px] text-foreground leading-snug">{insight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
