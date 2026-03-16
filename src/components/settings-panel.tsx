"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    User,
    CreditCard,
    Link as LinkIcon,
    Shield,
    LogOut,
    Mail,
    Star,
} from "lucide-react";
import { uploadProfilePicture } from "@/lib/storage";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
    getUserProfile,
    getGmailAccounts,
    saveGmailRefreshToken,
    disconnectGmail,
    getCalendarAccounts,
    saveCalendarRefreshToken,
    disconnectCalendar,
    getSlackConnection,
    disconnectSlack,
    getMicrosoftConnection,
    disconnectMicrosoft,
    type CalendarAccount,
} from "@/lib/user";
import { AccountSection } from "@/components/settings/AccountSection";
import { IntegrationsSection } from "@/components/settings/IntegrationsSection";
import { BillingSection } from "@/components/settings/BillingSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { DigestSection } from "@/components/settings/DigestSection";
import { FeatureFlagsSection } from "@/components/settings/FeatureFlagsSection";
import { DataPurgeSection } from "@/components/settings/DataPurgeSection";
import { VipSendersSection } from "@/components/settings/VipSendersSection";

interface SettingsPanelProps {
    className?: string;
}

export function SettingsPanel({ className }: SettingsPanelProps) {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [activeSection, setActiveSection] = useState("Konto");
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [gmailAccounts, setGmailAccounts] = useState<{ email: string; token: string }[]>([]);
    const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([]);
    const [slackConnected, setSlackConnected] = useState(false);
    const [slackScopeUpgradeRequired, setSlackScopeUpgradeRequired] = useState(false);
    const [microsoftConnected, setMicrosoftConnected] = useState(false);
    const codeHandledRef = useRef(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Load profile data when user becomes available
    useEffect(() => {
        if (!user) return;
        getUserProfile(user.uid).then((profile) => {
            if (profile) {
                if (profile.photoURL) setProfilePic(profile.photoURL);
                if (profile.displayName) setDisplayName(profile.displayName);
                if (profile.email) setEmail(profile.email);
            } else {
                if (user.photoURL) setProfilePic(user.photoURL);
                if (user.displayName) setDisplayName(user.displayName);
                if (user.email) setEmail(user.email ?? "");
            }
        });
    }, [user]);

    // OAuth callback handling
    useEffect(() => {
        if (!user?.uid) return;

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const service = urlParams.get("service") ?? urlParams.get("state");
        const slackConnectedParam = urlParams.get("slack_connected");
        const microsoftConnectedParam = urlParams.get("microsoft_connected");

        if (code && !codeHandledRef.current) {
            codeHandledRef.current = true;
            if (service === "calendar") {
                handleCalendarOAuthCallback(code, user.uid);
            } else {
                handleGmailOAuthCallback(code, user.uid);
            }
        } else {
            getGmailAccounts(user.uid).then(setGmailAccounts);
            getCalendarAccounts(user.uid).then(setCalendarAccounts);

            if (slackConnectedParam === "true") setSlackConnected(true);
            if (microsoftConnectedParam === "true") setMicrosoftConnected(true);

            const verifyWithRetry = async (
                fetcher: () => Promise<unknown>,
                setter: (v: boolean) => void,
                maxAttempts = 3,
            ) => {
                for (let i = 0; i < maxAttempts; i++) {
                    const conn = await fetcher();
                    if (conn) { setter(true); return; }
                    if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 600 * (i + 1)));
                }
            };

            const checkSlackScopes = async () => {
                try {
                    const idToken = await user.getIdToken();
                    const res = await fetch("/api/slack/check-scopes", {
                        headers: { Authorization: `Bearer ${idToken}` },
                    });
                    if (res.ok) {
                        const data = await res.json() as { needsUpgrade?: boolean };
                        setSlackScopeUpgradeRequired(data.needsUpgrade === true);
                    }
                } catch {
                    // ignore
                }
            };

            if (slackConnectedParam === "true") {
                verifyWithRetry(() => getSlackConnection(user.uid), setSlackConnected);
                checkSlackScopes();
            } else {
                getSlackConnection(user.uid).then(conn => {
                    setSlackConnected(!!conn);
                    if (conn) checkSlackScopes();
                });
            }

            if (microsoftConnectedParam === "true") {
                verifyWithRetry(() => getMicrosoftConnection(user.uid), setMicrosoftConnected);
            } else {
                getMicrosoftConnection(user.uid).then(conn => setMicrosoftConnected(!!conn));
            }

            if (slackConnectedParam === "true" || microsoftConnectedParam === "true") {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            const errorParam = urlParams.get("slack_error") ?? urlParams.get("microsoft_error");
            if (errorParam) {
                alert(`OAuth-Fehler: ${errorParam}`);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, [user]);

    // Intersection observer for active nav section
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const sectionIds = ["Konto", "Dienste", "Zusammenfassungen", "VIP", "Abonnement", "Sicherheit"];
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) setActiveSection(entry.target.id);
                });
            },
            { root: container, rootMargin: "-80px 0px -60% 0px" }
        );
        sectionIds.forEach(id => {
            const el = document.getElementById(`settings-${id}`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(`settings-${id}`);
        if (element && scrollContainerRef.current) {
            const containerTop = scrollContainerRef.current.getBoundingClientRect().top;
            const elementTop = element.getBoundingClientRect().top;
            const offset = elementTop - containerTop + scrollContainerRef.current.scrollTop - 80;
            scrollContainerRef.current.scrollTo({ top: offset, behavior: "smooth" });
            setActiveSection(id);
        }
    };

    const handleGmailOAuthCallback = async (code: string, uid: string) => {
        try {
            const res = await fetch("/api/gmail/exchange", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
            if (!res.ok) { alert(`Fehler: ${data.error ?? "Unbekannter Fehler"}`); return; }

            if (data.access_token) {
                const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
                    headers: { Authorization: `Bearer ${data.access_token}` },
                });
                if (profileRes.ok) {
                    const profileData = (await profileRes.json()) as { emailAddress?: string };
                    const newEmail = profileData.emailAddress;
                    if (newEmail) {
                        localStorage.setItem(`gmail_access_token_${newEmail}`, data.access_token);
                        localStorage.setItem(`gmail_token_expiry_${newEmail}`, (Date.now() + (data.expires_in ?? 3599) * 1000).toString());
                        if (data.refresh_token) await saveGmailRefreshToken(uid, data.refresh_token, newEmail);
                        setGmailAccounts(await getGmailAccounts(uid));
                        const idToken = await user?.getIdToken();
                        if (idToken) {
                            void fetch("/api/gmail/watch", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                                body: JSON.stringify({ email: newEmail }),
                            }).catch(() => undefined);
                        }
                    }
                }
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            alert(`Ein Fehler ist aufgetreten: ${msg}`);
        }
    };

    const handleCalendarOAuthCallback = async (code: string, uid: string) => {
        try {
            const res = await fetch("/api/calendar/exchange", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
            if (!res.ok) { alert(`Fehler: ${data.error ?? "Unbekannter Fehler"}`); return; }

            if (data.access_token) {
                const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: { Authorization: `Bearer ${data.access_token}` },
                });
                if (profileRes.ok) {
                    const profileData = (await profileRes.json()) as { email?: string };
                    const accountEmail = profileData.email;
                    if (accountEmail) {
                        localStorage.setItem(`gcal_access_token_${accountEmail}`, data.access_token);
                        localStorage.setItem(`gcal_token_expiry_${accountEmail}`, (Date.now() + (data.expires_in ?? 3599) * 1000).toString());
                        if (data.refresh_token) await saveCalendarRefreshToken(uid, data.refresh_token, accountEmail);
                        setCalendarAccounts(await getCalendarAccounts(uid));
                    }
                }
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            alert(`Fehler: ${msg}`);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const targetUid = user?.uid ?? "test_user";
        try {
            setIsUploading(true);
            const downloadURL = await uploadProfilePicture(targetUid, file);
            setProfilePic(downloadURL);
            if (user?.uid) {
                const { updateUserProfile } = await import("@/lib/user");
                await updateUserProfile(user.uid, { photoURL: downloadURL });
            }
            alert("Profilbild erfolgreich aktualisiert!");
        } catch (error) {
            console.error("Fehler beim Upload:", error);
            alert("Fehler beim Hochladen des Bildes.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!user?.uid) return;
        try {
            setIsSaving(true);
            const { updateUserProfile } = await import("@/lib/user");
            await updateUserProfile(user.uid, { displayName });
            alert("Änderungen erfolgreich gespeichert!");
        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            alert("Fehler beim Speichern der Änderungen.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConnectProvider = async (integrationId: string) => {
        if (!user?.uid) { alert("Bitte zuerst einloggen."); return; }

        const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

        if (integrationId === "Gmail") {
            if (!googleClientId) { alert("Google Client ID fehlt in den Umgebungsvariablen."); return; }
            const redirectUri = `${window.location.origin}/settings`;
            const scope = "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send";
            window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
        } else if (integrationId === "Google Calendar") {
            if (!googleClientId) { alert("Google Client ID fehlt in den Umgebungsvariablen."); return; }
            const redirectUri = `${window.location.origin}/settings`;
            const scope = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email";
            window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=calendar`;
        } else if (integrationId === "Slack") {
            if (slackConnected) {
                if (confirm("Slack wirklich trennen? Du kannst es jederzeit neu verbinden.")) {
                    await disconnectSlack(user.uid);
                    setSlackConnected(false);
                }
            } else {
                const idToken = await user.getIdToken(false);
                window.location.href = `/api/slack/connect?uid=${encodeURIComponent(user.uid)}&idToken=${encodeURIComponent(idToken)}`;
            }
        } else if (integrationId === "Outlook" || integrationId === "Microsoft Teams") {
            const idToken = await user.getIdToken(false);
            window.location.href = `/api/microsoft/connect?uid=${encodeURIComponent(user.uid)}&idToken=${encodeURIComponent(idToken)}`;
        } else {
            alert(`${integrationId} Integration ist noch nicht implementiert.`);
        }
    };

    const handleDisconnectGmail = async (accEmail: string) => {
        if (!user?.uid) return;
        await disconnectGmail(user.uid, accEmail);
        localStorage.removeItem(`gmail_access_token_${accEmail}`);
        localStorage.removeItem(`gmail_token_expiry_${accEmail}`);
        setGmailAccounts(prev => prev.filter(a => a.email !== accEmail));
    };

    const handleDisconnectCalendar = async (accEmail: string) => {
        if (!user?.uid) return;
        await disconnectCalendar(user.uid, accEmail);
        localStorage.removeItem(`gcal_access_token_${accEmail}`);
        localStorage.removeItem(`gcal_token_expiry_${accEmail}`);
        setCalendarAccounts(prev => prev.filter(a => a.email !== accEmail));
    };

    const integrations = [
        { id: "Slack", name: "Slack", domain: "slack.com", description: "Sende Benachrichtigungen in Kanäle und erstelle Projekte aus Nachrichten.", status: (slackConnected ? "connected" : "disconnected") as "connected" | "disconnected", email: null },
        { id: "Gmail", name: "Gmail", domain: "gmail.com", description: "Synchronisiere und verwalte deine E-Mails nahtlos in all deinen Projekten.", status: (gmailAccounts.length > 0 ? "connected" : "disconnected") as "connected" | "disconnected", email: null },
        { id: "Google Calendar", name: "Google Calendar", domain: "calendar.google.com", description: "Behalte deine Termine und Fristen stets im Blick mit der Kalender-Integration.", status: (calendarAccounts.length > 0 ? "connected" : "disconnected") as "connected" | "disconnected", email: null },
        { id: "Outlook", name: "Microsoft Outlook", domain: "outlook.live.com", description: "Greife über Microsofts etablierten Dienst direkt auf deine Mails und Kontakte zu.", status: (microsoftConnected ? "connected" : "disconnected") as "connected" | "disconnected", email: null },
        { id: "Microsoft Teams", name: "Microsoft Teams", domain: "teams.microsoft.com", description: "Kommunikation auf Unternehmensebene nahtlos mit Projektaktivitäten verbunden.", status: (microsoftConnected ? "connected" : "disconnected") as "connected" | "disconnected", email: null },
        { id: "Proton Mail", name: "Proton Mail", domain: "proton.me", description: "Sichere Ende-zu-Ende verschlüsselte Kommunikation direkt aus Nexaro heraus.", status: "disconnected" as const, email: null },
        { id: "HubSpot", name: "HubSpot", domain: "hubspot.com", description: "Verwalte Marketing- und CRM-Daten, um das Wachstum deines Business voranzutreiben.", status: "disconnected" as const, email: null },
        { id: "Jira", name: "Jira", domain: "jira.atlassian.com", description: "Ticket-Erstellung und Issue-Tracking komplett integriert in deine Support-Flows.", status: "disconnected" as const, email: null },
        { id: "Linear", name: "Linear", domain: "linear.app", description: "Eine magische und reibungslose Methode, Software-Projekte, Issues und Features zu bearbeiten.", status: "disconnected" as const, email: null },
        { id: "Salesforce", name: "Salesforce", domain: "salesforce.com", description: "Globale CRM-Plattform für Vertrieb, Service, Marketing und mehr in einem.", status: "disconnected" as const, email: null },
    ];

    const NAV_ITEMS = [
        { id: "Konto", icon: <User className="w-4 h-4" /> },
        { id: "Dienste", icon: <LinkIcon className="w-4 h-4" /> },
        { id: "Zusammenfassungen", icon: <Mail className="w-4 h-4" /> },
        { id: "VIP", icon: <Star className="w-4 h-4" /> },
        { id: "Abonnement", icon: <CreditCard className="w-4 h-4" /> },
        { id: "Sicherheit", icon: <Shield className="w-4 h-4" /> },
    ];

    return (
        <div className={cn("flex flex-col h-full overflow-hidden", className)}>
            {/* Panel Header */}
            <div className="px-6 py-4 border-b border-border shrink-0">
                <h2 className="text-base font-semibold">Einstellungen</h2>
            </div>

            {/* Body: sidebar nav + scrollable content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left nav */}
                <div className="w-44 shrink-0 border-r border-border flex flex-col py-4 px-2 gap-1">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                activeSection === item.id
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {item.icon}
                            {item.id}
                        </button>
                    ))}
                    <div className="mt-auto pt-4 border-t border-border">
                        <button
                            onClick={async () => {
                                try { await auth.signOut(); window.location.href = "/login"; }
                                catch (error) { console.error("Logout error", error); }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Abmelden
                        </button>
                    </div>
                </div>

                {/* Scrollable content */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-12 pb-16">
                        <div id="settings-Konto">
                            <AccountSection
                                user={user}
                                isAuthLoading={isAuthLoading}
                                profilePic={profilePic}
                                displayName={displayName}
                                email={email}
                                isUploading={isUploading}
                                isSaving={isSaving}
                                onDisplayNameChange={setDisplayName}
                                onFileChange={handleFileChange}
                                onSave={handleSaveChanges}
                            />
                        </div>
                        <div id="settings-Dienste">
                            <IntegrationsSection
                                integrations={integrations}
                                gmailAccounts={gmailAccounts}
                                calendarAccounts={calendarAccounts}
                                slackScopeUpgradeRequired={slackScopeUpgradeRequired}
                                onConnect={handleConnectProvider}
                                onDisconnectGmail={handleDisconnectGmail}
                                onDisconnectCalendar={handleDisconnectCalendar}
                            />
                        </div>
                        <div id="settings-Zusammenfassungen">
                            <DigestSection uid={user?.uid} userEmail={email} />
                        </div>
                        <div id="settings-VIP">
                            <VipSendersSection uid={user?.uid} />
                        </div>
                        <FeatureFlagsSection uid={user?.uid} />
                        <div id="settings-Abonnement">
                            <BillingSection />
                        </div>
                        <div id="settings-Sicherheit">
                            <SecuritySection />
                            <DataPurgeSection user={user} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
