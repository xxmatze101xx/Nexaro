"use client";

export function SecuritySection() {
    return (
        <section id="Sicherheit" className="space-y-6 scroll-mt-28">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Sicherheit</h2>
                <p className="text-sm text-muted-foreground">Schütze deinen Account.</p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="font-medium text-sm text-foreground">Passwort ändern</h3>
                    <p className="text-sm text-muted-foreground mt-1">Aktualisiere dein Passwort, um dein Konto zu schützen.</p>
                </div>
                <button className="px-4 py-2 border border-border hover:bg-muted text-foreground rounded-xl text-sm font-medium transition-all duration-300 bg-card shadow-sm">
                    Passwort ändern
                </button>
            </div>
        </section>
    );
}
