"use client";

import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { text: "Vertrag mit TechCorp unterschreiben — Deadline heute 17 Uhr", score: 98, tag: "Kritisch" },
  { text: "Antwort an Investor Klaus Müller (48h überfällig)", score: 91, tag: "Dringend" },
  { text: "Q1 Board Report finalisieren — Präsentation morgen", score: 87, tag: "Dringend" },
  { text: "Team-Offsite Agenda genehmigen", score: 65, tag: "Wichtig" },
  { text: "Blog-Post für Company Newsletter reviewen", score: 42, tag: "Normal" },
  { text: "Neues Office-Konzept durchsehen", score: 31, tag: "Kann warten" },
];

const TAG_COLORS: Record<string, string> = {
  "Kritisch": "bg-red-500/10 text-red-600 dark:text-red-400",
  "Dringend": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Wichtig": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Normal": "bg-muted text-muted-foreground",
  "Kann warten": "bg-muted text-muted-foreground",
};

export function WidgetSmartPriority() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <Brain className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Smart Priority</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {ITEMS.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
            <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0 mt-0.5">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-snug">{item.text}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium", TAG_COLORS[item.tag])}>{item.tag}</span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", item.score >= 90 ? "bg-red-500" : item.score >= 70 ? "bg-amber-500" : "bg-muted-foreground/50")}
                    style={{ width: `${item.score}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground tabular-nums">{item.score}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
