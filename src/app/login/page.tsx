"use client";

import { useState } from "react";
import { LogIn, UserPlus, Mail, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
} from "firebase/auth";
import { createUserProfileDoc } from "@/lib/user";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                // Login
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                // Ensure doc exists just in case
                await createUserProfileDoc(userCredential.user.uid, {
                    email: userCredential.user.email || "",
                    displayName: userCredential.user.displayName || name,
                });
            } else {
                // Register
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Create user profile in Firestore
                await createUserProfileDoc(userCredential.user.uid, {
                    email: userCredential.user.email || "",
                    displayName: name,
                });
            }
            window.location.href = "/dashboard";
        } catch (err: unknown) {
            console.error(err);
            const code = (err as { code?: string }).code;
            const message = (err as { message?: string }).message;
            if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
                setError("E-Mail oder Passwort falsch.");
            } else if (code === "auth/email-already-in-use") {
                setError("Diese E-Mail wird bereits verwendet.");
            } else if (code === "auth/weak-password") {
                setError("Das Passwort ist zu schwach (mindestens 6 Zeichen).");
            } else {
                setError(message ?? "Ein Fehler ist aufgetreten.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);
            // Create user profile in Firestore
            await createUserProfileDoc(userCredential.user.uid, {
                email: userCredential.user.email || "",
                displayName: userCredential.user.displayName || "",
                photoURL: userCredential.user.photoURL || "",
            });
            window.location.href = "/dashboard";
        } catch (err: unknown) {
            console.error(err);
            setError((err as { message?: string }).message ?? "Google Login fehlgeschlagen.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo and Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="mb-4">
                        <Image src="/logo.png" alt="Nexaro Logo" width={80} height={80} className="object-contain drop-shadow-md" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground font-[Inter]">
                        {isLogin ? "Willkommen bei Nexaro" : "Account erstellen"}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        {isLogin ? "Melde dich bei deiner Unified Inbox an" : "Registriere dich für Nexaro"}
                    </p>
                </div>

                {/* Login/Register Card */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <form onSubmit={handleAuth} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                                {error}
                            </div>
                        )}

                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Name</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        required={!isLogin}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Max Mustermann"
                                        className={cn(
                                            "w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm",
                                            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                                            "transition-all"
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">E-Mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="du@firma.de"
                                    className={cn(
                                        "w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm",
                                        "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                                        "transition-all"
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground">Passwort</label>
                                {isLogin && (
                                    <a href="#" className="text-xs text-primary hover:text-primary-hover font-medium">
                                        Passwort vergessen?
                                    </a>
                                )}
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={6}
                                className={cn(
                                    "w-full rounded-lg border border-input bg-background px-4 py-2 text-sm",
                                    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                                    "transition-all"
                                )}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all mt-6",
                                "bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98]",
                                "disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                            )}
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            ) : isLogin ? (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    Anmelden
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    Registrieren
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-card px-2 text-muted-foreground uppercase tracking-wider font-medium">Oder weiter mit</span>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-2 text-sm font-medium transition-all",
                                    "hover:bg-muted active:scale-[0.98] text-foreground"
                                )}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Google
                            </button>
                        </div>
                    </div>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-8">
                    {isLogin ? "Noch keinen Account?" : "Bereits einen Account?"}{" "}
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                        }}
                        className="font-medium text-primary hover:text-primary-hover"
                    >
                        {isLogin ? "Registrieren" : "Jetzt anmelden"}
                    </button>
                </p>
            </div>
        </div>
    );
}
