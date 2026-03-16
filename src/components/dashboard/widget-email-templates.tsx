"use client";

import { useState } from "react";
import { Copy, Check, Mail } from "lucide-react";

const TEMPLATES = [
  { title: "Investoren-Update", preview: "Liebe [Investoren],\n\nHier das monatliche Update..." },
  { title: "Deal-Abschluss", preview: "Sehr geehrte/r [Name],\n\nWir freuen uns, Ihnen mitteilen zu können..." },
  { title: "Meeting-Request", preview: "Hallo [Name],\n\nIch würde gerne 30 Minuten mit Ihnen sprechen über..." },
  { title: "Absage höflich", preview: "Vielen Dank für Ihr Interesse. Nach sorgfältiger Überlegung..." },
  { title: "Follow-up", preview: "Guten Tag [Name],\n\nIch melde mich bezüglich unseres letzten Gesprächs..." },
];

export function WidgetEmailTemplates() {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(TEMPLATES[selected].preview).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-Mail Templates</span>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {TEMPLATES.map((t, i) => (
          <button key={i} onClick={() => setSelected(i)}
            className={`text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors ${selected === i ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
            {t.title}
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Vorschau:</span>
          <button onClick={copy} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
        </div>
        <div className="flex-1 text-xs text-foreground bg-muted/30 rounded-xl p-2.5 border border-border/50 whitespace-pre-wrap overflow-y-auto">
          {TEMPLATES[selected].preview}
        </div>
      </div>
    </div>
  );
}
