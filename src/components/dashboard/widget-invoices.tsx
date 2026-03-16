"use client";

import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const INVOICES = [
  { id: "INV-2024", client: "TechCorp GmbH", amount: 12400, status: "overdue", due: "10.03." },
  { id: "INV-2025", client: "StartupHub AG", amount: 4800, status: "pending", due: "22.03." },
  { id: "INV-2026", client: "InnovateCo", amount: 8900, status: "pending", due: "28.03." },
  { id: "INV-2023", client: "GlobalTech", amount: 15600, status: "paid", due: "01.03." },
  { id: "INV-2022", client: "VentureXYZ", amount: 6200, status: "paid", due: "28.02." },
];

const STATUS = {
  overdue: { icon: AlertCircle, label: "Überfällig", color: "text-red-500", bg: "bg-red-500/10" },
  pending: { icon: Clock, label: "Ausstehend", color: "text-amber-500", bg: "bg-amber-500/10" },
  paid: { icon: CheckCircle, label: "Bezahlt", color: "text-emerald-500", bg: "bg-emerald-500/10" },
};

export function WidgetInvoices() {
  const outstanding = INVOICES.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rechnungen</span>
        <span className="text-sm font-bold text-foreground">€{outstanding.toLocaleString("de-DE")} offen</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {INVOICES.map((inv) => {
          const s = STATUS[inv.status as keyof typeof STATUS];
          const Icon = s.icon;
          return (
            <div key={inv.id} className={cn("flex items-center gap-2 p-2 rounded-lg", s.bg)}>
              <Icon className={cn("w-4 h-4 shrink-0", s.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{inv.client}</p>
                <p className="text-[10px] text-muted-foreground">{inv.id} · Fällig: {inv.due}</p>
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">€{inv.amount.toLocaleString("de-DE")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
