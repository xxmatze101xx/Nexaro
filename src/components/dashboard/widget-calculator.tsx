"use client";

import { useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const BUTTONS = [
  ["C", "±", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "⌫", "="],
];

export function WidgetCalculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<string | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const handleButton = (btn: string) => {
    if (btn === "C") { setDisplay("0"); setPrev(null); setOp(null); setFresh(true); return; }
    if (btn === "⌫") { setDisplay((d) => d.length > 1 ? d.slice(0, -1) : "0"); return; }
    if (btn === "±") { setDisplay((d) => String(-parseFloat(d))); return; }
    if (btn === "%") { setDisplay((d) => String(parseFloat(d) / 100)); return; }
    if (["÷", "×", "−", "+"].includes(btn)) {
      setPrev(display); setOp(btn); setFresh(true); return;
    }
    if (btn === "=") {
      if (!prev || !op) return;
      const a = parseFloat(prev), b = parseFloat(display);
      const res = op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b;
      setDisplay(String(parseFloat(res.toPrecision(10))));
      setPrev(null); setOp(null); setFresh(true); return;
    }
    if (btn === ".") {
      setDisplay((d) => fresh ? "0." : d.includes(".") ? d : d + ".");
      setFresh(false); return;
    }
    setDisplay((d) => fresh ? btn : d === "0" ? btn : d + btn);
    setFresh(false);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="bg-muted/50 rounded-xl px-3 py-2 text-right">
        {op && <span className="text-[10px] text-muted-foreground mr-1">{prev} {op}</span>}
        <span className="text-xl font-bold tabular-nums text-foreground truncate">{display}</span>
      </div>
      <div className="flex-1 grid grid-rows-5 gap-1">
        {BUTTONS.map((row, ri) => (
          <div key={ri} className="grid grid-cols-4 gap-1">
            {row.map((btn) => (
              <button key={btn} onClick={() => handleButton(btn)}
                className={cn("rounded-lg text-sm font-semibold transition-colors flex items-center justify-center",
                  ["÷", "×", "−", "+", "="].includes(btn) ? "bg-primary text-primary-foreground hover:opacity-80" :
                  ["C", "±", "%"].includes(btn) ? "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80" :
                  "bg-muted/50 text-foreground hover:bg-muted/80")}>
                {btn === "⌫" ? <Delete className="w-3.5 h-3.5" /> : btn}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
