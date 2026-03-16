"use client";

import { Sparkles, ArrowRight } from "lucide-react";

const RECS = [
  { title: "Antworte auf Investor-Update", reason: "48h ohne Antwort — sendet falsches Signal", action: "Jetzt antworten", urgency: "high" as Urgency },
  { title: "Plane 1:1 mit Head of Engineering", reason: "Laut Slack-Analyse steigt Tech-Burnout", action: "Meeting planen", urgency: "medium" as Urgency },
  { title: "Überprüfe Churn-Gründe von 3 Kunden", reason: "Muster erkannt: Onboarding-Probleme", action: "Analyse starten", urgency: "medium" as Urgency },
  { title: "Veröffentliche Team-Update", reason: "Kein Company-Update seit 2 Wochen", action: "Update schreiben", urgency: "low" as Urgency },
];

type Urgency = "high" | "medium" | "low";
const URGENCY_COLORS: Record<Urgency, string> = { high: "border-red-500/30 bg-red-500/5", medium: "border-amber-500/30 bg-amber-500/5", low: "border-border bg-muted/30" };

export function WidgetAiRecommendations() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">KI Empfehlungen</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {RECS.map((r) => (
          <div key={r.title} className={`p-2.5 rounded-xl border ${URGENCY_COLORS[r.urgency]}`}>
            <p className="text-xs font-semibold text-foreground">{r.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{r.reason}</p>
            <button className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-primary hover:underline">
              {r.action} <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
