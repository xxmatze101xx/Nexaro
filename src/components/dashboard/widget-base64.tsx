"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function WidgetBase64() {
  const [input, setInput] = useState("Nexaro Dashboard");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [copied, setCopied] = useState(false);

  let output = "";
  let err = "";
  try {
    if (mode === "encode") {
      output = btoa(unescape(encodeURIComponent(input)));
    } else {
      output = decodeURIComponent(escape(atob(input)));
    }
  } catch {
    err = "Ungültige Eingabe";
  }

  const copy = () => {
    navigator.clipboard.writeText(output).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base64 Encoder</span>
      <div className="flex gap-1.5">
        {(["encode", "decode"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {m === "encode" ? "Kodieren" : "Dekodieren"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <label className="text-[10px] text-muted-foreground">Eingabe:</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          className="text-xs font-mono text-foreground bg-muted/30 rounded-xl p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 border border-border/50 h-16" />
      </div>
      <div className="flex flex-col gap-1 flex-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-muted-foreground">Ergebnis:</label>
          {output && !err && (
            <button onClick={copy} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
        <div className={`flex-1 text-xs font-mono p-2 rounded-xl border overflow-auto ${err ? "text-destructive bg-destructive/10 border-destructive/20" : "text-foreground bg-primary/5 border-primary/20"}`}>
          {err || output || "—"}
        </div>
      </div>
    </div>
  );
}
