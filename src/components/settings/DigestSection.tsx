"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Mail, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface DigestSettings {
    daily: boolean;
    weekly: boolean;
    time: string;
    email: string;
}

interface DigestSectionProps {
    uid: string | undefined;
    userEmail: string;
}

const TIME_OPTIONS = ["06:00", "07:00", "08:00", "09:00"];

export function DigestSection({ uid, userEmail }: DigestSectionProps) {
    const [settings, setSettings] = useState<DigestSettings>({
        daily: false,
        weekly: false,
        time: "08:00",
        email: userEmail,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!uid) return;
        getDoc(doc(db, "users", uid, "settings", "digest")).then(snap => {
            if (snap.exists()) {
                setSettings(snap.data() as DigestSettings);
            } else {
                setSettings(prev => ({ ...prev, email: userEmail }));
            }
        }).catch(() => {/* ignore */});
    }, [uid, userEmail]);

    const handleSave = async () => {
        if (!uid) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, "users", uid, "settings", "digest"), settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error("Failed to save digest settings", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section id="Zusammenfassungen" className="scroll-mt-28">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Mail className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Zusammenfassungen</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Erhalte regelmäßige E-Mail-Zusammenfassungen deiner wichtigsten Nachrichten.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                {/* Daily toggle */}
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Tägliche Zusammenfassung</p>
                        <p className="text-xs text-slate-500 mt-0.5">Top-10 wichtigste Nachrichten der letzten 24 Stunden</p>
                    </div>
                    <button
                        role="switch"
                        aria-checked={settings.daily}
                        onClick={() => setSettings(prev => ({ ...prev, daily: !prev.daily }))}
                        className={cn(
                            "relative w-11 h-6 rounded-full transition-colors shrink-0",
                            settings.daily ? "bg-blue-600" : "bg-slate-200"
                        )}
                    >
                        <span className={cn(
                            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                            settings.daily ? "translate-x-5" : "translate-x-0"
                        )} />
                    </button>
                </label>

                {/* Weekly toggle */}
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Wöchentliche Zusammenfassung</p>
                        <p className="text-xs text-slate-500 mt-0.5">Jeden Montag — Übersicht der Vorwoche</p>
                    </div>
                    <button
                        role="switch"
                        aria-checked={settings.weekly}
                        onClick={() => setSettings(prev => ({ ...prev, weekly: !prev.weekly }))}
                        className={cn(
                            "relative w-11 h-6 rounded-full transition-colors shrink-0",
                            settings.weekly ? "bg-blue-600" : "bg-slate-200"
                        )}
                    >
                        <span className={cn(
                            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                            settings.weekly ? "translate-x-5" : "translate-x-0"
                        )} />
                    </button>
                </label>

                {/* Time picker */}
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 mb-1">Versandzeitpunkt</p>
                        <select
                            value={settings.time}
                            onChange={e => setSettings(prev => ({ ...prev, time: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                            {TIME_OPTIONS.map(t => (
                                <option key={t} value={t}>{t} Uhr</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 mb-1">Empfänger-E-Mail</p>
                        <input
                            type="email"
                            value={settings.email}
                            onChange={e => setSettings(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>
                </div>

                {/* Save */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                            "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                        )}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {isSaving ? "Speichern..." : "Einstellungen speichern"}
                    </button>
                    {saved && <span className="text-sm text-emerald-600 font-medium">✓ Gespeichert</span>}
                    <span className="text-xs text-slate-400 ml-auto">
                        Manuelle Auslösung: <code className="bg-slate-100 px-1 rounded">/api/digest</code>
                    </span>
                </div>
            </div>
        </section>
    );
}
