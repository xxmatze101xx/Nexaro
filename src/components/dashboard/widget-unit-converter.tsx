"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";

type Category = "length" | "weight" | "temp" | "area";

const UNITS: Record<Category, { label: string; units: { name: string; toBase: (v: number) => number; fromBase: (v: number) => number }[] }> = {
  length: {
    label: "Länge",
    units: [
      { name: "Meter", toBase: (v) => v, fromBase: (v) => v },
      { name: "Kilometer", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { name: "Zoll", toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { name: "Fuß", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { name: "Meile", toBase: (v) => v * 1609.34, fromBase: (v) => v / 1609.34 },
    ],
  },
  weight: {
    label: "Gewicht",
    units: [
      { name: "Kilogramm", toBase: (v) => v, fromBase: (v) => v },
      { name: "Gramm", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { name: "Pfund", toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
      { name: "Unze", toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 },
      { name: "Tonne", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    ],
  },
  temp: {
    label: "Temperatur",
    units: [
      { name: "Celsius", toBase: (v) => v, fromBase: (v) => v },
      { name: "Fahrenheit", toBase: (v) => (v - 32) * 5/9, fromBase: (v) => v * 9/5 + 32 },
      { name: "Kelvin", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  area: {
    label: "Fläche",
    units: [
      { name: "m²", toBase: (v) => v, fromBase: (v) => v },
      { name: "km²", toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
      { name: "Hektar", toBase: (v) => v * 10000, fromBase: (v) => v / 10000 },
      { name: "Quadratfuß", toBase: (v) => v * 0.0929, fromBase: (v) => v / 0.0929 },
    ],
  },
};

export function WidgetUnitConverter() {
  const [cat, setCat] = useState<Category>("length");
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(1);
  const [input, setInput] = useState("1");

  const cats = UNITS[cat];
  const fromUnit = cats.units[fromIdx];
  const toUnit = cats.units[toIdx];
  const result = toUnit.fromBase(fromUnit.toBase(parseFloat(input) || 0));

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Einheitenrechner</span>
      <div className="flex gap-1">
        {(Object.keys(UNITS) as Category[]).map((c) => (
          <button key={c} onClick={() => { setCat(c); setFromIdx(0); setToIdx(1); }}
            className={`flex-1 text-[10px] py-1 rounded-lg transition-colors ${cat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {UNITS[c].label}
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="flex flex-col gap-1">
          <select value={fromIdx} onChange={(e) => setFromIdx(Number(e.target.value))}
            className="text-xs bg-muted rounded-lg px-2 py-1.5 text-foreground border border-border/50">
            {cats.units.map((u, i) => <option key={i} value={i}>{u.name}</option>)}
          </select>
          <input type="number" value={input} onChange={(e) => setInput(e.target.value)}
            className="text-lg font-bold px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 tabular-nums" />
        </div>
        <div className="flex justify-center">
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <select value={toIdx} onChange={(e) => setToIdx(Number(e.target.value))}
            className="text-xs bg-muted rounded-lg px-2 py-1.5 text-foreground border border-border/50">
            {cats.units.map((u, i) => <option key={i} value={i}>{u.name}</option>)}
          </select>
          <div className="text-lg font-bold px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 text-primary tabular-nums">
            {Number.isFinite(result) ? parseFloat(result.toPrecision(6)).toString() : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
