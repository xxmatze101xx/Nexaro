"use client";

import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";

export interface Toast {
    id: string;
    message: string;
    icon?: string;
}

interface ToastContextValue {
    toasts: Toast[];
    showToast: (message: string, icon?: string) => void;
    dismissToast: (id: string) => void;
}

let toastIdCounter = 0;

const noop = () => undefined;

const ToastContext = createContext<ToastContextValue>({
    toasts: [],
    showToast: noop,
    dismissToast: noop,
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, icon?: string) => {
        const id = String(++toastIdCounter);
        setToasts((prev) => [...prev, { id, message, icon }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const value = useMemo<ToastContextValue>(
        () => ({ toasts, showToast, dismissToast }),
        [toasts, showToast, dismissToast],
    );

    return createElement(ToastContext.Provider, { value }, children);
}

export function useToast(): ToastContextValue {
    return useContext(ToastContext);
}
