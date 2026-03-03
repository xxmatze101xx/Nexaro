"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    Settings as SettingsIcon,
    Moon,
    Sun,
    Bell,
    Shield,
    Sparkles,
    LogOut,
    ChevronLeft
} from "lucide-react";
import { SOURCE_CONFIG, SourceIcon } from "@/components/source-filter";

export default function SettingsPage() {
    const [darkMode, setDarkMode] = useState(false);

    const integrations = [
        { id: "slack", status: "connected", email: "matte@company.com" },
        { id: "gmail", status: "connected", email: "matte@company.com" },
        { id: "gcal", status: "connected", email: "matte@company.com" },
        { id: "outlook", status: "disconnected", email: null },
        { id: "teams", status: "disconnected", email: null },
        { id: "proton", status: "connected", email: "matte@proton.me" },
    ];

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle("dark");
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="h-14 border-b border-border flex items-center px-6 bg-card shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-4 w-full max-w-5xl mx-auto">
                    <button
                        onClick={() => window.location.href = "/"}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors -ml-2"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-primary" />
                        <h1 className="text-lg font-semibold font-[Inter]">Settings</h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">

                    {/* Settings Nav Sidebar */}
                    <div className="md:col-span-3 space-y-1">
                        <SettingsNavLink icon={<SettingsIcon className="w-4 h-4" />} label="General" active />
                        <SettingsNavLink icon={<Sparkles className="w-4 h-4" />} label="AI Preferences" />
                        <SettingsNavLink icon={<Bell className="w-4 h-4" />} label="Notifications" />
                        <SettingsNavLink icon={<Shield className="w-4 h-4" />} label="Security" />
                    </div>

                    {/* Settings Content */}
                    <div className="md:col-span-9 space-y-8">

                        {/* Appearance */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold font-[Inter] border-b border-border pb-2">Appearance</h2>

                            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                                <div>
                                    <h3 className="font-medium text-sm">Theme Theme</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Switch between light and dark mode.</p>
                                </div>
                                <button
                                    onClick={toggleDarkMode}
                                    className={cn(
                                        "flex items-center justify-center p-2 rounded-lg border border-border",
                                        "hover:bg-muted transition-colors"
                                    )}
                                >
                                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                </button>
                            </div>
                        </section>

                        {/* AI Preferences */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold font-[Inter] border-b border-border pb-2">AI Preferences</h2>
                            <p className="text-sm text-muted-foreground">Configure how Nexaro's AI drafts your responses and scores importance.</p>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                                    <h3 className="font-medium text-sm">Draft Tone</h3>
                                    <select className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                                        <option>Professional & Concise</option>
                                        <option>Friendly & Casual</option>
                                        <option>Direct & Analytical</option>
                                    </select>
                                </div>

                                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                                    <h3 className="font-medium text-sm">Auto-Draft Threshold</h3>
                                    <p className="text-xs text-muted-foreground">Only draft responses for messages scoring above:</p>
                                    <div className="flex items-center gap-3">
                                        <input type="range" min="0" max="10" step="1" defaultValue="5" className="flex-1 accent-primary" />
                                        <span className="text-sm font-medium w-6 text-right">5.0</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Integrations */}
                        <section className="space-y-4">
                            <div className="flex items-end justify-between border-b border-border pb-2">
                                <div>
                                    <h2 className="text-xl font-semibold font-[Inter]">Connected Integrations</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Manage your connected channels for the unified inbox.</p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {integrations.map((integration) => {
                                    const config = SOURCE_CONFIG[integration.id] || { label: integration.id, color: "text-gray-500" };
                                    const isConnected = integration.status === "connected";

                                    return (
                                        <div key={integration.id} className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                                            isConnected ? "border-primary/20 bg-primary/5" : "border-border bg-card"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <SourceIcon source={integration.id} size="md" />
                                                <div>
                                                    <h3 className="text-sm font-medium">{config.label}</h3>
                                                    {isConnected ? (
                                                        <p className="text-xs text-muted-foreground">{integration.email}</p>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground">Not connected</p>
                                                    )}
                                                </div>
                                            </div>

                                            <button className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                                isConnected
                                                    ? "border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                                    : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                                            )}>
                                                {isConnected ? "Disconnect" : "Connect"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Danger Zone */}
                        <section className="pt-8">
                            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </section>

                    </div>
                </div>
            </main>
        </div>
    );
}

function SettingsNavLink({ icon, label, active }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <button className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}>
            {icon}
            {label}
        </button>
    );
}
