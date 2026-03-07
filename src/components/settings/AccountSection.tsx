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
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Accountdetails</h2>
                <p className="text-sm text-slate-500">Verwalte deine persönlichen Informationen und dein Profilbild.</p>
            </div>

            <div className="p-8 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-8">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md border border-blue-500/20 overflow-hidden relative">
                        {isAuthLoading ? (
                            <div className="w-full h-full bg-slate-200 animate-pulse" />
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
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50"
                        >
                            {isUploading ? "Wird hochgeladen..." : "Profilbild ändern"}
                        </button>
                        <p className="text-xs text-slate-500 mt-2">Max. 2MB. JPG, PNG, oder GIF.</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Vollständiger Name</label>
                        {isAuthLoading ? (
                            <div className="w-full h-10 bg-slate-200 animate-pulse rounded-xl border border-slate-300" />
                        ) : (
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => onDisplayNameChange(e.target.value)}
                                placeholder="Dein Name"
                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300"
                            />
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">E-Mail Adresse</label>
                        {isAuthLoading ? (
                            <div className="w-full h-10 bg-slate-200 animate-pulse rounded-xl border border-slate-200" />
                        ) : (
                            <input
                                type="email"
                                value={email}
                                disabled
                                placeholder="Deine E-Mail"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
                            />
                        )}
                        <p className="text-xs text-slate-500">Die E-Mail-Adresse kann nicht geändert werden.</p>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className={cn(
                            "px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm font-medium",
                            "shadow-md shadow-slate-900/10 transition-all duration-300 hover:-translate-y-0.5",
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
