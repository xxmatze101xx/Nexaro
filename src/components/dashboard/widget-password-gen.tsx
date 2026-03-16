"use client";

import { useState } from "react";
import { Copy, RefreshCw, Check } from "lucide-react";

const CHARS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

function generate(length: number, opts: Record<string, boolean>): string {
  let pool = "";
  if (opts.lower) pool += CHARS.lower;
  if (opts.upper) pool += CHARS.upper;
  if (opts.numbers) pool += CHARS.numbers;
  if (opts.symbols) pool += CHARS.symbols;
  if (!pool) return "";
  return Array.from({ length }, () => pool[Math.floor(Math.random() * pool.length)]).join("");
}

export function WidgetPasswordGen() {
  const [length, setLength] = useState(16);
  const [opts, setOpts] = useState({ lower: true, upper: true, numbers: true, symbols: true });
  const [password, setPassword] = useState(() => generate(16, { lower: true, upper: true, numbers: true, symbols: true }));
  const [copied, setCopied] = useState(false);

  const regen = () => setPassword(generate(length, opts));

  const copy = () => {
    navigator.clipboard.writeText(password).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleOpt = (key: string) => {
    const next = { ...opts, [key]: !opts[key as keyof typeof opts] };
    setOpts(next);
    setPassword(generate(length, next));
  };

  const strength = Object.values(opts).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passwort-Generator</span>
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/50">
        <span className="flex-1 text-sm font-mono text-foreground break-all leading-snug">{password || "—"}</span>
        <div className="flex gap-1 shrink-0">
          <button onClick={regen} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={copy} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">Länge: {length}</span>
          <span className="text-[10px] text-muted-foreground">Stärke: {"●".repeat(strength)}{"○".repeat(4 - strength)}</span>
        </div>
        <input type="range" min={8} max={64} value={length} onChange={(e) => { setLength(Number(e.target.value)); regen(); }}
          className="w-full accent-primary" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries({ lower: "a–z", upper: "A–Z", numbers: "0–9", symbols: "!@#" }).map(([key, label]) => (
          <button key={key} onClick={() => toggleOpt(key)}
            className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${opts[key as keyof typeof opts] ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
