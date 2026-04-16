"use client";

import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/toast";

export function Toaster() {
    const { toasts, dismissToast } = useToast();
    return <ToastContainer toasts={toasts} onDismiss={dismissToast} />;
}
