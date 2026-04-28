"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/useToast";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locales";

export function LanguageSection() {
    const { locale, setLocale, t } = useLanguage();
    const { showToast } = useToast();
    const [pending, setPending] = useState<Locale | null>(null);

    const handleSelect = async (next: Locale) => {
        if (next === locale || pending) return;
        setPending(next);
        try {
            await setLocale(next);
            showToast(t("settings.language.saved"), "success");
        } finally {
            setPending(null);
        }
    };

    return (
        <section id="Sprache" className="space-y-4 scroll-mt-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                {t("settings.language.title")}
            </p>

            <p className="text-sm text-muted-foreground px-0.5">
                {t("settings.language.description")}
            </p>

            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                {SUPPORTED_LOCALES.map((code) => {
                    const isActive = code === locale;
                    const isPending = pending === code;
                    return (
                        <button
                            key={code}
                            onClick={() => handleSelect(code)}
                            disabled={isPending}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                                isActive ? "bg-primary/5" : "bg-card hover:bg-muted/40",
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        isActive ? "bg-primary" : "bg-muted-foreground/30",
                                    )}
                                />
                                <span className="text-sm font-medium text-foreground">{LOCALE_LABELS[code]}</span>
                                <span className="text-xs text-muted-foreground uppercase">{code}</span>
                            </div>
                            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
