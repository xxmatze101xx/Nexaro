"use client";

import { useState, useEffect } from "react";

const ZONES = [
  { city: "Berlin",   tz: "Europe/Berlin" },
  { city: "New York", tz: "America/New_York" },
  { city: "Tokyo",    tz: "Asia/Tokyo" },
  { city: "London",   tz: "Europe/London" },
  { city: "Dubai",    tz: "Asia/Dubai" },
  { city: "Sydney",   tz: "Australia/Sydney" },
];

export function WidgetWorldClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weltzeituhr</span>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {ZONES.map(({ city, tz }) => {
          const time = now
            ? now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: tz })
            : "--:--";
          const isNight = now
            ? parseInt(now.toLocaleTimeString("en-US", { hour: "numeric", hour12: false, timeZone: tz })) < 6 ||
              parseInt(now.toLocaleTimeString("en-US", { hour: "numeric", hour12: false, timeZone: tz })) >= 22
            : false;
          return (
            <div key={tz} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/50">
              <span className="text-xs text-muted-foreground">{city}</span>
              <span className={`text-sm font-bold tabular-nums ${isNight ? "text-muted-foreground" : "text-foreground"}`}>
                {time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
