"use client";

import { CreditCard, Sparkles } from "lucide-react";

export function BillingSection() {
    return (
        <section id="Abonnement" className="space-y-6 scroll-mt-28">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Abonnement verwalten</h2>
                <p className="text-sm text-muted-foreground">Rechnungen, Zahlungsmethoden und Pläne.</p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-wide uppercase">
                            <Sparkles className="w-3.5 h-3.5" /> Aktueller Plan
                        </div>
                        <div>
                            <h3 className="text-3xl font-bold tracking-tight text-foreground">Nexaro Pro</h3>
                            <p className="text-muted-foreground mt-1 text-sm">Abrechnung monatlich · Nächste Zahlung am 04. April 2026</p>
                        </div>
                        <div className="text-4xl font-bold tracking-tight text-foreground">
                            $29 <span className="text-base font-normal text-muted-foreground">/ Monat</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                        <button className="w-full px-5 py-3 bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl text-sm font-medium shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Auf Enterprise upgraden
                        </button>
                        <button className="w-full px-5 py-3 bg-card border border-border hover:bg-muted text-foreground rounded-xl text-sm font-medium transition-all duration-300">
                            Abonnement kündigen
                        </button>
                    </div>
                </div>

                <div className="relative z-10 mt-8 pt-8 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Zahlungsmethode</p>
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            •••• 4242
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Rechnungen</p>
                        <a href="#" className="text-sm font-medium text-primary hover:text-primary-hover hover:underline underline-offset-4">
                            Verlauf ansehen
                        </a>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Verbundene Kanäle</p>
                        <p className="text-sm font-medium text-foreground">6 von unbegrenzt</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
