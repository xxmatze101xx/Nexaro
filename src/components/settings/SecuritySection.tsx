"use client";

import { useMemo, useState } from "react";
import { Loader2, Shield, KeyRound, Smartphone, LogOut } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/useToast";
import { RichButton } from "@/components/ui/rich-button";

export function SecuritySection() {
    const { user } = useAuth();
    const { t, locale } = useLanguage();
    const { showToast } = useToast();

    const [isOpen, setIsOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lastSignIn = useMemo(() => {
        const ts = user?.metadata?.lastSignInTime;
        if (!ts) return null;
        try {
            return new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
            }).format(new Date(ts));
        } catch {
            return new Date(ts).toLocaleString();
        }
    }, [user?.metadata?.lastSignInTime, locale]);

    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

    const reset = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.email) return;

        if (newPassword.length < 8) {
            setError(t("settings.security.weakPassword"));
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t("settings.security.mismatch"));
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            showToast(t("settings.security.passwordChanged"), "success");
            reset();
            setIsOpen(false);
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? "";
            if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
                setError(t("settings.security.wrongPassword"));
            } else if (code === "auth/weak-password") {
                setError(t("settings.security.weakPassword"));
            } else if (code === "auth/requires-recent-login") {
                setError(t("settings.security.requiresRecentLogin"));
            } else {
                setError(err instanceof Error ? err.message : String(err));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await auth.signOut();
            window.location.href = "/login";
        } catch (err) {
            showToast(err instanceof Error ? err.message : String(err), "error");
        }
    };

    return (
        <section id="Sicherheit" className="space-y-4 scroll-mt-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                {t("settings.security.title")}
            </p>

            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                {/* Password */}
                <div className="px-4 py-3 bg-card">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {t("settings.security.password")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t("settings.security.passwordHint")}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setIsOpen((v) => !v); reset(); }}
                            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-muted hover:bg-accent text-foreground transition-colors"
                        >
                            {isOpen ? t("common.cancel") : t("settings.security.changePassword")}
                        </button>
                    </div>

                    {isOpen && (
                        <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-border space-y-3">
                            <div>
                                <label className="block text-xs text-muted-foreground mb-1">
                                    {t("settings.security.currentPassword")}
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">
                                        {t("settings.security.newPassword")}
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                        className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">
                                        {t("settings.security.confirmPassword")}
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                        className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                                    />
                                </div>
                            </div>
                            {error && <p className="text-xs text-destructive">{error}</p>}
                            <div className="flex justify-end">
                                <RichButton
                                    color="purple"
                                    size="sm"
                                    type="submit"
                                    disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
                                >
                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                    {isSubmitting ? t("settings.security.updating") : t("settings.security.update")}
                                </RichButton>
                            </div>
                        </form>
                    )}
                </div>

                {/* Current session */}
                <div className="px-4 py-3 bg-card">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <Smartphone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                    {t("settings.security.session")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate" title={userAgent}>
                                    {userAgent || "—"}
                                </p>
                                {lastSignIn && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {t("settings.security.lastSignIn")}: {lastSignIn}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                            <LogOut className="w-3 h-3" />
                            {t("settings.security.signOutAllDevices")}
                        </button>
                    </div>
                </div>

                {/* 2FA placeholder */}
                <div className="px-4 py-3 bg-card opacity-80">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {t("settings.security.twoFactor")}
                                    </p>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                        {t("common.comingSoon")}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t("settings.security.twoFactorHint")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
