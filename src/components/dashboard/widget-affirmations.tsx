"use client";

import { Heart } from "lucide-react";

function getDayIndex() {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
}

const AFFIRMATIONS = [
  "Ich treffe heute kluge Entscheidungen, die mein Unternehmen voranbringen.",
  "Meine Führung inspiriert andere, ihr Bestes zu geben.",
  "Herausforderungen sind Chancen, aus denen ich wachse.",
  "Ich vertraue meiner Intuition und meiner Erfahrung.",
  "Heute schaffe ich Mehrwert für Kunden, Team und Gesellschaft.",
  "Ich bin ein Gestalter der Zukunft — meine Vision wird Realität.",
  "Ich bin geerdet, fokussiert und bereit für alles, was kommt.",
];

export function WidgetAffirmations() {
  const idx = getDayIndex();
  const affirmation = AFFIRMATIONS[idx % AFFIRMATIONS.length];
  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <div className="flex items-center gap-1.5">
        <Heart className="w-4 h-4 text-pink-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tagesaffirmation</span>
      </div>
      <p className="text-base font-medium text-foreground leading-relaxed">&ldquo;{affirmation}&rdquo;</p>
    </div>
  );
}
