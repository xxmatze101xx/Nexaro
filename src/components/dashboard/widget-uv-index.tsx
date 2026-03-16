"use client";

import { Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const UV = 3;

function getUvMeta(uv: number) {
  if (uv <= 2) return { label: "Niedrig", color: "text-emerald-500", tip: "Kein Schutz nötig" };
  if (uv <= 5) return { label: "Mäßig", color: "text-amber-500", tip: "Sonnenschutz empfohlen" };
  if (uv <= 7) return { label: "Hoch", color: "text-orange-500", tip: "Schutz erforderlich" };
  if (uv <= 10) return { label: "Sehr hoch", color: "text-red-500", tip: "Extra Schutz nötig" };
  return { label: "Extrem", color: "text-purple-500", tip: "Aufenthalt meiden" };
}

export function WidgetUvIndex() {
  const meta = getUvMeta(UV);
  return (
    <div className="flex flex-col justify-center items-center gap-3 h-full">
      <Sun className={cn("w-10 h-10", meta.color)} />
      <div className="text-center">
        <p className="text-4xl font-bold text-foreground">{UV}</p>
        <p className={cn("text-sm font-semibold mt-0.5", meta.color)}>{meta.label}</p>
      </div>
      <p className="text-xs text-muted-foreground text-center">{meta.tip}</p>
      <div className="w-full h-2 rounded-full overflow-hidden bg-gradient-to-r from-emerald-400 via-amber-400 via-orange-400 to-red-500 to-purple-500">
        <div className="h-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full shadow-md" style={{ marginLeft: `${(UV / 11) * 100}%`, transform: "translateX(-50%)" }} />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">UV-Index: 0 (Niedrig) → 11+ (Extrem)</p>
    </div>
  );
}
