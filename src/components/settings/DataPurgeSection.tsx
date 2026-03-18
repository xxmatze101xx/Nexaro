"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/firebase";

interface DataPurgeSectionProps {
    user: { uid: string; getIdToken: () => Promise<string> } | null;
}

export function DataPurgeSection({ user }: DataPurgeSectionProps) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [purgeError, setPurgeError] = useState<string | null>(null);

    const handlePurge = async () => {
        if (!user) return;
        setIsPurging(true);
        setPurgeError(null);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch("/api/user/purge", {
                method: "POST",
                headers: { Authorization: `Bearer ${idToken}` },
            });
            if (!res.ok) {
                const data = (await res.json()) as { error?: string };
                throw new Error(data.error ?? "Unbekannter Fehler");
            }
            await auth.signOut();
            window.location.href = "/login";
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setPurgeError(msg);
            setIsPurging(false);
        }
    };

    return (
        <section className="space-y-4 scroll-mt-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Datenlöschung</p>

            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-foreground">Alle Daten löschen</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Löscht dauerhaft alle OAuth-Tokens, Einstellungen und Protokolle. Nicht rückgängig machbar.
                        </p>
                    </div>
                </div>

                {!showConfirm ? (
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="flex items-center gap-2 px-3 py-1.5 border border-destructive/40 text-destructive hover:bg-destructive/10 rounded-lg text-xs font-medium transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Meine Daten löschen
                    </button>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground">Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePurge}
                                disabled={isPurging}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60 rounded-lg text-xs font-medium transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {isPurging ? "Lösche..." : "Endgültig löschen"}
                            </button>
                            <button
                                onClick={() => { setShowConfirm(false); setPurgeError(null); }}
                                disabled={isPurging}
                                className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted rounded-lg text-xs font-medium transition-colors"
                            >
                                Abbrechen
                            </button>
                        </div>
                        {purgeError && (
                            <p className="text-xs text-destructive">Fehler: {purgeError}</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
