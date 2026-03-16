"use client";

import { useState } from "react";
import { Copy, Check, AlertCircle } from "lucide-react";

export function WidgetJsonFormat() {
  const [input, setInput] = useState('{"name":"Nexaro","version":"2.0","active":true}');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  let formatted = "";
  try {
    formatted = JSON.stringify(JSON.parse(input), null, 2);
    if (error) setError(null);
  } catch (e) {
    if (!error) setError((e as Error).message);
  }

  const copy = () => {
    navigator.clipboard.writeText(formatted).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">JSON Formatter</span>
        {formatted && !error && (
          <button onClick={copy} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
        )}
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder='{"key": "value"}'
        className="flex-1 resize-none text-xs font-mono text-foreground placeholder:text-muted-foreground bg-muted/30 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-primary/50 border border-border/50" />
      {error ? (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
          <span className="text-[10px] text-destructive">{error}</span>
        </div>
      ) : (
        <pre className="flex-1 text-[10px] font-mono text-foreground bg-muted/20 rounded-xl p-2 overflow-auto border border-border/50">{formatted}</pre>
      )}
    </div>
  );
}
