"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const PALETTES = [
  ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"],
  ["#3b82f6", "#0ea5e9", "#06b6d4", "#14b8a6", "#10b981"],
  ["#f59e0b", "#f97316", "#ef4444", "#dc2626", "#b91c1c"],
  ["#64748b", "#475569", "#334155", "#1e293b", "#0f172a"],
];

export function WidgetColorPicker() {
  const [selected, setSelected] = useState("#6366f1");
  const [copied, setCopied] = useState(false);
  const [custom, setCustom] = useState("#6366f1");

  const copy = (hex: string) => {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Farbpalette</span>
      <div className="flex items-center gap-2 p-2 rounded-xl border border-border/50" style={{ background: selected + "20" }}>
        <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: selected }} />
        <div className="flex-1">
          <p className="text-sm font-mono font-bold text-foreground">{selected.toUpperCase()}</p>
          <p className="text-[10px] text-muted-foreground">{hexToRgb(selected)}</p>
        </div>
        <button onClick={() => copy(selected)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {PALETTES.map((row, i) => (
          <div key={i} className="flex gap-1.5">
            {row.map((color) => (
              <button key={color} onClick={() => { setSelected(color); setCustom(color); }}
                className={`flex-1 h-6 rounded-md transition-transform ${selected === color ? "scale-110 ring-2 ring-offset-1 ring-foreground/20" : "hover:scale-105"}`}
                style={{ background: color }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">Benutzerdefiniert:</span>
        <input type="color" value={custom} onChange={(e) => { setCustom(e.target.value); setSelected(e.target.value); }}
          className="w-8 h-6 rounded cursor-pointer border-0 p-0" />
        <span className="text-xs font-mono text-foreground">{custom.toUpperCase()}</span>
      </div>
    </div>
  );
}
