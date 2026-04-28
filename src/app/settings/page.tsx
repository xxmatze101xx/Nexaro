"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Settings as SettingsIcon,
    ChevronLeft,
    User,
    CreditCard,
    Link as LinkIcon,
    Shield,
    LogOut,
    Mail,
    Globe,
} from "lucide-react";
import { uploadProfilePicture } from "@/lib/storage";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
    getDriveConnection,
    disconnectDrive,
    type CalendarAccount,
} from "@/lib/user";
import { AccountSection } from "@/components/settings/AccountSection";
import { IntegrationsSection } from "@/components/settings/IntegrationsSection";
import { BillingSection } from "@/components/settings/BillingSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { DigestSection } from "@/components/settings/DigestSection";
import { FeatureFlagsSection } from "@/components/settings/FeatureFlagsSection";
import { DataPurgeSection } from "@/components/settings/DataPurgeSection";
import { LanguageSection } from "@/components/settings/LanguageSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/useToast";

export default function SettingsPage() {
    return (
        <AuthGuard>
            <Suspense fallback={null}>
                <SettingsContent />
            </Suspense>
        </AuthGuard>
    );
}

function SettingsContent() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const [activeSection, setActiveSection] = useState("Konto");
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [savedDisplayName, setSavedDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [gmailAccounts, setGmailAccounts] = useState<{ email: string; token: string }[]>([]);
    const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([]);
    const [slackConnected, setSlackConnected] = useState(false);
    const [slackScopeUpgradeRequired, setSlackScopeUpgradeRequired] = useState(false);
    const [microsoftConnected, setMicrosoftConnected] = useState(false);
    const [driveConnected, setDriveConnected] = useState(false);
    const codeHandledRef = useRef(false);

    const isAccountDirty = displayName.trim() !== savedDisplayName.trim();

    useEffect(() => {
        if (!isAccountDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isAccountDirty]);

    useEffect(() => {
        document.documentElement.classList.remove("dark");
    }, []);

    useEffect(() => {
        if (!user) return;
        getUserProfile(user.uid).then((profile) => {
            const initialName = profile?.displayName || user.displayName || "";
            setDisplayName(initialName);
            setSavedDisplayName(initialName);
            if (profile?.photoURL) setProfilePic(profile.photoURL);
            else if (user.photoURL) setProfilePic(user.photoURL);
            if (profile?.email) setEmail(profile.email);
            else if (user.email) setEmail(user.email);
        });
    }, [user]);

    useEffect(() => {
        if (!user?.uid) return;

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const service = urlParams.get("service") ?? urlParams.get("state");
        const slackConnectedParam = urlParams.get("slack_connected");
        const microsoftConnectedParam = urlParams.get("microsoft_connected");
        const driveConnectedParam = urlParams.get("drive_connected");
        const driveTokensParam = urlParams.get("drive_tokens");
        const driveErrorParam = urlParams.get("drive_error");

        if (code && !codeHandledRef.current) {
            codeHandledRef.current = true;
            if (service === "calendar") {
                handleCalendarOAuthCallback(code, user.uid);
            } else {
                handleGmailOAuthCallback(code, user.uid);
            }
        } else if (driveTokensParam === "1" && !codeHandledRef.current) {
            codeHandledRef.current = true;
            const driveUid = urlParams.get("drive_uid") ?? "";
            const accessToken = urlParams.get("drive_access_token") ?? "";
            const refreshToken = urlParams.get("drive_refresh_token") ?? "";
            const expiresAt = urlParams.get("drive_expires_at") ?? "";
            if (driveUid === user.uid && accessToken) {
                void handleDriveTokenCallback(accessToken, refreshToken, expiresAt);
            }
        } else {
            getGmailAccounts(user.uid).then(setGmailAccounts);
            getCalendarAccounts(user.uid).then(setCalendarAccounts);

            if (slackConnectedParam === "true") setSlackConnected(true);
            if (microsoftConnectedParam === "true") setMicrosoftConnected(true);
            if (driveConnectedParam === "true") setDriveConnected(true);

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

            if (driveConnectedParam === "true") {
                verifyWithRetry(() => getDriveConnection(user.uid), setDriveConnected);
            } else {
                getDriveConnection(user.uid).then(conn => setDriveConnected(!!conn));
            }

            if (slackConnectedParam === "true" || microsoftConnectedParam === "true" || driveConnectedParam === "true") {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            const errorParam = urlParams.get("slack_error") ?? urlParams.get("microsoft_error");
            if (errorParam) {
                showToast(t("settings.integrations.oauthError", { error: errorParam }), "error");
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            if (driveErrorParam) {
                showToast(t("settings.integrations.driveError", { error: driveErrorParam }), "error");
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        const sectionIds = ["Konto", "Dienste", "Zusammenfassungen", "Sprache", "Abonnement", "Sicherheit"];
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) setActiveSection(entry.target.id);
                });
            },
            { rootMargin: "-120px 0px -60% 0px" }
        );
        sectionIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const sectionParam = searchParams.get("section");
        if (!sectionParam) return;
        const map: Record<string, string> = {
            account: "Konto",
            integrations: "Dienste",
            digest: "Zusammenfassungen",
            language: "Sprache",
            billing: "Abonnement",
            security: "Sicherheit",
        };
        const id = map[sectionParam.toLowerCase()];
        if (!id) return;
        const handle = window.setTimeout(() => {
            const el = document.getElementById(id);
            if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 100;
                window.scrollTo({ top: y, behavior: "smooth" });
                setActiveSection(id);
            }
        }, 150);
        return () => window.clearTimeout(handle);
    }, [searchParams]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const y = element.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: "smooth" });
            setActiveSection(id);
        }
    };

    const handleDriveTokenCallback = async (accessToken: string, refreshToken: string, expiresAt: string) => {
        if (!user?.uid) return;
        try {
            const ref = doc(db, "users", user.uid, "tokens", "google_drive");
            await setDoc(ref, {
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_at: Number(expiresAt),
                connected_at: serverTimestamp(),
            });
            setDriveConnected(true);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            showToast(t("settings.integrations.driveError", { error: msg }), "error");
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    };

    const handleGmailOAuthCallback = async (code: string, uid: string) => {
        try {
            const res = await fetch("/api/gmail/exchange", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
            if (!res.ok) { showToast(t("settings.integrations.oauthError", { error: data.error ?? "" }), "error"); return; }

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
            showToast(t("settings.integrations.oauthError", { error: msg }), "error");
        }
    };

    const handleCalendarOAuthCallback = async (code: string, uid: string) => {
        try {
            const res = await fetch("/api/calendar/exchange", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string; error?: string };
            if (!res.ok) { showToast(t("settings.integrations.oauthError", { error: data.error ?? "" }), "error"); return; }

            if (data.access_token) {
                let accountEmail: string | undefined;
                if (data.id_token) {
                    try {
                        const payload = JSON.parse(atob(data.id_token.split(".")[1])) as { email?: string };
                        accountEmail = payload.email;
                    } catch {
                        // fallback
                    }
                }
                if (!accountEmail) {
                    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                        headers: { Authorization: `Bearer ${data.access_token}` },
                    });
                    if (profileRes.ok) {
                        const profileData = (await profileRes.json()) as { email?: string };
                        accountEmail = profileData.email;
                    }
                }
                if (accountEmail) {
                    localStorage.setItem(`gcal_access_token_${accountEmail}`, data.access_token);
                    localStorage.setItem(`gcal_token_expiry_${accountEmail}`, (Date.now() + (data.expires_in ?? 3599) * 1000).toString());
                    localStorage.removeItem(`gcal_auth_error_${accountEmail}`);
                    localStorage.removeItem(`gcal_refresh_backoff_${accountEmail}`);
                    if (data.refresh_token) await saveCalendarRefreshToken(uid, data.refresh_token, accountEmail);
                    setCalendarAccounts(await getCalendarAccounts(uid));
                }
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            showToast(t("settings.integrations.oauthError", { error: msg }), "error");
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
            showToast(t("settings.account.pictureUpdated"), "success");
        } catch (error) {
            console.error("Fehler beim Upload:", error);
            showToast(t("settings.account.pictureFailed"), "error");
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
            setSavedDisplayName(displayName);
            showToast(t("settings.account.saved"), "success");
        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            showToast(t("settings.account.saveFailed"), "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConnectProvider = async (integrationId: string) => {
        if (!user?.uid) { showToast(t("settings.integrations.pleaseLogin"), "info"); return; }

        if (integrationId === "Gmail") {
            window.location.href = "/api/gmail/auth";
        } else if (integrationId === "Google Calendar") {
            window.location.href = "/api/calendar/auth";
        } else if (integrationId === "Google Drive") {
            if (driveConnected) {
                if (confirm(t("settings.integrations.disconnectConfirm", { service: "Google Drive" }))) {
                    await disconnectDrive(user.uid);
                    setDriveConnected(false);
                }
            } else {
                window.location.href = `/api/drive/auth?uid=${encodeURIComponent(user.uid)}`;
            }
        } else if (integrationId === "Slack") {
            if (slackConnected) {
                if (confirm(t("settings.integrations.disconnectConfirm", { service: "Slack" }))) {
                    await disconnectSlack(user.uid);
                    setSlackConnected(false);
                }
            } else {
                const idToken = await user.getIdToken(false);
                window.location.href = `/api/slack/connect?uid=${encodeURIComponent(user.uid)}&idToken=${encodeURIComponent(idToken)}`;
            }
        } else if (integrationId === "Outlook") {
            if (microsoftConnected) {
                if (confirm(t("settings.integrations.disconnectConfirm", { service: "Microsoft / Outlook" }))) {
                    await disconnectMicrosoft(user.uid);
                    setMicrosoftConnected(false);
                }
            } else {
                const idToken = await user.getIdToken(false);
                window.location.href = `/api/microsoft/connect?uid=${encodeURIComponent(user.uid)}&idToken=${encodeURIComponent(idToken)}&service=outlook`;
            }
        } else if (integrationId === "Microsoft Teams") {
            if (microsoftConnected) {
                if (confirm(t("settings.integrations.disconnectConfirm", { service: "Microsoft Teams" }))) {
                    await disconnectMicrosoft(user.uid);
                    setMicrosoftConnected(false);
                }
            } else {
                const idToken = await user.getIdToken(false);
                window.location.href = `/api/microsoft/connect?uid=${encodeURIComponent(user.uid)}&idToken=${encodeURIComponent(idToken)}&service=teams`;
            }
        } else {
            showToast(t("settings.integrations.notImplemented", { service: integrationId }), "info");
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
        localStorage.removeItem(`gcal_auth_error_${accEmail}`);
        localStorage.removeItem(`gcal_refresh_backoff_${accEmail}`);
        setCalendarAccounts(prev => prev.filter(a => a.email !== accEmail));
    };

    const integrations = [
        { id: "Slack", name: "Slack", domain: "slack.com", description: "Sende Benachrichtigungen in Kanäle und erstelle Projekte aus Nachrichten.", status: (slackConnected ? "connected" : "disconnected") as "connected" | "disconnected", email: null },
        { id: "Gmail", name: "Gmail", domain: "gmail.com", description: "Synchronisiere und verwalte deine E-Mails nahtlos in all deinen Projekten.", status: (gmailAccounts.length > 0 ? "connected" : "disconnected") as "connected" | "disconnected", email: null },
        { id: "Google Calendar", name: "Google Calendar", domain: "calendar.google.com", description: "Behalte deine Termine und Fristen stets im Blick mit der Kalender-Integration.", status: (calendarAccounts.length > 0 ? "connected" : "disconnected") as "connected" | "disconnected", email: null },
        { id: "Google Drive", name: "Google Drive", domain: "drive.google.com", description: "Greife auf deine Drive-Dateien zu und füge Dokumente direkt in Nachrichten ein.", status: (driveConnected ? "connected" : "disconnected") as "connected" | "disconnected", email: null },
        { id: "Outlook", name: "Microsoft Outlook", domain: "outlook.live.com", description: "Greife über Microsofts etablierten Dienst direkt auf deine Mails und Kontakte zu.", status: (microsoftConnected ? "connected" : "disconnected") as "connected" | "disconnected", email: null },
        { id: "Microsoft Teams", name: "Microsoft Teams", domain: "teams.microsoft.com", description: "Kommunikation auf Unternehmensebene nahtlos mit Projektaktivitäten verbunden.", status: (microsoftConnected ? "connected" : "disconnected") as "connected" | "disconnected", email: null },
        { id: "Proton Mail", name: "Proton Mail", domain: "proton.me", description: "Sichere Ende-zu-Ende verschlüsselte Kommunikation direkt aus Nexaro heraus.", status: "disconnected" as const, email: null },
        { id: "HubSpot", name: "HubSpot", domain: "hubspot.com", description: "Verwalte Marketing- und CRM-Daten, um das Wachstum deines Business voranzutreiben.", status: "disconnected" as const, email: null },
        { id: "Jira", name: "Jira", domain: "jira.atlassian.com", description: "Ticket-Erstellung und Issue-Tracking komplett integriert in deine Support-Flows.", status: "disconnected" as const, email: null },
        { id: "Linear", name: "Linear", domain: "linear.app", description: "Eine magische und reibungslose Methode, Software-Projekte, Issues und Features zu bearbeiten.", status: "disconnected" as const, email: null },
        { id: "Salesforce", name: "Salesforce", domain: "salesforce.com", description: "Globale CRM-Plattform für Vertrieb, Service, Marketing und mehr in einem.", status: "disconnected" as const, email: null },
    ];

    const NAV_ITEMS = [
        { id: "Konto", label: t("settings.nav.account"), icon: <User className="w-4 h-4" /> },
        { id: "Dienste", label: t("settings.nav.integrations"), icon: <LinkIcon className="w-4 h-4" /> },
        { id: "Zusammenfassungen", label: t("settings.nav.digest"), icon: <Mail className="w-4 h-4" /> },
        { id: "Sprache", label: t("settings.nav.language"), icon: <Globe className="w-4 h-4" /> },
        { id: "Abonnement", label: t("settings.nav.billing"), icon: <CreditCard className="w-4 h-4" /> },
        { id: "Sicherheit", label: t("settings.nav.security"), icon: <Shield className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen bg-[#F7F7F8] text-foreground flex flex-col">
            {/* Header */}
            <header className="h-14 border-b border-border flex items-center px-6 bg-white/90 backdrop-blur-xl shrink-0 sticky top-0 z-50 shadow-sm">
                <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => (window.location.href = "/dashboard")}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                                <SettingsIcon className="w-4 h-4" />
                            </div>
                            <h1 className="text-sm font-semibold text-foreground">{t("settings.title")}</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 overflow-visible px-6 py-8 lg:px-8">
                <div className="max-w-5xl mx-auto flex gap-8 items-start">

                    {/* Sidebar Nav */}
                    <aside className="w-52 shrink-0 sticky top-24 hidden lg:flex flex-col">
                        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                            <div className="px-2 py-2 space-y-0.5">
                                {NAV_ITEMS.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                            activeSection === item.id
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            <div className="px-2 py-2 border-t border-border">
                                <button
                                    onClick={async () => {
                                        try { await auth.signOut(); window.location.href = "/login"; }
                                        catch (error) { console.error("Logout error", error); }
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/8 rounded-xl transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    {t("settings.signOut")}
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-6 pb-16">
                        <div id="Konto">
                            <AccountSection
                                user={user}
                                isAuthLoading={isAuthLoading}
                                profilePic={profilePic}
                                displayName={displayName}
                                email={email}
                                isUploading={isUploading}
                                isSaving={isSaving}
                                isDirty={isAccountDirty}
                                onDisplayNameChange={setDisplayName}
                                onFileChange={handleFileChange}
                                onSave={handleSaveChanges}
                            />
                        </div>
                        <div id="Dienste">
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
                        <div id="Zusammenfassungen">
                            <DigestSection uid={user?.uid} userEmail={email} />
                        </div>
                        <div id="Sprache">
                            <LanguageSection />
                        </div>
                        <FeatureFlagsSection uid={user?.uid} />
                        <div id="Abonnement">
                            <BillingSection />
                        </div>
                        <div id="Sicherheit">
                            <SecuritySection />
                            <div className="mt-6">
                                <DataPurgeSection user={user} />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
