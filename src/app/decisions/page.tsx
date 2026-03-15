"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { CheckCircle2, Clock, ArrowLeft, Inbox } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DecisionRecord {
    id: string;
    messageId: string;
    messageSubject: string;
    messageSender: string;
    decisions: string[];
    detectedAt: string;
}

export default function DecisionsPage() {
    return (
        <AuthGuard>
            <DecisionsContent />
        </AuthGuard>
    );
}

function DecisionsContent() {
    const { user } = useAuth();
    const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("nexaro-dark-mode");
        if (stored === "true") {
            setDarkMode(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "users", user.uid, "decisions"),
            orderBy("detectedAt", "desc"),
            limit(50),
        );

        const unsubscribe = onSnapshot(q, snapshot => {
            const records = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as Omit<DecisionRecord, "id">),
            }));
            setDecisions(records);
            setIsLoading(false);
        }, () => {
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const formatDate = (iso: string) => {
        try {
            return new Intl.DateTimeFormat("de-DE", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date(iso));
        } catch {
            return iso;
        }
    };

    return (
        <div className={cn("min-h-screen bg-background text-foreground", darkMode && "dark")}>
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Inbox
                    </Link>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold">Decision Dashboard</h1>
                        <p className="text-sm text-muted-foreground">
                            Decisions and commitments detected in your messages
                        </p>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                        <p className="text-sm text-muted-foreground">Loading decisions...</p>
                    </div>
                ) : decisions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Inbox className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-sm font-medium text-foreground">No decisions detected yet</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                            Decisions and commitments in your messages will appear here once the AI has analyzed them.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {decisions.map(record => (
                            <DecisionCard key={record.id} record={record} formatDate={formatDate} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function DecisionCard({
    record,
    formatDate,
}: {
    record: DecisionRecord;
    formatDate: (iso: string) => string;
}) {
    return (
        <div className="border border-border rounded-lg p-4 bg-card hover:bg-accent/30 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                        {record.messageSubject}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        From {record.messageSender}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    {formatDate(record.detectedAt)}
                </div>
            </div>

            <ul className="space-y-1.5">
                {record.decisions.map((decision, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary/70 shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{decision}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
