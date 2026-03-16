"use client";

import { ExternalLink } from "lucide-react";

const NEWS = [
  { title: "OpenAI stellt GPT-5 vor — größtes Modell aller Zeiten", source: "TechCrunch", time: "vor 2 Std" },
  { title: "Apple kündigt neue KI-Funktionen für iOS 20 an", source: "The Verge", time: "vor 4 Std" },
  { title: "EU verabschiedet neues KI-Gesetz — was ändert sich?", source: "Wired", time: "vor 6 Std" },
  { title: "Nvidia steigt zum wertvollsten Unternehmen auf", source: "Bloomberg", time: "gestern" },
  { title: "Google DeepMind löst mathematisches Millennium-Problem", source: "MIT Tech Review", time: "gestern" },
];

export function WidgetTechNews() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tech News</span>
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
