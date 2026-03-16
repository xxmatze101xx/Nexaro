"use client";

import { useState, useEffect } from "react";

export function WidgetClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const time = now.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = now.toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col justify-center h-full gap-2">
      <p className="text-5xl font-bold tabular-nums tracking-tight text-foreground leading-none">
        {time}
      </p>
      <p className="text-sm text-muted-foreground capitalize">{date}</p>
    </div>
  );
}
