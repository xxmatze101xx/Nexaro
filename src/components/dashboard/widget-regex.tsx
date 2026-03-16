"use client";

import { useState } from "react";

export function WidgetRegex() {
  const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("Kontakt: ceo@nexaro.io oder support@nexaro.io");
  const [error, setError] = useState<string | null>(null);

  let matches: string[] = [];
  let highlighted = text;

  try {
    const rx = new RegExp(pattern, flags);
    matches = [...text.matchAll(new RegExp(pattern, "g"))].map((m) => m[0]);
    highlighted = text.replace(rx, (m) => `<mark>${m}</mark>`);
    if (error) setError(null);
  } catch (e) {
    setError((e as Error).message);
    if (!error) setError((e as Error).message);
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Regex Tester</span>
      <div className="flex gap-1.5">
        <div className="flex items-center flex-1 bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
          <span className="text-muted-foreground text-sm px-2">/</span>
          <input value={pattern} onChange={(e) => setPattern(e.target.value)}
            className="flex-1 text-xs font-mono text-foreground bg-transparent focus:outline-none py-1.5" />
          <span className="text-muted-foreground text-sm px-1">/</span>
          <input value={flags} onChange={(e) => setFlags(e.target.value)} className="w-8 text-xs font-mono text-primary bg-transparent focus:outline-none py-1.5" />
        </div>
      </div>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Testtext..."
        className="flex-1 resize-none text-xs text-foreground bg-muted/30 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-primary/50 border border-border/50" />
      <div className="p-2 rounded-xl bg-muted/20 border border-border/50">
        <p className="text-[10px] font-semibold text-muted-foreground mb-1">{matches.length} Treffer:</p>
        {matches.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {matches.slice(0, 8).map((m, i) => (
              <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">{m}</span>
            ))}
          </div>
        ) : <span className="text-[10px] text-muted-foreground">Keine Treffer</span>}
      </div>
      <div className="text-xs text-foreground p-2 rounded-xl bg-muted/20 border border-border/50"
        dangerouslySetInnerHTML={{ __html: highlighted.replace(/<mark>/g, '<mark class="bg-amber-200 dark:bg-amber-800 rounded px-0.5">') }} />
    </div>
  );
}
