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
        <section id="Konto" className="space-y-4 scroll-mt-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Konto</p>

            {/* Avatar row */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-primary-hover flex items-center justify-center text-primary-foreground text-xl font-bold overflow-hidden relative shrink-0">
                    {isAuthLoading ? (
                        <div className="w-full h-full bg-muted animate-pulse" />
                    ) : profilePic ? (
                        <Image src={profilePic} alt="Profile" fill className="object-cover" />
                    ) : (
                        user?.displayName?.charAt(0).toUpperCase() ?? "M"
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                        {isAuthLoading ? "Lädt..." : displayName || "Kein Name"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
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
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-muted hover:bg-accent text-foreground transition-colors disabled:opacity-50"
                >
                    {isUploading ? "Hochladen..." : "Ändern"}
                </button>
            </div>

            {/* Fields */}
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                <div className="flex items-center gap-4 px-4 py-3 bg-card">
                    <label className="w-32 shrink-0 text-sm text-muted-foreground">Name</label>
                    {isAuthLoading ? (
                        <div className="flex-1 h-5 bg-muted animate-pulse rounded" />
                    ) : (
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => onDisplayNameChange(e.target.value)}
                            placeholder="Dein Name"
                            className="flex-1 text-sm text-foreground bg-transparent focus:outline-none placeholder:text-muted-foreground/50"
                        />
                    )}
                </div>
                <div className="flex items-center gap-4 px-4 py-3 bg-card">
                    <label className="w-32 shrink-0 text-sm text-muted-foreground">E-Mail</label>
                    {isAuthLoading ? (
                        <div className="flex-1 h-5 bg-muted animate-pulse rounded" />
                    ) : (
                        <span className="flex-1 text-sm text-muted-foreground truncate">{email}</span>
                    )}
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-lg",
                        "bg-primary text-primary-foreground hover:bg-primary-hover",
                        "transition-colors disabled:opacity-50"
                    )}
                >
                    {isSaving ? "Speichern..." : "Änderungen speichern"}
                </button>
            </div>
        </section>
    );
}
