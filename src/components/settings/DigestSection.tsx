"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
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
        <section id="Zusammenfassungen" className="space-y-4 scroll-mt-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Zusammenfassungen</p>

            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                {/* Daily toggle */}
                <div className="flex items-center justify-between px-4 py-3 bg-card">
                    <div>
                        <p className="text-sm font-medium text-foreground">Täglich</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Top-10 wichtigste Nachrichten der letzten 24 h</p>
                    </div>
                    <button
                        role="switch"
                        aria-checked={settings.daily}
                        onClick={() => setSettings(prev => ({ ...prev, daily: !prev.daily }))}
                        className={cn(
                            "relative w-9 h-5 rounded-full transition-colors shrink-0",
                            settings.daily ? "bg-primary" : "bg-muted"
                        )}
                    >
                        <span className={cn(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                            settings.daily ? "left-[calc(100%-18px)]" : "left-0.5"
                        )} />
                    </button>
                </div>

                {/* Weekly toggle */}
                <div className="flex items-center justify-between px-4 py-3 bg-card">
                    <div>
                        <p className="text-sm font-medium text-foreground">Wöchentlich</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Jeden Montag — Übersicht der Vorwoche</p>
                    </div>
                    <button
                        role="switch"
                        aria-checked={settings.weekly}
                        onClick={() => setSettings(prev => ({ ...prev, weekly: !prev.weekly }))}
                        className={cn(
                            "relative w-9 h-5 rounded-full transition-colors shrink-0",
                            settings.weekly ? "bg-primary" : "bg-muted"
                        )}
                    >
                        <span className={cn(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                            settings.weekly ? "left-[calc(100%-18px)]" : "left-0.5"
                        )} />
                    </button>
                </div>

                {/* Time + Email */}
                <div className="flex items-center gap-4 px-4 py-3 bg-card">
                    <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Versandzeit</p>
                        <select
                            value={settings.time}
                            onChange={e => setSettings(prev => ({ ...prev, time: e.target.value }))}
                            className="w-full border border-border rounded-lg px-3 py-1.5 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                        >
                            {TIME_OPTIONS.map(t => (
                                <option key={t} value={t}>{t} Uhr</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Empfänger</p>
                        <input
                            type="email"
                            value={settings.email}
                            onChange={e => setSettings(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full border border-border rounded-lg px-3 py-1.5 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {isSaving ? "Speichern..." : "Speichern"}
                </button>
                {saved && <span className="text-xs text-success font-medium">✓ Gespeichert</span>}
            </div>
        </section>
    );
}
