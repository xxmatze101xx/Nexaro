"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
    type Locale,
    type TranslationKey,
    detectBrowserLocale,
    isLocale,
    translate,
} from "@/lib/i18n/locales";
import { useAuth } from "@/contexts/AuthContext";
import { getUserLanguage, setUserLanguage } from "@/lib/user";

interface LanguageContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => Promise<void>;
    t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
    isReady: boolean;
}

const LOCAL_STORAGE_KEY = "nexaro-locale";

const noopAsync = async () => undefined;

const LanguageContext = createContext<LanguageContextValue>({
    locale: "en",
    setLocale: noopAsync,
    t: (key) => key,
    isReady: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [locale, setLocaleState] = useState<Locale>("en");
    const [isReady, setIsReady] = useState(false);

    // Initial guess from localStorage / browser before Firestore answers
    useEffect(() => {
        try {
            const cached = typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_STORAGE_KEY) : null;
            if (isLocale(cached)) {
                setLocaleState(cached);
                setIsReady(true);
                return;
            }
        } catch {/* ignore */}
        setLocaleState(detectBrowserLocale());
        setIsReady(true);
    }, []);

    // Once user is known, hydrate from Firestore
    useEffect(() => {
        if (!user?.uid) return;
        let cancelled = false;
        getUserLanguage(user.uid)
            .then((stored) => {
                if (cancelled || !stored) return;
                setLocaleState(stored);
                try { window.localStorage.setItem(LOCAL_STORAGE_KEY, stored); } catch {/* ignore */}
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [user?.uid]);

    const setLocale = useCallback(async (next: Locale) => {
        setLocaleState(next);
        try { window.localStorage.setItem(LOCAL_STORAGE_KEY, next); } catch {/* ignore */}
        if (user?.uid) {
            try { await setUserLanguage(user.uid, next); } catch {/* ignore */}
        }
        if (typeof document !== "undefined") {
            document.documentElement.lang = next;
        }
    }, [user?.uid]);

    useEffect(() => {
        if (typeof document !== "undefined") {
            document.documentElement.lang = locale;
        }
    }, [locale]);

    const value = useMemo<LanguageContextValue>(() => ({
        locale,
        setLocale,
        t: (key, vars) => translate(locale, key, vars),
        isReady,
    }), [locale, setLocale, isReady]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
    return useContext(LanguageContext);
}

export function useT() {
    return useLanguage().t;
}
