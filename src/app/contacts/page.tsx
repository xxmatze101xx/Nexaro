"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { AuthGuard } from "@/components/AuthGuard";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { type Message } from "@/lib/mock-data";
import {
    ChevronLeft,
    Users as UsersIcon,
    Search,
    Mail,
    Hash,
    Users,
    Calendar,
    Shield,
    MessageSquare
} from "lucide-react";

interface Contact {
    id: string; // The sender string
    name: string;
    email: string;
    initials: string;
    sources: Set<string>;
    messageCount: number;
}

const getSourceIcon = (source: string) => {
    switch (source) {
        case 'gmail':
        case 'outlook':
            return <Mail className="w-4 h-4 text-blue-500" />;
        case 'slack':
            return <Hash className="w-4 h-4 text-purple-600" />;
        case 'teams':
            return <Users className="w-4 h-4 text-indigo-500" />;
        case 'gcal':
            return <Calendar className="w-4 h-4 text-blue-400" />;
        case 'proton':
            return <Shield className="w-4 h-4 text-purple-700" />;
        default:
            return <MessageSquare className="w-4 h-4 text-slate-500" />;
    }
};

const getSourceName = (source: string) => {
    switch (source) {
        case 'gmail': return 'Gmail';
        case 'outlook': return 'Outlook';
        case 'slack': return 'Slack';
        case 'teams': return 'Teams';
        case 'gcal': return 'Calendar';
        case 'proton': return 'Proton';
        default: return source;
    }
};

export default function ContactsPage() {
    return (
        <AuthGuard>
            <ContactsContent />
        </AuthGuard>
    );
}

function ContactsContent() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        // We remove the limit or set it high to aggregate enough contacts
        const q = query(
            collection(db, "messages"),
            orderBy("timestamp", "desc"),
            limit(500)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map((doc) => doc.data() as Message);
            setMessages(fetchedMessages);
        });

        return () => unsubscribe();
    }, []);

    const contacts = useMemo(() => {
        const contactsMap = new Map<string, Contact>();

        messages.forEach((msg) => {
            const senderKey = msg.sender.toLowerCase();
            if (!contactsMap.has(senderKey)) {
                // Simple name/email parsing
                let name = msg.sender;
                let email = "";

                if (msg.sender.includes("<") && msg.sender.includes(">")) {
                    const parts = msg.sender.split("<");
                    name = parts[0].trim();
                    email = parts[1].replace(">", "").trim();
                } else if (msg.sender.includes("@")) {
                    email = msg.sender;
                    name = email.split("@")[0].replace(/[._]/g, " ");
                    // Capitalize first letters
                    name = name.replace(/\\b\\w/g, l => l.toUpperCase());
                }

                const words = name.split(" ").filter(Boolean);
                let initials = "?";
                if (words.length > 1) {
                    initials = (words[0][0] + words[words.length - 1][0]).toUpperCase();
                } else if (words.length === 1 && name.length > 0) {
                    initials = name.substring(0, 2).toUpperCase();
                }

                // Remove special characters from initials
                initials = initials.replace(/[^a-zA-Z]/g, "").substring(0, 2);
                if (!initials) initials = "?";

                contactsMap.set(senderKey, {
                    id: senderKey,
                    name: name,
                    email: email,
                    initials: initials,
                    sources: new Set([msg.source]),
                    messageCount: 1,
                });
            } else {
                const existing = contactsMap.get(senderKey)!;
                existing.sources.add(msg.source);
                existing.messageCount += 1;
            }
        });

        return Array.from(contactsMap.values()).sort((a, b) => b.messageCount - a.messageCount);
    }, [messages]);

    const filteredContacts = contacts.filter(contact => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return contact.name.toLowerCase().includes(q) || contact.email.toLowerCase().includes(q);
    });

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 flex items-center px-6 bg-white/80 backdrop-blur-xl shrink-0 sticky top-0 z-50">
                <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 group"
                        >
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                <UsersIcon className="w-5 h-5" />
                            </div>
                            <h1 className="text-xl font-semibold tracking-tight">Kontakte</h1>
                        </div>
                    </div>
                    <div className="relative w-64 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Kontakte durchsuchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all duration-300"
                        />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-visible p-6 lg:p-10">
                <div className="max-w-6xl mx-auto">
                    {filteredContacts.length === 0 ? (
                        <div className="text-center py-20 px-4 mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UsersIcon className="w-8 h-8 text-slate-400" />
                            </div>
                            <h2 className="text-lg font-medium text-slate-900">Keine Kontakte gefunden</h2>
                            <p className="text-slate-500 mt-1 max-w-md mx-auto">
                                Es wurden keine Personen in deinen Nachrichten gefunden, {searchQuery ? "die deiner Suche entsprechen." : "die kürzlich kontaktiert wurden."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredContacts.map(contact => (
                                <div key={contact.id} className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 flex flex-col">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-md border border-blue-500/20 group-hover:scale-105 transition-transform duration-300 shrink-0">
                                            {contact.initials}
                                        </div>
                                    </div>

                                    <div className="mb-6 flex-1">
                                        <h3 className="text-lg font-semibold text-slate-900 truncate" title={contact.name}>{contact.name}</h3>
                                        {contact.email && (
                                            <p className="text-sm text-slate-500 truncate mt-0.5" title={contact.email}>{contact.email}</p>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Erreichbar über</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(contact.sources).map(source => (
                                                <div key={source} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors cursor-default" title={getSourceName(source)}>
                                                    {getSourceIcon(source)}
                                                    <span className="capitalize">{getSourceName(source)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
