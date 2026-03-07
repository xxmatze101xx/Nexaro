"use client";

export function SecuritySection() {
    return (
        <section id="Sicherheit" className="space-y-6 scroll-mt-28">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sicherheit</h2>
                <p className="text-sm text-slate-500">Schütze deinen Account.</p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="font-medium text-sm text-slate-900">Passwort ändern</h3>
                    <p className="text-sm text-slate-500 mt-1">Aktualisiere dein Passwort, um dein Konto zu schützen.</p>
                </div>
                <button className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-all duration-300 bg-white shadow-sm">
                    Passwort ändern
                </button>
            </div>
        </section>
    );
}
