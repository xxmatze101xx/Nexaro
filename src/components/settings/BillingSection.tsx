"use client";

import { CreditCard, Sparkles, Zap } from "lucide-react";

export function BillingSection() {
    return (
        <section id="Abonnement" className="space-y-4 scroll-mt-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Abonnement</p>

            {/* Plan card */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                            <Sparkles className="w-3 h-3" />
                            Aktueller Plan
                        </div>
                        <p className="text-xl font-bold text-foreground tracking-tight">Nexaro Pro</p>
                        <p className="text-xs text-muted-foreground">Monatlich · Nächste Zahlung 04. April 2026</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-foreground">$29</p>
                        <p className="text-xs text-muted-foreground">/ Monat</p>
                    </div>
                </div>

                <div className="px-4 pb-4 flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg text-xs font-medium transition-colors">
                        <Zap className="w-3.5 h-3.5" />
                        Enterprise upgraden
                    </button>
                    <button className="px-3 py-2 border border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg text-xs font-medium transition-colors">
                        Kündigen
                    </button>
                </div>

                <div className="border-t border-border px-4 py-3 grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Zahlungsmethode</p>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                            •••• 4242
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Rechnungen</p>
                        <a href="#" className="text-xs font-medium text-primary hover:underline underline-offset-2">
                            Verlauf
                        </a>
                    </div>
                    <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Kanäle</p>
                        <p className="text-xs font-medium text-foreground">6 / unbegrenzt</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
