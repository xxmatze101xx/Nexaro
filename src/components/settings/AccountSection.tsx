"use client";

import { useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { User } from "firebase/auth";

interface AccountSectionProps {
    user: User | null;
    isAuthLoading: boolean;
    profilePic: string | null;
    displayName: string;
    email: string;
    isUploading: boolean;
    isSaving: boolean;
    onDisplayNameChange: (name: string) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
}

export function AccountSection({
    user,
    isAuthLoading,
    profilePic,
    displayName,
    email,
    isUploading,
    isSaving,
    onDisplayNameChange,
    onFileChange,
    onSave,
}: AccountSectionProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <section id="Konto" className="space-y-6 scroll-mt-28">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Accountdetails</h2>
                <p className="text-sm text-muted-foreground">Verwalte deine persönlichen Informationen und dein Profilbild.</p>
            </div>

            <div className="p-8 rounded-2xl border border-border bg-card shadow-sm space-y-8">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-md border border-primary/20 overflow-hidden relative">
                        {isAuthLoading ? (
                            <div className="w-full h-full bg-muted animate-pulse" />
                        ) : profilePic ? (
                            <Image src={profilePic} alt="Profile" fill className="object-cover" />
                        ) : (
                            user?.displayName?.charAt(0).toUpperCase() ?? "M"
                        )}
                    </div>
                    <div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={onFileChange}
                            accept="image/png, image/jpeg, image/gif"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="px-4 py-2 bg-muted hover:bg-muted/70 text-foreground rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50"
                        >
                            {isUploading ? "Wird hochgeladen..." : "Profilbild ändern"}
                        </button>
                        <p className="text-xs text-muted-foreground mt-2">Max. 2MB. JPG, PNG, oder GIF.</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Vollständiger Name</label>
                        {isAuthLoading ? (
                            <div className="w-full h-10 bg-muted animate-pulse rounded-xl border border-border" />
                        ) : (
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => onDisplayNameChange(e.target.value)}
                                placeholder="Dein Name"
                                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                            />
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">E-Mail Adresse</label>
                        {isAuthLoading ? (
                            <div className="w-full h-10 bg-muted animate-pulse rounded-xl border border-border" />
                        ) : (
                            <input
                                type="email"
                                value={email}
                                disabled
                                placeholder="Deine E-Mail"
                                className="w-full bg-muted border border-border text-muted-foreground rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
                            />
                        )}
                        <p className="text-xs text-muted-foreground">Die E-Mail-Adresse kann nicht geändert werden.</p>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className={cn(
                            "px-6 py-2.5 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-sm font-medium",
                            "shadow-md shadow-foreground/10 transition-all duration-300 hover:-translate-y-0.5",
                            "disabled:opacity-50 disabled:hover:translate-y-0"
                        )}
                    >
                        {isSaving ? "Wird gespeichert..." : "Änderungen speichern"}
                    </button>
                </div>
            </div>
        </section>
    );
}
