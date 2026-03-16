"use client";

import { Cloud, Wind, Droplets, Thermometer } from "lucide-react";

export function WidgetWeatherCurrent() {
  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wetter · München</span>
        <Cloud className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex items-end gap-3">
        <span className="text-5xl font-bold text-foreground leading-none">12°</span>
        <div className="mb-1">
          <p className="text-sm font-medium text-foreground">Bewölkt</p>
          <p className="text-[10px] text-muted-foreground">Gefühlt: 9°C</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-muted/50">
          <Droplets className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-medium text-foreground">68%</span>
          <span className="text-[9px] text-muted-foreground">Luftfeuchte</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-muted/50">
          <Wind className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">15 km/h</span>
          <span className="text-[9px] text-muted-foreground">Wind</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-muted/50">
          <Thermometer className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-medium text-foreground">8° / 14°</span>
          <span className="text-[9px] text-muted-foreground">Min/Max</span>
        </div>
      </div>
    </div>
  );
}
