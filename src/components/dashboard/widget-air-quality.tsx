"use client";

import { cn } from "@/lib/utils";

const AQI = 42;
const POLLUTANTS = [
  { name: "PM2.5", value: 12, unit: "µg/m³", max: 25 },
  { name: "PM10", value: 28, unit: "µg/m³", max: 50 },
  { name: "NO₂", value: 35, unit: "µg/m³", max: 40 },
  { name: "O₃", value: 18, unit: "µg/m³", max: 120 },
];

function getAqiLabel(aqi: number) {
  if (aqi <= 50) return { label: "Gut", color: "text-emerald-500", bg: "bg-emerald-500/10" };
  if (aqi <= 100) return { label: "Mäßig", color: "text-amber-500", bg: "bg-amber-500/10" };
  return { label: "Ungesund", color: "text-red-500", bg: "bg-red-500/10" };
}

export function WidgetAirQuality() {
  const { label, color, bg } = getAqiLabel(AQI);
  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Luftqualität · München</span>
      <div className={cn("flex items-center justify-between p-3 rounded-xl", bg)}>
        <div>
          <p className="text-3xl font-bold text-foreground">{AQI}</p>
          <p className="text-[10px] text-muted-foreground">AQI</p>
        </div>
        <span className={cn("text-lg font-bold", color)}>{label}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {POLLUTANTS.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10">{p.name}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${(p.value / p.max) * 100}%` }} />
            </div>
            <span className="text-[10px] text-foreground tabular-nums w-16 text-right">{p.value} {p.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
