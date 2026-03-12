"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNotificationSettings, saveNotificationSettings, type NotificationSettings } from "@/lib/user";

interface NotificationsSectionProps {
    uid: string | undefined;
}

function Toggle({
    checked,
    onChange,
    disabled,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30",
                checked ? "bg-primary" : "bg-muted",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <span
                className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                    checked ? "translate-x-6" : "translate-x-1"
                )}
            />
        </button>
    );
}

export function NotificationsSection({ uid }: NotificationsSectionProps) {
    const [settings, setSettings] = useState<NotificationSettings>({
        popupEnabled: true,
        popupGmail: true,
        popupSlack: true,
        popupTeams: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!uid) return;
        getNotificationSettings(uid)
            .then(setSettings)
            .finally(() => setLoading(false));
    }, [uid]);

    const update = useCallback(async (patch: Partial<NotificationSettings>) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        if (!uid) return;
        setSaving(true);
        try {
            await saveNotificationSettings(uid, next);
        } catch (e: unknown) {
            console.error("Failed to save notification settings:", e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    }, [uid, settings]);

    if (loading) {
        return (
            <section id="Benachrichtigungen" className="scroll-mt-28">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
            </section>
        );
    }

    return (
        <section id="Benachrichtigungen" className="scroll-mt-28">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <Bell className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Benachrichtigungen</h2>
                    <p className="text-sm text-muted-foreground">Popup-Benachrichtigungen für neue Nachrichten steuern</p>
                </div>
                {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />}
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
                {/* Master toggle */}
                <div className="flex items-center justify-between px-6 py-5">
                    <div>
                        <p className="text-sm font-medium text-foreground">Popup-Benachrichtigungen</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Zeige Toast-Notifications bei neuen Nachrichten</p>
                    </div>
                    <Toggle checked={settings.popupEnabled} onChange={(v) => update({ popupEnabled: v })} />
                </div>

                {/* Per-integration toggles (only when master is on) */}
                {settings.popupEnabled && (
                    <>
                        <div className="flex items-center justify-between px-6 py-4 bg-muted/30">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-foreground">Gmail</span>
                            </div>
                            <Toggle checked={settings.popupGmail} onChange={(v) => update({ popupGmail: v })} />
                        </div>
                        <div className="flex items-center justify-between px-6 py-4 bg-muted/30">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-foreground">Slack</span>
                            </div>
                            <Toggle checked={settings.popupSlack} onChange={(v) => update({ popupSlack: v })} />
                        </div>
                        <div className="flex items-center justify-between px-6 py-4 bg-muted/30">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-foreground">Microsoft Teams</span>
                            </div>
                            <Toggle checked={settings.popupTeams} onChange={(v) => update({ popupTeams: v })} />
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
