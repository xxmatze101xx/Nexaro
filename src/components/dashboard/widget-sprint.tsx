"use client";

const SPRINT_DATA = {
  name: "Sprint 24 — Woche 2/3",
  columns: [
    { title: "Todo", items: ["Auth-Bug fixen", "API Docs", "Onboarding Flow"] },
    { title: "In Arbeit", items: ["Dashboard Widgets", "E-Mail Templates", "Billing Page"] },
    { title: "Erledigt", items: ["CI/CD Setup", "DB Migration", "Design System", "Login Page", "API Rate Limiting"] },
  ],
};

const COL_COLORS = ["bg-muted/50", "bg-amber-500/10", "bg-emerald-500/10"];
const TITLE_COLORS = ["text-muted-foreground", "text-amber-600 dark:text-amber-400", "text-emerald-600 dark:text-emerald-400"];

export function WidgetSprint() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sprint Board</span>
        <span className="text-[10px] text-muted-foreground">{SPRINT_DATA.name}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 flex-1 overflow-hidden">
        {SPRINT_DATA.columns.map((col, ci) => (
          <div key={col.title} className={`flex flex-col gap-1.5 rounded-xl p-2 ${COL_COLORS[ci]}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${TITLE_COLORS[ci]}`}>{col.title}</span>
              <span className={`text-[10px] font-bold ${TITLE_COLORS[ci]}`}>{col.items.length}</span>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto">
              {col.items.map((item) => (
                <div key={item} className="text-[10px] text-foreground bg-card rounded-lg px-2 py-1 border border-border/50 leading-snug">{item}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
