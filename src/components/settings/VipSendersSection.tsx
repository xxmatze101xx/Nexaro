"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Star, Loader2, X, Plus } from "lucide-react";
import { auth } from "@/lib/firebase";

interface VipSendersSectionProps {
    uid: string | undefined;
}

export function VipSendersSection({ uid }: VipSendersSectionProps) {
    const [emails, setEmails] = useState<string[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!uid) return;
        setIsLoading(true);
        auth.currentUser?.getIdToken().then(async (idToken) => {
            try {
                const res = await fetch("/api/user/vip", {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                if (res.ok) {
                    const data = (await res.json()) as { emails: string[] };
                    setEmails(data.emails);
                }
            } catch {
                // ignore
            } finally {
                setIsLoading(false);
            }
        });
    }, [uid]);

    const handleAdd = async () => {
        const email = input.trim().toLowerCase();
        if (!email || !email.includes("@")) {
            setError("Bitte eine gültige E-Mail-Adresse eingeben.");
            return;
        }
        if (emails.includes(email)) {
            setError("Diese Adresse ist bereits in der VIP-Liste.");
            return;
        }
        setError(null);
        setIsAdding(true);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/user/vip", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                const data = (await res.json()) as { emails: string[] };
                setEmails(data.emails);
                setInput("");
            } else {
                setError("Fehler beim Hinzufügen.");
            }
        } catch {
            setError("Netzwerkfehler.");
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemove = async (email: string) => {
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/user/vip", {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                const data = (await res.json()) as { emails: string[] };
                setEmails(data.emails);
            }
        } catch {
            // ignore
        }
    };

    return (
        <section id="VIP" className="space-y-4 scroll-mt-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">VIP-Absender</p>

            {/* Add input */}
            <div className="flex gap-2">
                <input
                    type="email"
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                    placeholder="chef@company.com"
                    className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                <button
                    onClick={handleAdd}
                    disabled={isAdding || !input.trim()}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        "bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                    )}
                >
                    {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Hinzufügen
                </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* VIP list */}
            {isLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Lädt...
                </div>
            ) : emails.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Noch keine VIP-Absender hinzugefügt.</p>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                    {emails.map((email) => (
                        <div key={email} className="flex items-center gap-3 px-4 py-2.5 bg-card">
                            <Star className="w-3.5 h-3.5 text-warning shrink-0" />
                            <span className="flex-1 text-sm text-foreground truncate">{email}</span>
                            <button
                                onClick={() => handleRemove(email)}
                                className="shrink-0 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                aria-label={`${email} entfernen`}
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                VIP-Absender erhalten +3 Punkte beim Scoring. Die Liste wird nie an externe KI-Dienste weitergegeben.
            </p>
        </section>
    );
}
