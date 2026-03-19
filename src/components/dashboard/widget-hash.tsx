"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { RichButton } from "@/components/ui/rich-button";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha1(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Simple MD5 substitute (using a truncated SHA-256 as demo, not real MD5)
function md5ish(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) { h = ((h << 5) - h + text.charCodeAt(i)) | 0; }
  return Math.abs(h).toString(16).padStart(8, "0").repeat(4).slice(0, 32);
}

export function WidgetHash() {
  const [input, setInput] = useState("Nexaro");
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const compute = async () => {
    const [sha256h, sha1h] = await Promise.all([sha256(input), sha1(input)]);
    setHashes({ "MD5*": md5ish(input), "SHA-1": sha1h, "SHA-256": sha256h });
  };

  const copy = (key: string, val: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hash Generator</span>
      <div className="flex gap-1.5 shrink-0">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && compute()}
          placeholder="Text eingeben..." className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <RichButton onClick={() => void compute()} size="sm" color="purple">Berechnen</RichButton>
      </div>
      <p className="text-[9px] text-muted-foreground">* MD5 ist ein vereinfachter Hash für Demozwecke</p>
      <div className="flex-1 flex flex-col gap-2">
        {Object.entries(hashes).map(([algo, hash]) => (
          <div key={algo}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground">{algo}</span>
              <button onClick={() => copy(algo, hash)} className="text-muted-foreground hover:text-foreground transition-colors">
                {copied === algo ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="text-[10px] font-mono text-foreground bg-muted/30 rounded-lg px-2 py-1 break-all border border-border/50">{hash}</div>
          </div>
        ))}
        {Object.keys(hashes).length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">Text eingeben und „Berechnen" klicken</p>
        )}
      </div>
    </div>
  );
}
