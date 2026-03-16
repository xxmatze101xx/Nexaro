"use client";

const FORECAST = [
  { day: "Mo", icon: "🌤", high: 14, low: 8 },
  { day: "Di", icon: "🌧", high: 10, low: 6 },
  { day: "Mi", icon: "🌦", high: 11, low: 7 },
  { day: "Do", icon: "☀️", high: 17, low: 9 },
  { day: "Fr", icon: "⛅", high: 15, low: 10 },
];

export function WidgetWeatherForecast() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">5-Tage Vorhersage · München</span>
      <div className="flex-1 flex gap-2">
        {FORECAST.map((day) => (
          <div key={day.day} className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-muted/50">
            <span className="text-xs font-semibold text-muted-foreground">{day.day}</span>
            <span className="text-2xl">{day.icon}</span>
            <div className="text-center">
              <p className="text-xs font-bold text-foreground">{day.high}°</p>
              <p className="text-[10px] text-muted-foreground">{day.low}°</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
