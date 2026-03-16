"use client";

import { AlertCircle, Clock } from "lucide-react";

const QUEUE = [
  { from: "Investor Group AG", subject: "Due Diligence Q2", waitingHours: 48, urgent: true },
  { from: "TechCorp GmbH", subject: "Vertragsabschluss", waitingHours: 24, urgent: true },
  { from: "Sarah Weber", subject: "Sprint Review Agenda", waitingHours: 8, urgent: false },
  { from: "Newsletter Abonnent", subject: "Feedback zu v2", waitingHours: 5, urgent: false },
  { from: "Support Team", subject: "Eskaliertes Ticket", waitingHours: 3, urgent: false },
];

export function WidgetMessageQueue() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ausstehende Antworten</span>
        <span className="text-[10px] font-bold text-destructive">{QUEUE.filter((q) => q.urgent).length} dringend</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {QUEUE.map((msg) => (
          <div key={msg.subject} className={`flex items-start gap-2 p-2 rounded-lg ${msg.urgent ? "bg-destructive/5 border border-destructive/20" : "bg-muted/30"}`}>
            {msg.urgent && <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{msg.from}</p>
              <p className="text-[10px] text-muted-foreground truncate">{msg.subject}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Clock className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">{msg.waitingHours}h</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
