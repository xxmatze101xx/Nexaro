"use client";

import { useState, useEffect } from "react";
import { Coffee, Bell } from "lucide-react";

export function WidgetBreakReminder() {
  const [lastBreak, setLastBreak] = useState<Date | null>(null);
  const [minutesSince, setMinutesSince] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem("nexaro-last-break");
    if (raw) setLastBreak(new Date(raw));
    else setLastBreak(new Date());
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (lastBreak) setMinutesSince(Math.floor((Date.now() - lastBreak.getTime()) / 60000));
    }, 1000);
    return () => clearInterval(id);
  }, [lastBreak]);

  const takeBreak = () => {
    const now = new Date();
    setLastBreak(now);
    setMinutesSince(0);
    localStorage.setItem("nexaro-last-break", now.toISOString());
  };

  const needsBreak = minutesSince >= 90;

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${needsBreak ? "bg-amber-500/20 animate-pulse" : "bg-muted"}`}>
        <Coffee className={`w-7 h-7 transition-colors ${needsBreak ? "text-amber-500" : "text-muted-foreground"}`} />
      </div>
      {needsBreak ? (
        <div className="text-center">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Zeit für eine Pause!</p>
          <p className="text-xs text-muted-foreground mt-0.5">Du arbeitest seit {minutesSince} Minuten</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Nächste Pause in</p>
          <p className="text-2xl font-bold text-foreground">{Math.max(0, 90 - minutesSince)} Min</p>
        </div>
      )}
      <button onClick={takeBreak}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors text-xs font-medium">
        <Bell className="w-3 h-3" /> Pause gemacht
      </button>
    </div>
  );
}
