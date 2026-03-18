"use client";

export function SecuritySection() {
    return (
        <section id="Sicherheit" className="space-y-4 scroll-mt-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Sicherheit</p>

            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-3 bg-card">
                    <div>
                        <p className="text-sm font-medium text-foreground">Passwort</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Aktualisiere dein Passwort regelmäßig.</p>
                    </div>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-muted hover:bg-accent text-foreground transition-colors">
                        Ändern
                    </button>
                </div>
            </div>
        </section>
    );
}
