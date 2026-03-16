"use client";

import { Lightbulb } from "lucide-react";

function getDayIndex() {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
}

const FACTS = [
  "Der durchschnittliche CEO liest 60 Bücher pro Jahr — das sind 5 pro Monat.",
  "80% aller erfolgreichen Start-ups haben ihr Geschäftsmodell mindestens einmal pivotiert.",
  "Unternehmen mit diversem Management erzielen 36% höhere Gewinne.",
  "Die meisten kreativen Ideen entstehen zwischen 22 und 23 Uhr.",
  "Eine 10-minütige Meditation steigert die Konzentrationsfähigkeit um 22%.",
  "Jeff Bezos trifft bewusst keine wichtigen Entscheidungen nach 17 Uhr.",
  "Teams, die regelmäßig Dank ausdrücken, sind 50% produktiver.",
  "Der erste Absatz einer E-Mail entscheidet zu 90% über die Antwortrate.",
];

export function WidgetFunFact() {
  const fact = FACTS[getDayIndex() % FACTS.length];
  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <div className="flex items-center gap-1.5">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wusstest du?</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{fact}</p>
    </div>
  );
}
