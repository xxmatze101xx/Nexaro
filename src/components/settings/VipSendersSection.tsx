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
        <section id="VIP" className="scroll-mt-28">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Star className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">VIP-Absender</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Nachrichten von diesen Absendern erhalten automatisch einen hohen Wichtigkeitswert.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                {/* Add input */}
                <div>
                    <p className="text-sm font-semibold text-slate-800 mb-2">Absender hinzufügen</p>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            value={input}
                            onChange={(e) => { setInput(e.target.value); setError(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                            placeholder="chef@company.com"
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={isAdding || !input.trim()}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                                "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                            )}
                        >
                            {isAdding
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Plus className="w-4 h-4" />
                            }
                            Hinzufügen
                        </button>
                    </div>
                    {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
                </div>

                {/* VIP list */}
                <div>
                    <p className="text-sm font-semibold text-slate-800 mb-2">
                        VIP-Liste
                        {emails.length > 0 && (
                            <span className="ml-2 text-xs font-normal text-slate-400">{emails.length} Absender</span>
                        )}
                    </p>

                    {isLoading ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Lädt...
                        </div>
                    ) : emails.length === 0 ? (
                        <p className="text-sm text-slate-400 py-3">
                            Noch keine VIP-Absender. Füge wichtige Kontakte hinzu.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {emails.map((email) => (
                                <li
                                    key={email}
                                    className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-50 rounded-xl"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        <span className="text-sm text-slate-700 truncate">{email}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(email)}
                                        className="shrink-0 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        aria-label={`${email} entfernen`}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
                    VIP-Absender erhalten einen Bonus von +3 Punkten beim Scoring. Die Liste wird nie an externe KI-Dienste weitergegeben.
                </p>
            </div>
        </section>
    );
}
