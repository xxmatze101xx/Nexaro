"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { RichButton } from "@/components/ui/rich-button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/useToast";

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

export function DigestSection({ uid, userEmail }: DigestSectionProps) {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [settings, setSettings] = useState<DigestSettings>({
        daily: false,
        weekly: false,
        time: "08:00",
        email: userEmail,
    });
    const lastSavedRef = useRef<DigestSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!uid) return;
        getDoc(doc(db, "users", uid, "settings", "digest")).then(snap => {
            const next: DigestSettings = snap.exists()
                ? (snap.data() as DigestSettings)
                : { daily: false, weekly: false, time: "08:00", email: userEmail };
            setSettings(next);
            lastSavedRef.current = next;
        }).catch(() => {/* ignore */});
    }, [uid, userEmail]);

    const isDirty = useMemo(
        () => JSON.stringify(settings) !== JSON.stringify(lastSavedRef.current),
        [settings],
    );

    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isDirty]);

    const handleSave = async () => {
        if (!uid) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, "users", uid, "settings", "digest"), settings);
            lastSavedRef.current = settings;
            showToast(t("settings.digest.saved"), "success");
        } catch (e) {
            console.error("Failed to save digest settings", e);
            showToast(t("settings.digest.saveFailed"), "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section id="Zusammenfassungen" className="space-y-4 scroll-mt-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                {t("settings.digest.title")}
            </p>

            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                {/* Daily toggle */}
                <div className="flex items-center justify-between px-4 py-3 bg-card">
                    <div>
                        <p className="text-sm font-medium text-foreground">{t("settings.digest.daily")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("settings.digest.dailyHint")}</p>
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
                        <p className="text-sm font-medium text-foreground">{t("settings.digest.weekly")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("settings.digest.weeklyHint")}</p>
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
                        <p className="text-xs text-muted-foreground mb-1">{t("settings.digest.sendTime")}</p>
                        <input
                            type="time"
                            step={900}
                            value={settings.time}
                            onChange={e => setSettings(prev => ({ ...prev, time: e.target.value }))}
                            className="w-full border border-border rounded-lg px-3 py-1.5 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                        />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">{t("settings.digest.recipient")}</p>
                        <input
                            type="email"
                            value={settings.email}
                            onChange={e => setSettings(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full border border-border rounded-lg px-3 py-1.5 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                {isDirty && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                        {t("common.unsavedChanges")}
                    </span>
                )}
                <RichButton
                    color="purple"
                    size="default"
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
                >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {isSaving ? t("common.saving") : t("common.save")}
                </RichButton>
            </div>
        </section>
    );
}
