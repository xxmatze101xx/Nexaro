"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Search, ExternalLink, AlertTriangle } from "lucide-react";
import { getAccountColor } from "@/lib/calendar";
import type { CalendarAccount } from "@/lib/user";
import { useLanguage } from "@/contexts/LanguageContext";

interface Integration {
    id: string;
    name: string;
    domain: string;
    description: string;
    status: "connected" | "disconnected";
    email: string | null;
}

interface IntegrationsSectionProps {
    integrations: Integration[];
    gmailAccounts: { email: string; token: string }[];
    calendarAccounts: CalendarAccount[];
    slackScopeUpgradeRequired?: boolean;
    onConnect: (integrationId: string) => void;
    onDisconnectGmail: (email: string) => void;
    onDisconnectCalendar: (email: string) => void;
}

type TabValue = "all" | "active" | "inactive";

export function IntegrationsSection({
    integrations,
    gmailAccounts,
    calendarAccounts,
    slackScopeUpgradeRequired = false,
    onConnect,
    onDisconnectGmail,
    onDisconnectCalendar,
}: IntegrationsSectionProps) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<TabValue>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const visibleIntegrations = useMemo(() => {
        let list = [...integrations];
        if (activeTab === "active") list = list.filter(i => i.status === "connected");
        else if (activeTab === "inactive") list = list.filter(i => i.status === "disconnected");
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(i => i.name.toLowerCase().includes(q) || i.domain.toLowerCase().includes(q));
        }
        return list;
    }, [integrations, activeTab, searchQuery]);

    const tabs: { value: TabValue; label: string }[] = [
        { value: "all", label: t("settings.integrations.all") },
        { value: "active", label: t("settings.integrations.active") },
        { value: "inactive", label: t("settings.integrations.inactive") },
    ];

    return (
        <section id="Dienste" className="space-y-4 scroll-mt-20">
            <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                    {t("settings.integrations.title")}
                </p>
            </div>

            {/* Filter + Search */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                    {tabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                activeTab === tab.value
                                    ? "bg-card text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab.value === "active" && (
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                    {tab.label}
                                </span>
                            )}
                            {tab.value !== "active" && tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t("settings.integrations.searchPlaceholder")}
                        className="w-full pl-8 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                    />
                </div>
            </div>

            {/* Integration list */}
            {visibleIntegrations.length === 0 ? (
                <p className="text-center py-10 text-sm text-muted-foreground">{t("settings.integrations.searchPlaceholder")}</p>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                    {visibleIntegrations.map((integration) => {
                        const isConnected = integration.status === "connected";
                        const needsUpgrade = integration.id === "Slack" && slackScopeUpgradeRequired;

                        return (
                            <div key={integration.id} className="flex items-center gap-4 px-4 py-3 bg-card hover:bg-muted/40 transition-colors">
                                {/* Logo */}
                                <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center p-1.5 shrink-0">
                                    <Image
                                        src={`/ServiceLogos/${integration.id}.svg`}
                                        alt={integration.name}
                                        width={22}
                                        height={22}
                                        className="w-full h-full object-contain"
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground truncate">{integration.name}</span>
                                        {isConnected && !needsUpgrade && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                                        )}
                                        {needsUpgrade && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-medium">
                                                <AlertTriangle className="w-2.5 h-2.5" />
                                                Update
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{integration.description}</p>

                                    {/* Connected accounts */}
                                    {integration.id === "Gmail" && gmailAccounts.length > 0 && (
                                        <div className="mt-1.5 space-y-1">
                                            {gmailAccounts.map(acc => (
                                                <div key={acc.email} className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground truncate">{acc.email}</span>
                                                    <button
                                                        onClick={() => onDisconnectGmail(acc.email)}
                                                        className="text-[11px] text-destructive hover:underline shrink-0"
                                                    >
                                                        {t("common.disconnect")}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {integration.id === "Google Calendar" && calendarAccounts.length > 0 && (
                                        <div className="mt-1.5 space-y-1">
                                            {calendarAccounts.map(acc => (
                                                <div key={acc.email} className="flex items-center gap-2">
                                                    <span
                                                        className="w-2 h-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: getAccountColor(acc.email) }}
                                                    />
                                                    <span className="text-xs text-muted-foreground truncate">{acc.email}</span>
                                                    <button
                                                        onClick={() => onDisconnectCalendar(acc.email)}
                                                        className="text-[11px] text-destructive hover:underline shrink-0"
                                                    >
                                                        {t("common.disconnect")}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <a
                                        href={`https://${integration.domain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                    {(integration.id === "Gmail" || integration.id === "Google Calendar") ? (
                                        <button
                                            onClick={() => onConnect(integration.id)}
                                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        >
                                            + Konto
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onConnect(integration.id)}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
                                                isConnected ? "bg-success" : "bg-muted"
                                            )}
                                            role="switch"
                                            aria-checked={isConnected}
                                        >
                                            <span
                                                className="absolute inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                                                style={{ transform: isConnected ? "translateX(18px)" : "translateX(2px)" }}
                                            />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
