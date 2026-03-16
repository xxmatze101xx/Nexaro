"use client";

import { useState, useEffect } from "react";

const TARGET_DATE = new Date(new Date().getFullYear(), 11, 31); // End of year

function getTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export function WidgetCountdown() {
  const [time, setTime] = useState(getTimeLeft(TARGET_DATE));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(TARGET_DATE)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Jahresende
      </span>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Tage", value: time.days },
          { label: "Std", value: time.hours },
          { label: "Min", value: time.minutes },
          { label: "Sek", value: time.seconds },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-muted/50">
            <span className="text-xl font-bold tabular-nums text-foreground leading-none">
              {String(value).padStart(2, "0")}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        bis {TARGET_DATE.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}
