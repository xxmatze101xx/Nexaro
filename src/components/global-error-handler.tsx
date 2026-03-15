"use client";

import { useEffect } from "react";
import { clientLogger } from "@/lib/client-logger";

export function GlobalErrorHandler() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      clientLogger.error("global-error", event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error instanceof Error ? event.error.stack?.slice(0, 500) : undefined,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason);
      clientLogger.error("unhandled-rejection", message, {
        stack: event.reason instanceof Error ? event.reason.stack?.slice(0, 500) : undefined,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
