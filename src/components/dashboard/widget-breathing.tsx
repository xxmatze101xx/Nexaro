"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type Phase = "inhale" | "hold" | "exhale" | "rest";
const CYCLE: { phase: Phase; label: string; duration: number }[] = [
  { phase: "inhale", label: "Einatmen", duration: 4 },
  { phase: "hold", label: "Halten", duration: 4 },
  { phase: "exhale", label: "Ausatmen", duration: 6 },
  { phase: "rest", label: "Pause", duration: 2 },
];

export function WidgetBreathing() {
  const [active, setActive] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [seconds, setSeconds] = useState(CYCLE[0].duration);

  useEffect(() => {
    if (!active) { setPhaseIdx(0); setSeconds(CYCLE[0].duration); return; }
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setPhaseIdx((p) => {
            const next = (p + 1) % CYCLE.length;
            setSeconds(CYCLE[next].duration);
            return next;
          });
          return 0;
        }
        return s - 1;
      });
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  const phase = CYCLE[phaseIdx];
  void tick;
  const scale = phase.phase === "inhale" ? 1.3 : phase.phase === "exhale" ? 0.7 : 1;

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">4-4-6-2 Atemtechnik</span>
      <div className="relative flex items-center justify-center w-24 h-24">
        <div className={cn("absolute w-20 h-20 rounded-full bg-cyan-500/20 transition-transform duration-1000")}
          style={{ transform: `scale(${active ? scale : 1})` }} />
        <div className="absolute w-14 h-14 rounded-full bg-cyan-500/30 flex items-center justify-center">
          <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">{seconds}</span>
        </div>
      </div>
      {active && <p className="text-sm font-medium text-foreground">{phase.label}</p>}
      <button onClick={() => setActive((v) => !v)}
        className={cn("px-5 py-2 rounded-lg text-sm font-medium transition-colors",
          active ? "bg-muted text-muted-foreground hover:text-foreground" : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20")}>
        {active ? "Stoppen" : "Starten"}
      </button>
    </div>
  );
}
