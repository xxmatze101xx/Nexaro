"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { DownloadCloud, Plus, Search, ExternalLink, Settings as SettingsIcon, AlertTriangle } from "lucide-react";
import { getAccountColor } from "@/lib/calendar";
import type { CalendarAccount } from "@/lib/user";

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

type TabValue = "all" | "active" | "inactive" | "custom";

export function IntegrationsSection({
    integrations,
    gmailAccounts,
    calendarAccounts,
    slackScopeUpgradeRequired = false,
    onConnect,
    onDisconnectGmail,
    onDisconnectCalendar,
}: IntegrationsSectionProps) {
    const [activeTab, setActiveTab] = useState<TabValue>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const visibleIntegrations = useMemo(() => {
        let list = [...integrations];

        if (activeTab === "active") list = list.filter(i => i.status === "connected");
        else if (activeTab === "inactive") list = list.filter(i => i.status === "disconnected");
        else if (activeTab === "custom") list = []; // placeholder for custom workflows

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                i => i.name.toLowerCase().includes(q) || i.domain.toLowerCase().includes(q)
            );
        }

        return list;
    }, [integrations, activeTab, searchQuery]);

    const tabs: { value: TabValue; label: string }[] = [
        { value: "all", label: "Alle zeigen" },
        { value: "active", label: "Aktiv" },
        { value: "inactive", label: "Inaktiv" },
        { value: "custom", label: "Custom" },
    ];

    return (
        <section id="Dienste" className="space-y-6 scroll-mt-28">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Integrations & Workflows</h2>
                    <p className="text-sm text-slate-500">Optimiere deinen Workflow und verbinde die Tools, die dein Team täglich nutzt.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all shadow-sm">
                        <DownloadCloud className="w-4 h-4 text-slate-500" /> Export
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 hover:-translate-y-0.5">
                        <Plus className="w-4 h-4" /> Integration erstellen
                    </button>
                </div>
            </div>

            {/* Filter Tabs + Search */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 py-2">
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/70 border border-slate-200/60 rounded-xl w-fit">
                    {tabs.map((tab, idx) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={cn(
                                "px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all",
                                activeTab === tab.value
                                    ? "text-slate-900 bg-white shadow-sm border border-slate-200/50"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                            )}
                        >
                            {tab.value === "active" && (
                                <span className="inline-flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20" />
                                    {tab.label}
                                </span>
                            )}
                            {tab.value !== "active" && tab.label}
                        </button>
                    ))}
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <button className="px-2 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-white/50 rounded-lg transition-all">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="relative group w-full xl:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Integration suchen..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Integration Cards */}
            {visibleIntegrations.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                    {activeTab === "custom"
                        ? "Custom Workflows kommen bald."
                        : "Keine Integrationen gefunden."}
                </div>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleIntegrations.map((integration) => {
                        const isConnected = integration.status === "connected";

                        return (
                            <div
                                key={integration.id}
                                className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden hover:-translate-y-1"
                            >
                                {isConnected && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />
                                )}
                                {integration.id === "Slack" && slackScopeUpgradeRequired && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
                                )}

                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="w-12 h-12 rounded-[14px] bg-white border border-slate-150 flex items-center justify-center p-2.5 shadow-sm group-hover:scale-110 transition-transform duration-500 ease-out">
                                            <Image
                                                src={`/ServiceLogos/${integration.id}.svg`}
                                                alt={integration.name}
                                                width={26}
                                                height={26}
                                                className="w-full h-full object-contain drop-shadow-sm"
                                            />
                                        </div>
                                        <a
                                            href={`https://${integration.domain}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-900 transition-colors px-2.5 py-1 rounded-full hover:bg-slate-50"
                                        >
                                            {integration.domain}
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-semibold tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
                                                {integration.name}
                                            </h3>
                                            {integration.id === "Slack" && slackScopeUpgradeRequired && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Neu verbinden
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[13px] text-slate-500 leading-relaxed font-normal line-clamp-2">
                                            {integration.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <button className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                            <SettingsIcon className="w-4 h-4" /> Verwalten
                                        </button>

                                        {(integration.id === "Gmail" || integration.id === "Google Calendar") ? (
                                            <button
                                                onClick={() => onConnect(integration.id)}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                                title="Weiteres Konto verbinden"
                                            >
                                                + Hinzufügen
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onConnect(integration.id)}
                                                className={cn(
                                                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full",
                                                    "focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all duration-300",
                                                    isConnected ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-200 hover:bg-slate-300"
                                                )}
                                                role="switch"
                                                aria-checked={isConnected}
                                                title={isConnected ? "Integration trennen" : "Integration verbinden"}
                                            >
                                                <span className="sr-only">Toggle {integration.name}</span>
                                                <span
                                                    aria-hidden="true"
                                                    className="pointer-events-none absolute left-0 inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-out"
                                                    style={{ transform: isConnected ? "translateX(20px)" : "translateX(2px)" }}
                                                />
                                            </button>
                                        )}
                                    </div>

                                    {integration.id === "Gmail" && gmailAccounts.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            {gmailAccounts.map(acc => (
                                                <div key={acc.email} className="flex items-center justify-between text-sm py-2 border-t border-slate-200/60">
                                                    <span className="text-slate-700 font-medium truncate pr-2">{acc.email}</span>
                                                    <button
                                                        onClick={() => onDisconnectGmail(acc.email)}
                                                        className="text-red-500 hover:text-red-700 font-medium whitespace-nowrap"
                                                    >
                                                        Trennen
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {integration.id === "Google Calendar" && calendarAccounts.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            {calendarAccounts.map(acc => (
                                                <div key={acc.email} className="flex items-center justify-between text-sm py-2 border-t border-slate-200/60">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: getAccountColor(acc.email) }}
                                                        />
                                                        <span className="text-slate-700 font-medium truncate">{acc.email}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => onDisconnectCalendar(acc.email)}
                                                        className="text-red-500 hover:text-red-700 font-medium whitespace-nowrap ml-2"
                                                    >
                                                        Trennen
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
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
