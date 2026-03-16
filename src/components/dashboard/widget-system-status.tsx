"use client";

import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICES = [
  { name: "Nexaro App", status: "operational" as const },
  { name: "Gmail API", status: "operational" as const },
  { name: "Slack API", status: "operational" as const },
  { name: "Microsoft Graph", status: "degraded" as const },
  { name: "Firebase", status: "operational" as const },
  { name: "AI Pipeline", status: "operational" as const },
  { name: "Kalender-Sync", status: "incident" as const },
  { name: "Benachrichtigungen", status: "operational" as const },
];

const STATUS_META = {
  operational: { icon: CheckCircle, label: "Aktiv", color: "text-emerald-500" },
  degraded: { icon: AlertCircle, label: "Eingeschränkt", color: "text-amber-500" },
  incident: { icon: XCircle, label: "Ausfall", color: "text-red-500" },
};

export function WidgetSystemStatus() {
  const issues = SERVICES.filter((s) => s.status !== "operational").length;
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System-Status</span>
        <span className={cn("text-[10px] font-bold", issues === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
          {issues === 0 ? "Alle Systeme aktiv" : `${issues} Problem${issues > 1 ? "e" : ""}`}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5 content-start">
        {SERVICES.map((s) => {
          const meta = STATUS_META[s.status];
          const Icon = meta.icon;
          return (
            <div key={s.name} className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30">
              <Icon className={cn("w-3.5 h-3.5 shrink-0", meta.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-foreground truncate">{s.name}</p>
                <p className={cn("text-[9px]", meta.color)}>{meta.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
