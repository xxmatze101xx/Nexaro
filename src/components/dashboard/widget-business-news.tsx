"use client";

import { ExternalLink } from "lucide-react";

const NEWS = [
  { title: "Deutsche Wirtschaft wächst stärker als erwartet im Q4", source: "FAZ", time: "vor 1 Std" },
  { title: "EZB hält Leitzins — Zinssenkung im Sommer erwartet", source: "Handelsblatt", time: "vor 3 Std" },
  { title: "SAP übertrifft Erwartungen — Aktie steigt 8%", source: "Bloomberg", time: "vor 5 Std" },
  { title: "Start-up-Finanzierungen in DACH auf Rekordhoch", source: "Gründerszene", time: "gestern" },
  { title: "Siemens baut 2.000 neue Stellen in KI-Bereich auf", source: "Reuters", time: "gestern" },
];

export function WidgetBusinessNews() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business News</span>
        <span className="text-[10px] text-primary">KI generiert</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {NEWS.map((n) => (
          <div key={n.title} className="flex items-start gap-2 group cursor-pointer p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground leading-snug group-hover:text-primary transition-colors">{n.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{n.source}</span>
                <span className="text-[9px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">{n.time}</span>
              </div>
            </div>
            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
