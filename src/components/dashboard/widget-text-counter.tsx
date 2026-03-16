"use client";

import { useState } from "react";

export function WidgetTextCounter() {
  const [text, setText] = useState("");

  const chars = text.length;
  const noSpaces = text.replace(/\s/g, "").length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sentences = text.trim() ? (text.match(/[.!?]+/g) ?? []).length : 0;
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(Boolean).length : 0;
  const readingMins = Math.ceil(words / 200);

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Textanalyse</span>
      <textarea value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Text hier eingeben..."
        className="flex-1 resize-none text-xs text-foreground placeholder:text-muted-foreground bg-muted/30 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-primary/50 border border-border/50" />
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Zeichen", value: chars },
          { label: "Ohne Leerz.", value: noSpaces },
          { label: "Wörter", value: words },
          { label: "Sätze", value: sentences },
          { label: "Absätze", value: paragraphs },
          { label: "Lesezeit", value: `${readingMins} Min` },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center p-1.5 rounded-lg bg-muted/50">
            <span className="text-sm font-bold text-foreground tabular-nums">{value}</span>
            <span className="text-[9px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
