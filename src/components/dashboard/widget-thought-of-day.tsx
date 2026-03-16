"use client";

import { Brain } from "lucide-react";

function getDayIndex() {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
}

const THOUGHTS = [
  { thought: "Was würde ich heute anders machen, wenn ich wüsste, dass niemand es beurteilt?", category: "Reflexion" },
  { thought: "Welche Entscheidung, die ich hinauszögere, würde am meisten Energie freisetzen?", category: "Entscheidung" },
  { thought: "Wer in meinem Team hat diese Woche besondere Anerkennung verdient?", category: "Führung" },
  { thought: "Welches Problem lösen wir für unsere Kunden wirklich – und welches Problem glauben wir zu lösen?", category: "Strategie" },
  { thought: "Was würde ein mutiger Schritt sein, den ich normalerweise vermeiden würde?", category: "Mut" },
  { thought: "In welchem Bereich investiere ich Zeit, obwohl er kaum Wirkung hat?", category: "Priorität" },
  { thought: "Was würde sich verändern, wenn ich heute so führe, als wäre es mein letzter Tag als CEO?", category: "Perspektive" },
];

export function WidgetThoughtOfDay() {
  const item = THOUGHTS[getDayIndex() % THOUGHTS.length];
  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <div className="flex items-center gap-1.5">
        <Brain className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gedanke des Tages</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed italic">&ldquo;{item.thought}&rdquo;</p>
      <span className="text-[10px] font-medium text-primary">{item.category}</span>
    </div>
  );
}
