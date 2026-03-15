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
            // Sign out after successful purge
            await auth.signOut();
            window.location.href = "/login";
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setPurgeError(msg);
            setIsPurging(false);
        }
    };

    return (
        <section className="space-y-6 scroll-mt-28">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Datenlöschung</h2>
                <p className="text-sm text-slate-500">Lösche alle deine gespeicherten Daten gemäß DSGVO Art. 17.</p>
            </div>

            <div className="p-6 rounded-2xl border border-red-200 bg-red-50 shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-sm text-red-900">Alle Daten löschen</h3>
                        <p className="text-sm text-red-700 mt-1">
                            Löscht dauerhaft alle in Nexaro gespeicherten Daten: OAuth-Tokens, Synchronisierungsstatus,
                            Hintergrundjobs, Protokolle und Einstellungen. Diese Aktion ist nicht rückgängig zu machen.
                        </p>
                    </div>
                </div>

                {!showConfirm ? (
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 hover:bg-red-100 rounded-xl text-sm font-medium transition-all duration-200"
                    >
                        <Trash2 className="w-4 h-4" />
                        Meine Daten löschen
                    </button>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-red-900">
                            Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handlePurge}
                                disabled={isPurging}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 rounded-xl text-sm font-medium transition-all duration-200"
                            >
                                <Trash2 className="w-4 h-4" />
                                {isPurging ? "Lösche..." : "Endgültig löschen"}
                            </button>
                            <button
                                onClick={() => { setShowConfirm(false); setPurgeError(null); }}
                                disabled={isPurging}
                                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-medium transition-all duration-200"
                            >
                                Abbrechen
                            </button>
                        </div>
                        {purgeError && (
                            <p className="text-sm text-red-600">Fehler: {purgeError}</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
