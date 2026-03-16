"use client";

const MOCK_EVENTS: Record<number, string[]> = {
  0: ["09:00 Team Standup", "14:00 Investoren-Call"],
  1: ["10:00 Design Review", "16:00 1:1 mit CTO"],
  2: ["11:00 Product Demo"],
  3: ["09:30 Board Meeting", "15:00 Interview"],
  4: ["10:00 Sprint Review", "12:00 Mittagessen Kunde"],
  5: [],
  6: [],
};

export function WidgetWeekPlanner() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wochenplaner</span>
      <div className="grid grid-cols-7 gap-1.5 flex-1">
        {days.map((day, i) => {
          const isToday = day.toDateString() === today.toDateString();
          const events = MOCK_EVENTS[i] ?? [];
          return (
            <div key={i} className={`flex flex-col gap-1 p-1.5 rounded-xl ${isToday ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/30"}`}>
              <div className="text-center">
                <p className={`text-[9px] font-semibold uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}>{LABELS[i]}</p>
                <p className={`text-sm font-bold leading-none ${isToday ? "text-primary" : "text-foreground"}`}>{day.getDate()}</p>
              </div>
              <div className="flex flex-col gap-0.5">
                {events.slice(0, 2).map((e, j) => (
                  <div key={j} className="text-[8px] leading-tight text-muted-foreground bg-primary/10 rounded px-1 py-0.5 truncate">{e}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
